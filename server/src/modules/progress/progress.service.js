import {
  CoScholasticArea,
  CoScholasticGrade,
  Exam,
  ExamGroup,
  SchoolClass,
  Student,
  sequelize,
} from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { getReportCard } from '../exams/exams.service.js';
import { getGroupResults } from '../exams/examExtras.service.js';

const GRADES = ['A', 'B', 'C', 'D', 'E'];
const className = (c) => (c ? `${c.name}-${c.section}` : null);

/* ---------- Co-scholastic areas ---------- */

export const listAreas = () =>
  CoScholasticArea.findAll({
    order: [
      ['category', 'ASC'],
      ['name', 'ASC'],
    ],
  });

export async function createArea({ name, category }) {
  if (!name?.trim()) throw badRequest('Area name is required');
  if (await CoScholasticArea.findOne({ where: { name: name.trim() } }))
    throw conflict('That area already exists');
  return (await CoScholasticArea.create({ name: name.trim(), category: category?.trim() || 'Skills' })).id;
}

export async function deleteArea(id) {
  await CoScholasticArea.destroy({ where: { id } }); // its grades go with it
}

/* ---------- Grading a class for one term ---------- */

async function loadGroup(groupId) {
  const group = await ExamGroup.findByPk(groupId, { include: [SchoolClass] });
  if (!group) throw notFound('Exam group not found');
  return group;
}

/** Every active student of the group's class with the grade given in each area (blank when not graded yet). */
export async function getGrades(groupId) {
  const group = await loadGroup(groupId);
  const [areas, students, grades] = await Promise.all([
    listAreas(),
    Student.findAll({
      where: { classId: group.classId, status: 'active' },
      attributes: ['id', 'admissionNo', 'firstName', 'lastName'],
      order: [['firstName', 'ASC']],
    }),
    CoScholasticGrade.findAll({ where: { examGroupId: groupId } }),
  ]);
  const byStudent = new Map();
  for (const g of grades) {
    if (!byStudent.has(g.studentId)) byStudent.set(g.studentId, {});
    byStudent.get(g.studentId)[g.areaId] = { grade: g.grade, remark: g.remark };
  }
  return {
    group: { id: group.id, name: group.name, className: className(group.SchoolClass) },
    areas: areas.map((a) => ({ id: a.id, name: a.name, category: a.category })),
    students: students.map((s) => ({
      studentId: s.id,
      admissionNo: s.admissionNo,
      name: `${s.firstName} ${s.lastName}`,
      grades: byStudent.get(s.id) ?? {},
    })),
  };
}

/** records: [{ studentId, areaId, grade, remark? }]. A blank grade clears that cell. */
export async function saveGrades(groupId, records = []) {
  const group = await loadGroup(groupId);
  const [members, areas] = await Promise.all([
    Student.findAll({ where: { classId: group.classId }, attributes: ['id'] }),
    CoScholasticArea.findAll({ attributes: ['id'] }),
  ]);
  const memberIds = new Set(members.map((s) => s.id));
  const areaIds = new Set(areas.map((a) => a.id));
  for (const r of records) {
    if (!memberIds.has(Number(r.studentId)))
      throw badRequest("Every student must belong to the group's class");
    if (!areaIds.has(Number(r.areaId))) throw badRequest('Unknown co-scholastic area');
    if (r.grade && !GRADES.includes(r.grade)) throw badRequest(`Grade must be one of ${GRADES.join(', ')}`);
    if (r.remark && String(r.remark).length > 200) throw badRequest('A remark can be at most 200 characters');
  }
  await sequelize.transaction(async (transaction) => {
    for (const r of records) {
      const key = { studentId: r.studentId, areaId: r.areaId, examGroupId: group.id };
      if (!r.grade) await CoScholasticGrade.destroy({ where: key, transaction });
      else
        await CoScholasticGrade.upsert(
          { ...key, grade: r.grade, remark: r.remark?.trim() || null },
          { transaction },
        );
    }
  });
  return records.length;
}

/* ---------- The progress card ---------- */

/**
 * One student's holistic card for a term: marks in every exam of the group, the combined result and rank,
 * attendance, and the co-scholastic grades.
 */
export async function getProgressCard(groupId, studentId) {
  const group = await loadGroup(groupId);
  const student = await Student.findByPk(studentId, { include: [SchoolClass] });
  if (!student) throw notFound('Student not found');
  if (student.classId !== group.classId) throw badRequest("This student is not in the group's class");

  const exams = await Exam.findAll({ where: { examGroupId: groupId }, order: [['id', 'ASC']] });
  const [combined, cards, grades, areas] = await Promise.all([
    exams.length ? getGroupResults(groupId) : null,
    Promise.all(exams.map((e) => getReportCard(e.id, studentId))),
    CoScholasticGrade.findAll({ where: { studentId, examGroupId: groupId } }),
    listAreas(),
  ]);

  // subject -> { exam id -> marks }, keeping the order subjects first appear in
  const subjects = new Map();
  cards.forEach((card) =>
    card.subjects.forEach((s) => {
      const row = subjects.get(s.subjectId) ?? { subjectId: s.subjectId, subject: s.subject, marks: {} };
      row.marks[card.exam.id] = { marks: s.marks, maxMarks: s.maxMarks, grade: s.grade, passed: s.passed };
      subjects.set(s.subjectId, row);
    }),
  );

  const gradeOf = new Map(grades.map((g) => [g.areaId, g]));
  return {
    group: { id: group.id, name: group.name },
    student: cards[0]?.student ?? {
      id: student.id,
      admissionNo: student.admissionNo,
      name: `${student.firstName} ${student.lastName}`,
      className: className(student.SchoolClass),
      classTeacher: null,
    },
    exams: exams.map((e) => ({ id: e.id, name: e.name, weight: e.weight })),
    scholastic: [...subjects.values()],
    overall: combined?.rows.find((r) => r.studentId === Number(studentId)) ?? null,
    classSize: combined?.rows.length ?? 0,
    attendance: cards[0]?.attendance ?? null,
    coScholastic: areas.map((a) => ({
      area: a.name,
      category: a.category,
      grade: gradeOf.get(a.id)?.grade ?? null,
      remark: gradeOf.get(a.id)?.remark ?? null,
    })),
  };
}
