import { Op } from 'sequelize';
import { ClassSubject, SchoolClass, Staff, Student, StudentSubject, Subject, sequelize } from '../../models/index.js';
import { badRequest, notFound } from '../../utils/httpError.js';

/**
 * The subject map: which subjects a class studies, how each is taught (theory, practical or both), whether it is core or an
 * elective, and which students took each elective. Core subjects are taken by everyone in the class; an elective only by the
 * students who chose it, and a student picks at most one elective from each elective group (for example "Second language").
 */
export const COMPONENTS = ['theory', 'practical', 'theory_practical'];
export const COMPONENT_LABEL = { theory: 'Theory', practical: 'Practical', theory_practical: 'Theory + practical' };
const blank = (v) => v === undefined || v === null || v === '';

/** Checks a subject-map row sent by the form and returns the clean fields. */
export function cleanClassSubject(body, { partial = false } = {}) {
  const data = {};
  for (const key of ['classId', 'subjectId']) if (body[key] !== undefined) data[key] = Number(body[key]);
  if (!partial && (!data.classId || !data.subjectId)) throw badRequest('Class and subject are required');
  if (body.staffId !== undefined) data.staffId = blank(body.staffId) ? null : Number(body.staffId);
  if (body.component !== undefined) {
    if (!COMPONENTS.includes(body.component)) throw badRequest('A subject is taught as theory, practical or theory + practical');
    data.component = body.component;
  }
  if (body.isElective !== undefined) data.isElective = body.isElective === true || body.isElective === 'true' || body.isElective === 1;
  if (body.electiveGroup !== undefined) {
    const g = String(body.electiveGroup ?? '').trim();
    if (g.length > 50) throw badRequest('The elective group name must be 50 characters or fewer');
    data.electiveGroup = g || null;
  }
  if (body.periodsPerWeek !== undefined) {
    if (blank(body.periodsPerWeek)) data.periodsPerWeek = null;
    else if (!Number.isInteger(Number(body.periodsPerWeek)) || Number(body.periodsPerWeek) < 0 || Number(body.periodsPerWeek) > 30) throw badRequest('Periods per week must be a whole number from 0 to 30');
    else data.periodsPerWeek = Number(body.periodsPerWeek);
  }
  if (body.practicalShare !== undefined) {
    if (blank(body.practicalShare)) data.practicalShare = null;
    else if (!Number.isInteger(Number(body.practicalShare)) || Number(body.practicalShare) < 1 || Number(body.practicalShare) > 99) throw badRequest('The practical share is a whole percent from 1 to 99');
    else data.practicalShare = Number(body.practicalShare);
  }
  if (data.component && data.component !== 'theory_practical') data.practicalShare = null; // only theory + practical subjects split their marks
  if (data.isElective === false) data.electiveGroup = null; // a core subject has no group
  if (data.electiveGroup && data.isElective === undefined) data.isElective = true;
  return data;
}

/**
 * How a subject's marks split into theory and practical for an exam out of `max`. A practical-only subject is all practical; a
 * theory + practical subject splits by its practical share (30% of 100 marks = 30 practical, 70 theory); anything else is not
 * split and takes one mark. Returns { theory, practical } maxima, or null.
 */
export function splitOf(component, share, max) {
  if (component === 'practical') return { theory: 0, practical: max };
  if (component === 'theory_practical' && share) { const practical = Math.round((max * share) / 100); return { theory: max - practical, practical }; }
  return null;
}

/** After a subject stops being an elective, nobody holds a "choice" of it any more. */
export async function afterClassSubjectChange(id) {
  const row = await ClassSubject.findByPk(id);
  if (row && !row.isElective) await StudentSubject.destroy({ where: { classSubjectId: id } });
}

/** One class's subject map: each subject with its teacher, how it is taught and how many students take it. */
export async function classSubjectMap(classId) {
  const cls = await SchoolClass.findByPk(classId);
  if (!cls) throw notFound('Class not found');
  const [rows, students, takers] = await Promise.all([
    ClassSubject.findAll({ where: { classId }, include: [Subject, { model: Staff, required: false, attributes: ['firstName', 'lastName'] }], order: [['isElective', 'ASC'], ['id', 'ASC']] }),
    Student.count({ where: { classId, status: 'active' } }),
    StudentSubject.findAll({ attributes: ['classSubjectId', [sequelize.fn('COUNT', sequelize.col('student_id')), 'n']], group: ['classSubjectId'], raw: true }),
  ]);
  const count = new Map(takers.map((t) => [t.classSubjectId, Number(t.n)]));
  return {
    classId: cls.id, className: `${cls.name}-${cls.section}`, students,
    subjects: rows.map((r) => ({
      id: r.id, subjectId: r.subjectId, name: r.Subject.name, code: r.Subject.code, component: r.component, componentLabel: COMPONENT_LABEL[r.component],
      isElective: r.isElective, electiveGroup: r.electiveGroup, periodsPerWeek: r.periodsPerWeek, practicalShare: r.practicalShare, staffId: r.staffId,
      teacherName: r.Staff ? `${r.Staff.firstName} ${r.Staff.lastName}` : null,
      takers: r.isElective ? (count.get(r.id) ?? 0) : students,
    })),
  };
}

/** The elective sheet for a class: the groups and what each active student has chosen. */
export async function electiveSheet(classId) {
  const map = await classSubjectMap(classId);
  const electives = map.subjects.filter((s) => s.isElective);
  const students = await Student.findAll({ where: { classId, status: 'active' }, attributes: ['id', 'admissionNo', 'firstName', 'lastName'], order: [['firstName', 'ASC']] });
  const chosen = electives.length ? await StudentSubject.findAll({ where: { classSubjectId: electives.map((e) => e.id), studentId: students.map((s) => s.id) } }) : [];
  const byStudent = new Map();
  for (const c of chosen) byStudent.set(c.studentId, [...(byStudent.get(c.studentId) ?? []), c.classSubjectId]);
  const groups = new Map();
  for (const e of electives) groups.set(e.electiveGroup ?? e.name, [...(groups.get(e.electiveGroup ?? e.name) ?? []), e]);
  return {
    className: map.className,
    groups: [...groups.entries()].map(([name, list]) => ({ name, subjects: list.map((s) => ({ classSubjectId: s.id, name: s.name, component: s.component })) })),
    students: students.map((s) => ({ id: s.id, admissionNo: s.admissionNo, name: `${s.firstName} ${s.lastName}`, choices: byStudent.get(s.id) ?? [] })),
  };
}

/**
 * Saves the electives a student takes. Every one must be an elective of the student's own class, and a group allows only one.
 * Passing an empty list clears them all.
 */
export async function setStudentElectives(studentId, classSubjectIds = [], { transaction } = {}) {
  const student = await Student.findByPk(studentId, { transaction });
  if (!student) throw notFound('Student not found');
  const ids = [...new Set((classSubjectIds ?? []).map(Number).filter(Boolean))];
  const rows = ids.length ? await ClassSubject.findAll({ where: { id: ids }, include: [Subject], transaction }) : [];
  if (rows.length !== ids.length) throw badRequest('One of those subjects does not exist');
  const seen = new Map();
  for (const r of rows) {
    if (!student.classId || r.classId !== student.classId) throw badRequest(`${r.Subject.name} is not a subject of this student's class`);
    if (!r.isElective) throw badRequest(`${r.Subject.name} is a core subject: every student takes it`);
    const group = r.electiveGroup ?? `subject:${r.id}`;
    if (seen.has(group)) throw badRequest(`Choose only one of ${seen.get(group)} and ${r.Subject.name}: they are in the same elective group`);
    seen.set(group, r.Subject.name);
  }
  const own = await ClassSubject.findAll({ where: { classId: student.classId ?? 0, isElective: true }, attributes: ['id'], transaction });
  await StudentSubject.destroy({ where: { studentId, classSubjectId: own.map((o) => o.id) }, transaction });
  if (ids.length) await StudentSubject.bulkCreate(ids.map((classSubjectId) => ({ studentId, classSubjectId })), { transaction });
  return ids.length;
}

/** Removes elective choices that no longer match the student's class (after a move or promotion). */
export async function pruneElectives(studentIds) {
  const students = await Student.findAll({ where: { id: studentIds }, attributes: ['id', 'classId'] });
  for (const s of students) {
    const keep = s.classId ? (await ClassSubject.findAll({ where: { classId: s.classId }, attributes: ['id'] })).map((c) => c.id) : [];
    await StudentSubject.destroy({ where: { studentId: s.id, ...(keep.length ? { classSubjectId: { [Op.notIn]: keep } } : {}) } });
  }
}

/**
 * What the exams need to know about a class: which of its subjects are electives, and who takes each.
 * Returns { electives: Set(subjectId), takes(studentId, subjectId) }.
 */
export async function electiveFacts(classId) {
  const electives = await ClassSubject.findAll({ where: { classId, isElective: true }, attributes: ['id', 'subjectId'] });
  const bySubject = new Map(electives.map((e) => [e.id, e.subjectId]));
  const rows = electives.length ? await StudentSubject.findAll({ where: { classSubjectId: electives.map((e) => e.id) }, attributes: ['studentId', 'classSubjectId'] }) : [];
  const taken = new Set(rows.map((r) => `${r.studentId}:${bySubject.get(r.classSubjectId)}`));
  const electiveIds = new Set(electives.map((e) => e.subjectId));
  return { electives: electiveIds, takes: (studentId, subjectId) => !electiveIds.has(subjectId) || taken.has(`${studentId}:${subjectId}`) };
}

/** Everything one student's class, subjects and electives add up to, for the details popup. */
export async function studentSubjects(studentId) {
  const student = await Student.findByPk(studentId, { include: [SchoolClass] });
  if (!student) throw notFound('Student not found');
  if (!student.classId) return { className: null, subjects: [] };
  const map = await classSubjectMap(student.classId);
  const chosen = new Set((await StudentSubject.findAll({ where: { studentId }, attributes: ['classSubjectId'] })).map((c) => c.classSubjectId));
  return {
    className: map.className,
    subjects: map.subjects.filter((s) => !s.isElective || chosen.has(s.id)),
    electivesNotChosen: map.subjects.filter((s) => s.isElective && !chosen.has(s.id)).map((s) => s.name),
  };
}
