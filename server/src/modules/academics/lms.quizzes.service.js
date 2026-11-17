
import { LmsCourse, LmsQuiz, LmsQuizAttempt, Student } from '../../models/index.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

import { familyUserIds } from '../attendance/studentLeave.service.js';
import { notifyUsers } from '../push/push.service.js';

import { notifyCourseStudents, mayManage, isEnrolled, quizMaxScore } from './lms.shared.js';

const cleanQuestions = (input) => {
  if (!Array.isArray(input) || !input.length || input.length > 50)
    throw badRequest('A quiz needs 1 to 50 questions');
  const rows = input.map((q, i) => {
    const prompt = String(q.prompt ?? '').trim();
    const type = q.type || 'single_choice';
    const choices = Array.isArray(q.choices) ? q.choices.map((x) => String(x).trim()) : [];
    const points = Number(q.points ?? 1);
    if (
      !prompt ||
      prompt.length > 500 ||
      !['single_choice', 'multiple_choice', 'true_false', 'short_answer'].includes(type)
    )
      throw badRequest(`Question ${i + 1} needs a prompt and supported question type`);
    if (!Number.isFinite(points) || points <= 0 || points > 1000 || Math.round(points * 100) !== points * 100)
      throw badRequest(`Question ${i + 1} points must be between 0.01 and 1000`);
    if (type === 'short_answer')
      return {
        id: String(q.id || `q${i + 1}`),
        type,
        prompt,
        points,
        choices: [],
        expectedAnswer: String(q.expectedAnswer ?? '')
          .trim()
          .slice(0, 500),
      };
    if (type === 'true_false') {
      const correctIndex = Number(q.correctIndex);
      if (![0, 1].includes(correctIndex))
        throw badRequest(`Question ${i + 1} needs a true or false correct answer`);
      return {
        id: String(q.id || `q${i + 1}`),
        type,
        prompt,
        points,
        choices: ['True', 'False'],
        correctIndex,
      };
    }
    if (choices.length < 2 || choices.length > 6 || choices.some((x) => !x || x.length > 200))
      throw badRequest(`Question ${i + 1} needs 2–6 non-empty choices`);
    if (type === 'multiple_choice') {
      const correctIndexes = Array.isArray(q.correctIndexes)
        ? [...new Set(q.correctIndexes.map(Number))].sort((a, b) => a - b)
        : [];
      if (
        !correctIndexes.length ||
        correctIndexes.some((index) => !Number.isInteger(index) || index < 0 || index >= choices.length)
      )
        throw badRequest(`Question ${i + 1} needs at least one correct choice`);
      return { id: String(q.id || `q${i + 1}`), type, prompt, points, choices, correctIndexes };
    }
    const correctIndex = Number(q.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length)
      throw badRequest(`Question ${i + 1} needs a valid correct choice`);
    return { id: String(q.id || `q${i + 1}`), type, prompt, points, choices, correctIndex };
  });
  if (new Set(rows.map((q) => q.id)).size !== rows.length)
    throw badRequest('Question identifiers must be unique');
  return rows;
};

export async function saveQuiz(courseId, body, user, id = null) {
  const course = await LmsCourse.findByPk(courseId);
  if (!course) throw notFound('Course not found');
  if (!(await mayManage(course, user))) throw forbidden('You cannot manage this course');
  const title = String(body.title ?? '').trim();
  if (!title) throw badRequest('Quiz title is required');
  const maxAttempts = Number(body.maxAttempts ?? 3);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10)
    throw badRequest('Attempts must be between 1 and 10');
  const dueOn = body.dueOn || null;
  if (
    dueOn &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) ||
      Number.isNaN(Date.parse(`${dueOn}T00:00:00Z`)) ||
      new Date(`${dueOn}T00:00:00Z`).toISOString().slice(0, 10) !== dueOn)
  )
    throw badRequest('Due date must be a valid date');
  const values = {
    title: title.slice(0, 160),
    description: String(body.description ?? '').slice(0, 1000) || null,
    questions: cleanQuestions(body.questions),
    maxAttempts,
    dueOn,
    published: Boolean(body.published),
  };
  if (id) {
    const row = await LmsQuiz.findOne({ where: { id, courseId } });
    if (!row) throw notFound('Quiz not found');
    if (
      (await LmsQuizAttempt.count({ where: { quizId: id } })) &&
      JSON.stringify(values.questions) !== JSON.stringify(row.questions)
    )
      throw conflict('This quiz already has attempts; its questions cannot be changed');
    const wasPublished = row.published;
    await row.update(values);
    if (!wasPublished && row.published && course.published)
      await notifyCourseStudents(courseId, {
        title: 'New LMS quiz',
        body: `${row.title}${row.dueOn ? ` · due ${row.dueOn}` : ''}`,
        url: '/portal?tab=LMS',
      });
    return row.id;
  }
  const row = await LmsQuiz.create({ courseId, ...values });
  if (row.published && course.published)
    await notifyCourseStudents(courseId, {
      title: 'New LMS quiz',
      body: `${row.title}${row.dueOn ? ` · due ${row.dueOn}` : ''}`,
      url: '/portal?tab=LMS',
    });
  return row.id;
}

export async function listQuizzes(courseId, user) {
  const course = await LmsCourse.findByPk(courseId);
  if (!course) throw notFound('Course not found');
  if (!(await mayManage(course, user))) throw forbidden('You cannot manage this course');
  return Promise.all(
    (await LmsQuiz.findAll({ where: { courseId }, order: [['id', 'ASC']] })).map(async (q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      questions: q.questions,
      dueOn: q.dueOn,
      maxAttempts: q.maxAttempts,
      published: q.published,
      attemptCount: await LmsQuizAttempt.count({ where: { quizId: q.id } }),
    })),
  );
}

export async function deleteQuiz(courseId, id, user) {
  const course = await LmsCourse.findByPk(courseId);
  if (!course) throw notFound('Course not found');
  if (!(await mayManage(course, user))) throw forbidden('You cannot manage this course');
  const q = await LmsQuiz.findOne({ where: { id, courseId } });
  if (!q) throw notFound('Quiz not found');
  await q.destroy();
}

export async function takeQuiz(student, quizId, answers) {
  const quiz = await LmsQuiz.findOne({
    where: { id: quizId, published: true },
    include: [{ model: LmsCourse, where: { classId: student.classId, published: true } }],
  });
  if (!quiz) throw notFound('Quiz not found');
  if (!(await isEnrolled(student, quiz.courseId))) throw notFound('Quiz not found');
  if (quiz.dueOn && quiz.dueOn < today()) throw conflict('The due date for this test has passed');
  const prior = await LmsQuizAttempt.findAll({
    where: { quizId, studentId: student.id },
    order: [['attemptNo', 'DESC']],
  });
  if (prior.length >= quiz.maxAttempts) throw conflict('You have used all attempts for this quiz');
  const submitted = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  if (
    quiz.questions.some(
      (q) => submitted[q.id] === undefined || submitted[q.id] === null || submitted[q.id] === '',
    )
  )
    throw badRequest('Answer every question before submitting');
  let score = 0;
  let needsReview = false;
  const safeAnswers = {};
  for (const q of quiz.questions) {
    const raw = submitted[q.id];
    if (q.type === 'short_answer') {
      const answer = String(raw ?? '').trim();
      if (!answer || answer.length > 2000)
        throw badRequest('Write an answer of up to 2000 characters for every written question');
      safeAnswers[q.id] = answer;
      needsReview = true;
      continue;
    }
    if (q.type === 'multiple_choice') {
      const answer = Array.isArray(raw) ? [...new Set(raw.map(Number))].sort((a, b) => a - b) : [];
      if (
        !answer.length ||
        answer.some((index) => !Number.isInteger(index) || index < 0 || index >= q.choices.length)
      )
        throw badRequest('Choose one or more available answers for every question');
      safeAnswers[q.id] = answer;
      if (JSON.stringify(answer) === JSON.stringify(q.correctIndexes)) score += Number(q.points);
      continue;
    }
    const answer = q.type === 'true_false' && typeof raw === 'boolean' ? (raw ? 0 : 1) : Number(raw);
    if (!Number.isInteger(answer) || answer < 0 || answer >= q.choices.length)
      throw badRequest('Choose one available answer for every question');
    safeAnswers[q.id] = answer;
    if (answer === q.correctIndex) score += Number(q.points);
  }
  const attemptNo = prior.length + 1;
  const maxScore = quizMaxScore(quiz);
  const attempt = await LmsQuizAttempt.create({
    quizId,
    studentId: student.id,
    attemptNo,
    answers: safeAnswers,
    score,
    maxScore,
    reviewStatus: needsReview ? 'pending_review' : 'reviewed',
    completedAt: new Date(),
  });
  return { attemptNo, score, maxScore, reviewStatus: attempt.reviewStatus, completedAt: attempt.completedAt };
}

export async function listQuizAttempts(courseId, quizId, user) {
  const course = await LmsCourse.findByPk(courseId);
  if (!course) throw notFound('Course not found');
  if (!(await mayManage(course, user))) throw forbidden('You cannot review this course');
  const quiz = await LmsQuiz.findOne({ where: { id: quizId, courseId } });
  if (!quiz) throw notFound('Quiz not found');
  const rows = await LmsQuizAttempt.findAll({
    where: { quizId },
    include: [{ model: Student, attributes: ['id', 'firstName', 'lastName', 'admissionNo'] }],
    order: [['completedAt', 'DESC']],
  });
  return rows.map((attempt) => ({
    id: attempt.id,
    studentId: attempt.studentId,
    studentName: `${attempt.Student.firstName} ${attempt.Student.lastName}`,
    admissionNo: attempt.Student.admissionNo,
    completedAt: attempt.completedAt,
    score: Number(attempt.score),
    maxScore: Number(attempt.maxScore),
    reviewStatus: attempt.reviewStatus,
    feedback: attempt.feedback,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      type: q.type || 'single_choice',
      prompt: q.prompt,
      points: Number(q.points ?? 1),
      answer: attempt.answers[q.id],
      choices: q.choices,
      correctIndex: q.type === 'short_answer' ? undefined : q.correctIndex,
      correctIndexes: q.type === 'multiple_choice' ? q.correctIndexes : undefined,
      awarded: Number(
        attempt.questionScores?.[q.id] ??
          (q.type === 'short_answer'
            ? 0
            : JSON.stringify(attempt.answers[q.id]) ===
                JSON.stringify(q.type === 'multiple_choice' ? q.correctIndexes : q.correctIndex)
              ? (q.points ?? 1)
              : 0),
      ),
    })),
  }));
}

export async function reviewQuizAttempt(courseId, quizId, attemptId, body, user) {
  const course = await LmsCourse.findByPk(courseId);
  if (!course) throw notFound('Course not found');
  if (!(await mayManage(course, user))) throw forbidden('You cannot review this course');
  const [quiz, attempt] = await Promise.all([
    LmsQuiz.findOne({ where: { id: quizId, courseId } }),
    LmsQuizAttempt.findOne({ where: { id: attemptId, quizId } }),
  ]);
  if (!quiz || !attempt) throw notFound('Quiz attempt not found');
  const scores =
    body.questionScores && typeof body.questionScores === 'object' && !Array.isArray(body.questionScores)
      ? body.questionScores
      : {};
  let total = 0;
  const cleanScores = {};
  for (const q of quiz.questions) {
    const automatic =
      q.type === 'short_answer'
        ? 0
        : JSON.stringify(attempt.answers[q.id]) ===
            JSON.stringify(q.type === 'multiple_choice' ? q.correctIndexes : q.correctIndex)
          ? Number(q.points ?? 1)
          : 0;
    const awarded = q.type === 'short_answer' ? Number(scores[q.id] ?? 0) : automatic;
    if (!Number.isFinite(awarded) || awarded < 0 || awarded > Number(q.points ?? 1))
      throw badRequest(`Score for “${q.prompt}” must be between 0 and ${q.points ?? 1}`);
    cleanScores[q.id] = awarded;
    total += awarded;
  }
  await attempt.update({
    score: total,
    questionScores: cleanScores,
    feedback:
      String(body.feedback ?? '')
        .trim()
        .slice(0, 1000) || null,
    reviewStatus: 'reviewed',
  });
  await notifyUsers(await familyUserIds(attempt.studentId), {
    title: 'LMS quiz reviewed',
    body: `${quiz.title}: ${total}/${attempt.maxScore}${attempt.feedback ? ` · ${attempt.feedback.slice(0, 160)}` : ''}`,
    url: '/portal?tab=LMS',
  });
  return { ok: true, score: total, maxScore: Number(attempt.maxScore) };
}

