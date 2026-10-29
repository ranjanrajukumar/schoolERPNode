import {
  Attendance,
  ClassSubject,
  Exam,
  Mark,
  SchoolClass,
  Staff,
  Student,
  Subject,
  User,
  sequelize,
} from '../../models/index.js';
import { electiveFacts, splitOf } from '../academics/subjectMap.service.js';
import { badRequest, forbidden, notFound } from '../../utils/httpError.js';
import { loadGrading } from './grading.js';

export const EXAM_FIELDS = ['name', 'classId', 'startDate', 'endDate', 'maxMarks'];

const round = (n) => Math.round(n * 100) / 100;

export async function listExams() {
  const rows = await Exam.findAll({
    include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
    order: [['id', 'DESC']],
  });
  return rows.map((e) => ({
    ...e.toJSON(),
    SchoolClass: undefined,
    className: `${e.SchoolClass.name}-${e.SchoolClass.section}`,
  }));
}

async function loadExam(id) {
  const exam = await Exam.findByPk(id);
  if (!exam) throw notFound('Exam not found');
  return exam;
}

/** The subjects taught in the exam's class, in a stable order. */
async function examSubjects(exam) {
  const rows = await ClassSubject.findAll({
    where: { classId: exam.classId },
    include: [{ model: Subject, attributes: ['id', 'name', 'code'] }],
    order: [['subjectId', 'ASC']],
  });
  return rows.map((r) => ({
    id: r.Subject.id,
    name: r.Subject.name,
    code: r.Subject.code,
    component: r.component,
    isElective: r.isElective,
    practicalShare: r.practicalShare,
  }));
}

/**
 * Which of the exam's subjects this user may enter marks for. Admins: all of them (null). A teacher: only the
 * subjects assigned to them in Class subjects, found through the staff record that has the same email as their
 * login. A teacher whose login matches no staff record gets none.
 */
async function editableSubjectIds(user, exam) {
  if (user.role === 'admin') return null;
  const login = await User.findByPk(user.id, { attributes: ['email'] });
  const staff = await Staff.findAll({
    where: { email: login?.email ?? '', status: 'active' },
    attributes: ['id'],
  });
  if (!staff.length) return new Set();
  const mine = await ClassSubject.findAll({
    where: { classId: exam.classId, staffId: staff.map((s) => s.id) },
    attributes: ['subjectId'],
  });
  return new Set(mine.map((m) => m.subjectId));
}

/** The mark-entry grid: every active student of the class against every subject of the class. */
export async function getMarkSheet(examId, user) {
  const exam = await loadExam(examId);
  const facts = await electiveFacts(exam.classId);
  const [subjects, students, marks, editable] = await Promise.all([
    examSubjects(exam),
    Student.findAll({ where: { classId: exam.classId, status: 'active' }, order: [['firstName', 'ASC']] }),
    Mark.findAll({ where: { examId } }),
    editableSubjectIds(user, exam),
  ]);
  const byStudent = new Map();
  const partsByStudent = new Map();
  marks.forEach((m) => {
    if (!byStudent.has(m.studentId)) byStudent.set(m.studentId, {});
    byStudent.get(m.studentId)[m.subjectId] = m.marks;
    if (m.practicalMarks !== null && m.practicalMarks !== undefined) {
      if (!partsByStudent.has(m.studentId)) partsByStudent.set(m.studentId, {});
      partsByStudent.get(m.studentId)[m.subjectId] = {
        theory: Number(m.marks) - Number(m.practicalMarks),
        practical: Number(m.practicalMarks),
      };
    }
  });
  return {
    exam,
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      component: s.component,
      elective: s.isElective,
      split: splitOf(s.component, s.practicalShare, exam.maxMarks),
      editable: editable === null || editable.has(s.id),
    })),
    students: students.map((s) => ({
      studentId: s.id,
      admissionNo: s.admissionNo,
      name: `${s.firstName} ${s.lastName}`,
      marks: byStudent.get(s.id) ?? {},
      parts: partsByStudent.get(s.id) ?? {}, // theory and practical, for subjects marked in two parts
      // electives this student did not choose: no mark is expected or accepted
      skips: subjects.filter((sub) => !facts.takes(s.id, sub.id)).map((sub) => sub.id),
    })),
  };
}

/**
 * Saves marks atomically. A blank mark clears the entry; anything else must be a number
 * between 0 and the exam's maximum. The whole batch is rejected if any row is invalid.
 */
export async function saveMarks(examId, records = [], user) {
  const exam = await loadExam(examId);
  if (!Array.isArray(records)) throw badRequest('records must be a list');
  const editable = await editableSubjectIds(user, exam);
  if (editable && records.some((r) => !editable.has(Number(r.subjectId)))) {
    throw forbidden(
      editable.size
        ? 'You can only enter marks for the subjects assigned to you in this class'
        : 'You have no subjects assigned in this class. An admin must assign you in Class subjects, and your login email must match your staff profile email.',
    );
  }
  const [students, subjects] = await Promise.all([
    Student.findAll({ where: { classId: exam.classId }, attributes: ['id'] }),
    examSubjects(exam),
  ]);
  const inClass = new Set(students.map((s) => s.id));
  const taught = new Set(subjects.map((s) => s.id));
  const facts = await electiveFacts(exam.classId);
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const clean = [];
  for (const { studentId, subjectId, marks, theory, practical } of records) {
    if (!studentId || !subjectId) throw badRequest('Each mark needs a student and a subject');
    if (!inClass.has(Number(studentId))) throw badRequest('Every student must belong to the exam class');
    if (!taught.has(Number(subjectId))) throw badRequest('Every subject must be one the exam class studies');
    const isBlank = (v) => v === '' || v === null || v === undefined;
    const sub = subjectById.get(Number(subjectId));
    const split = sub ? splitOf(sub.component, sub.practicalShare, exam.maxMarks) : null;
    const twoParts = theory !== undefined || practical !== undefined;
    if (twoParts && !split)
      throw badRequest(
        `${subjectName.get(Number(subjectId))} is marked as one total: send marks, not theory and practical`,
      );
    let total;
    let practicalMarks = null;
    if (twoParts) {
      // theory + practical: each part is checked against its own maximum and the subject total is their sum
      const parts = [
        ['theory', theory, split.theory],
        ['practical', practical, split.practical],
      ];
      for (const [name, value, max] of parts) {
        if (isBlank(value)) continue;
        if (max === 0) throw badRequest(`${subjectName.get(Number(subjectId))} has no ${name} marks`);
        if (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > max)
          throw badRequest(
            `${subjectName.get(Number(subjectId))}: ${name} marks must be between 0 and ${max}`,
          );
      }
      const both = !isBlank(theory) && !isBlank(practical);
      const only =
        split.theory === 0 ? !isBlank(practical) : split.practical === 0 ? !isBlank(theory) : false;
      if (isBlank(theory) && isBlank(practical)) total = null;
      else if (both || only) {
        total = Number(theory || 0) + Number(practical || 0);
        practicalMarks = Number(practical || 0);
      } else
        throw badRequest(
          `${subjectName.get(Number(subjectId))}: enter both the theory and the practical mark, or leave both empty`,
        );
    } else {
      const blank = isBlank(marks);
      if (!blank && (Number.isNaN(Number(marks)) || Number(marks) < 0 || Number(marks) > exam.maxMarks))
        throw badRequest(`Marks must be between 0 and ${exam.maxMarks}`);
      total = blank ? null : Number(marks);
    }
    if (total !== null && !facts.takes(Number(studentId), Number(subjectId)))
      throw badRequest(
        `This student did not choose the elective ${subjectName.get(Number(subjectId))}, so no mark can be entered for it`,
      );
    clean.push({ studentId, subjectId, marks: total, practicalMarks });
  }

  await sequelize.transaction(async (transaction) => {
    for (const { studentId, subjectId, marks, practicalMarks } of clean) {
      if (marks === null) await Mark.destroy({ where: { examId, studentId, subjectId }, transaction });
      else await Mark.upsert({ examId, studentId, subjectId, marks, practicalMarks }, { transaction });
    }
  });
  return clean.length;
}

/** Totals, percentage, grade and rank for every student who has marks in the exam. */
export async function getResults(examId, grading = null) {
  const exam = await loadExam(examId);
  const policy = grading ?? (await loadGrading());
  const subjects = await examSubjects(exam);
  const facts = await electiveFacts(exam.classId);
  const students = await Student.findAll({
    where: { classId: exam.classId },
    include: [{ model: Mark, required: false, where: { examId } }],
  });

  const rows = students
    .filter((s) => s.Marks.length)
    .map((s) => {
      const taken = subjects.filter((sub) => facts.takes(s.id, sub.id));
      const takenIds = new Set(taken.map((sub) => sub.id));
      s.Marks = s.Marks.filter((m) => takenIds.has(m.subjectId)); // a stale mark for a subject the student does not take is ignored
      const total = s.Marks.reduce((sum, m) => sum + Number(m.marks), 0);
      const outOf = taken.length * exam.maxMarks;
      const percentage = outOf ? round((total / outOf) * 100) : 0;
      const failed = s.Marks.filter(
        (m) => (Number(m.marks) / exam.maxMarks) * 100 < policy.passPercent,
      ).length;
      // A student with fewer entered marks than subjects has not finished the exam.
      const incomplete = s.Marks.length < taken.length;
      return {
        studentId: s.id,
        admissionNo: s.admissionNo,
        name: `${s.firstName} ${s.lastName}`,
        total: round(total),
        outOf,
        percentage,
        grade: policy.gradeFor(percentage),
        result: incomplete ? 'incomplete' : failed ? 'fail' : 'pass',
      };
    })
    .sort((a, b) => b.total - a.total);

  // Equal totals share a rank (1, 1, 3 ...).
  rows.forEach((r, i) => {
    r.rank = i > 0 && rows[i - 1].total === r.total ? rows[i - 1].rank : i + 1;
  });
  return { exam, rows };
}

/** One student's report card: marks per subject, overall result, rank and attendance. */
export async function getReportCard(examId, studentId) {
  const policy = await loadGrading();
  const { exam, rows } = await getResults(examId, policy);
  const student = await Student.findByPk(studentId, { include: [SchoolClass] });
  if (!student) throw notFound('Student not found');
  const teacher = student.SchoolClass?.classTeacherId
    ? await Staff.findByPk(student.SchoolClass.classTeacherId, { attributes: ['firstName', 'lastName'] })
    : null;

  const facts = await electiveFacts(exam.classId);
  const subjects = (await examSubjects(exam)).filter((s) => facts.takes(Number(studentId), s.id));
  const marks = await Mark.findAll({ where: { examId, studentId } });
  const marksBySubject = new Map(marks.map((m) => [m.subjectId, Number(m.marks)]));
  const practicalBySubject = new Map(
    marks.filter((m) => m.practicalMarks !== null).map((m) => [m.subjectId, Number(m.practicalMarks)]),
  );

  const attendance = await Attendance.findAll({ where: { studentId }, attributes: ['status'] });
  const attended = attendance.filter((a) => a.status !== 'absent').length;

  return {
    exam: { id: exam.id, name: exam.name, maxMarks: exam.maxMarks },
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      name: `${student.firstName} ${student.lastName}`,
      className: student.SchoolClass ? `${student.SchoolClass.name}-${student.SchoolClass.section}` : null,
      classTeacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
    },
    subjects: subjects.map((s) => {
      const obtained = marksBySubject.get(s.id) ?? null;
      const percent = obtained === null ? null : (obtained / exam.maxMarks) * 100;
      return {
        subjectId: s.id,
        subject: s.name,
        component: s.component,
        elective: s.isElective,
        ...(() => {
          const split = splitOf(s.component, s.practicalShare, exam.maxMarks);
          const practical = practicalBySubject.get(s.id);
          return split && practical !== undefined && marksBySubject.has(s.id)
            ? {
                theoryMarks: marksBySubject.get(s.id) - practical,
                practicalMarks: practical,
                theoryMax: split.theory,
                practicalMax: split.practical,
              }
            : split
              ? { theoryMax: split.theory, practicalMax: split.practical }
              : {};
        })(),
        marks: obtained,
        maxMarks: exam.maxMarks,
        grade: percent === null ? null : policy.gradeFor(percent),
        passed: percent === null ? null : percent >= policy.passPercent,
      };
    }),
    summary: rows.find((r) => r.studentId === Number(studentId)) ?? null,
    classSize: rows.length,
    attendance: {
      days: attendance.length,
      percentage: attendance.length ? round((attended / attendance.length) * 100) : null,
    },
  };
}
