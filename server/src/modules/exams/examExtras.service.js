import {
  Exam, ExamGroup, GradeBand, GradingSetting, Mark, RevaluationRequest, SchoolClass, Student, Subject, sequelize,
} from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { loadGrading } from './grading.js';
import { getResults } from './exams.service.js';

const round = (n) => Math.round(n * 100) / 100;
const className = (c) => (c ? `${c.name}-${c.section}` : null);

/* ---------- Grade setup ---------- */

/** Replaces the whole grade scale and pass mark. The scale must start at 0 so every percentage earns a grade. */
export async function saveGrading({ passPercent, bands }) {
  const pass = Number(passPercent);
  if (Number.isNaN(pass) || pass < 0 || pass > 100) throw badRequest('Pass mark must be between 0 and 100');
  if (!Array.isArray(bands) || !bands.length) throw badRequest('Add at least one grade');

  const clean = bands.map((b) => ({ grade: String(b.grade ?? '').trim(), minPercent: Number(b.min) }));
  if (clean.some((b) => !b.grade || b.grade.length > 10)) throw badRequest('Every grade needs a name of up to 10 characters');
  if (clean.some((b) => Number.isNaN(b.minPercent) || b.minPercent < 0 || b.minPercent > 100)) throw badRequest('Each lower limit must be between 0 and 100');
  if (new Set(clean.map((b) => b.minPercent)).size !== clean.length) throw badRequest('Two grades cannot start at the same percentage');
  if (new Set(clean.map((b) => b.grade.toLowerCase())).size !== clean.length) throw badRequest('Grade names must be different');
  if (!clean.some((b) => b.minPercent === 0)) throw badRequest('The lowest grade must start at 0%');

  await sequelize.transaction(async (transaction) => {
    await GradeBand.destroy({ where: {}, transaction });
    await GradeBand.bulkCreate(clean, { transaction });
    await GradingSetting.upsert({ id: 1, passPercent: pass }, { transaction });
  });
}

/* ---------- Exam groups ---------- */

export async function listGroups() {
  const groups = await ExamGroup.findAll({
    include: [{ model: SchoolClass, attributes: ['name', 'section'] }, { model: Exam, attributes: ['id', 'name', 'weight'] }],
    order: [['id', 'DESC']],
  });
  return groups.map((g) => ({
    id: g.id,
    classId: g.classId,
    name: g.name,
    className: className(g.SchoolClass),
    exams: g.Exams.map((e) => ({ id: e.id, name: e.name, weight: e.weight })),
  }));
}

/** Attaches an exam to a group of the same class, or detaches it when `groupId` is null. */
export async function assignExam(examId, groupId, weight) {
  const exam = await Exam.findByPk(examId);
  if (!exam) throw notFound('Exam not found');
  if (groupId) {
    const group = await ExamGroup.findByPk(groupId);
    if (!group) throw notFound('Exam group not found');
    if (group.classId !== exam.classId) throw badRequest('An exam can only join a group of its own class');
  }
  const next = { examGroupId: groupId || null };
  if (weight !== undefined && weight !== '') {
    if (!Number.isInteger(Number(weight)) || Number(weight) < 1 || Number(weight) > 1000) throw badRequest('Weight must be a whole number from 1 to 1000');
    next.weight = Number(weight);
  }
  await exam.update(next);
}

/**
 * Combined result for a group: each student's exam percentages, averaged by the exams' weights. A student
 * who missed an exam keeps the average of the exams they sat but is marked incomplete.
 */
export async function getGroupResults(groupId) {
  const group = await ExamGroup.findByPk(groupId, { include: [SchoolClass] });
  if (!group) throw notFound('Exam group not found');
  const exams = await Exam.findAll({ where: { examGroupId: groupId }, order: [['id', 'ASC']] });
  if (!exams.length) return { group: { id: group.id, name: group.name, className: className(group.SchoolClass) }, exams: [], rows: [] };

  const policy = await loadGrading();
  const perExam = [];
  for (const exam of exams) perExam.push({ exam, rows: (await getResults(exam.id, policy)).rows });

  const students = new Map();
  for (const { exam, rows } of perExam) {
    for (const r of rows) {
      const s = students.get(r.studentId) ?? { studentId: r.studentId, admissionNo: r.admissionNo, name: r.name, weighted: 0, weights: 0, taken: 0, results: [], parts: {} };
      s.weighted += r.percentage * exam.weight;
      s.weights += exam.weight;
      s.taken += 1;
      s.results.push(r.result);
      s.parts[exam.id] = r.percentage;
      students.set(r.studentId, s);
    }
  }

  const rows = [...students.values()].map((s) => {
    const percentage = round(s.weighted / s.weights);
    const result = s.results.includes('fail') ? 'fail' : (s.results.includes('incomplete') || s.taken < exams.length) ? 'incomplete' : 'pass';
    return { studentId: s.studentId, admissionNo: s.admissionNo, name: s.name, parts: s.parts, percentage, grade: policy.gradeFor(percentage), result };
  }).sort((a, b) => b.percentage - a.percentage);
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].percentage === r.percentage ? rows[i - 1].rank : i + 1; });

  return {
    group: { id: group.id, name: group.name, className: className(group.SchoolClass) },
    exams: exams.map((e) => ({ id: e.id, name: e.name, weight: e.weight })),
    rows,
  };
}

/* ---------- Merit list ---------- */

/** Passing students only, ranked afresh (ties share a rank), for one exam or one group, top `limit`. */
export async function meritList({ examId, groupId, limit }) {
  if (!examId && !groupId) throw badRequest('Choose an exam or an exam group');
  const top = Math.min(Math.max(Number(limit) || 10, 1), 200);

  let title; let className_; let rows; let key;
  if (groupId) {
    const g = await getGroupResults(groupId);
    title = g.group.name; className_ = g.group.className; rows = g.rows; key = 'percentage';
  } else {
    const r = await getResults(examId);
    const cls = await SchoolClass.findByPk(r.exam.classId);
    title = r.exam.name; className_ = className(cls); rows = r.rows; key = 'total';
  }

  const passed = rows.filter((r) => r.result === 'pass').sort((a, b) => b[key] - a[key]);
  passed.forEach((r, i) => { r.merit = i > 0 && passed[i - 1][key] === r[key] ? passed[i - 1].merit : i + 1; });
  return { title, className: className_, basedOn: key === 'percentage' ? 'weighted percentage' : 'total marks', rows: passed.filter((r) => r.merit <= top) };
}

/* ---------- Revaluation ---------- */

function shapeRevaluation(r) {
  return {
    id: r.id,
    examId: r.examId,
    studentId: r.studentId,
    subjectId: r.subjectId,
    originalMarks: r.originalMarks,
    newMarks: r.newMarks,
    reason: r.reason,
    status: r.status,
    remarks: r.remarks,
    decidedByName: r.decidedByName,
    createdAt: r.createdAt,
    examName: r.Exam?.name,
    maxMarks: r.Exam?.maxMarks,
    subjectName: r.Subject?.name,
    studentName: r.Student ? `${r.Student.firstName} ${r.Student.lastName}` : undefined,
    admissionNo: r.Student?.admissionNo,
  };
}

const include = [
  { model: Exam, attributes: ['name', 'maxMarks'] },
  { model: Subject, attributes: ['name'] },
  { model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] },
];

export async function listRevaluations({ status, studentId, examId } = {}) {
  const rows = await RevaluationRequest.findAll({
    where: { ...(status && { status }), ...(studentId && { studentId }), ...(examId && { examId }) },
    include,
    order: [['id', 'DESC']],
    limit: 300,
  });
  return rows.map(shapeRevaluation);
}

/** The student must have a mark in that exam and subject; one open request per student, exam and subject. */
export async function requestRevaluation({ examId, studentId, subjectId, reason }, requestedBy) {
  if (!String(reason ?? '').trim()) throw badRequest('A reason is required');
  const mark = await Mark.findOne({ where: { examId, studentId, subjectId } });
  if (!mark) throw notFound('There is no recorded mark for that student, exam and subject');
  const open = await RevaluationRequest.findOne({ where: { examId, studentId, subjectId, status: 'pending' } });
  if (open) throw conflict('A revaluation request is already pending for this subject');
  return (await RevaluationRequest.create({ examId, studentId, subjectId, originalMarks: mark.marks, reason: reason.trim(), requestedBy })).id;
}

/**
 * Accepting records the corrected mark on the exam itself in the same transaction, so results and report
 * cards update at once; the request keeps the original mark as the audit trail. Marks may go up or down.
 */
export async function decideRevaluation(id, decision, { newMarks, remarks }, user) {
  return sequelize.transaction(async (transaction) => {
    const req = await RevaluationRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE, include: [{ model: Exam, attributes: ['maxMarks'] }] });
    if (!req) throw notFound('Revaluation request not found');
    if (req.status !== 'pending') throw conflict(`This request is already ${req.status}`);

    if (decision === 'accepted') {
      const marks = Number(newMarks);
      if (newMarks === undefined || newMarks === '' || Number.isNaN(marks) || marks < 0 || marks > req.Exam.maxMarks) {
        throw badRequest(`The revised mark must be between 0 and ${req.Exam.maxMarks}`);
      }
      await Mark.upsert({ examId: req.examId, studentId: req.studentId, subjectId: req.subjectId, marks }, { transaction });
      await req.update({ status: 'accepted', newMarks: marks, remarks: remarks?.trim() || null, decidedBy: user.id, decidedByName: user.name }, { transaction });
    } else {
      if (!String(remarks ?? '').trim()) throw badRequest('Give a reason for rejecting');
      await req.update({ status: 'rejected', remarks: remarks.trim(), decidedBy: user.id, decidedByName: user.name }, { transaction });
    }
  });
}
