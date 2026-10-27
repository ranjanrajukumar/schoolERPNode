import { Homework, HomeworkSubmission, SchoolClass, Student, Subject, sequelize } from '../../models/index.js';
import { SUBMISSION_STATUSES } from '../../models/homeworkSubmission.model.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

const FIELDS = ['classId', 'subjectId', 'title', 'description', 'assignedOn', 'dueDate', 'maxMarks'];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]));

function shape(h, counts) {
  return {
    id: h.id,
    classId: h.classId,
    subjectId: h.subjectId,
    title: h.title,
    description: h.description,
    assignedOn: h.assignedOn,
    dueDate: h.dueDate,
    maxMarks: h.maxMarks,
    createdByName: h.createdByName,
    className: h.SchoolClass ? `${h.SchoolClass.name}-${h.SchoolClass.section}` : null,
    subjectName: h.Subject?.name ?? null,
    overdue: h.dueDate < today(),
    ...(counts && { submitted: counts.submitted, total: counts.total }),
  };
}

const include = [{ model: SchoolClass, attributes: ['name', 'section'] }, { model: Subject, attributes: ['name'] }];

export async function listHomework({ classId, subjectId } = {}) {
  const rows = await Homework.findAll({
    where: { ...(classId && { classId }), ...(subjectId && { subjectId }) },
    include: [...include, { model: HomeworkSubmission, attributes: ['status'] }],
    order: [['dueDate', 'DESC'], ['id', 'DESC']],
    limit: 300,
  });
  return rows.map((h) => shape(h, {
    submitted: h.HomeworkSubmissions.filter((s) => ['submitted', 'late'].includes(s.status)).length,
    total: h.HomeworkSubmissions.length,
  }));
}

export async function createHomework(body, user) {
  const data = pick(body);
  if (!String(data.title ?? '').trim() || !data.classId || !data.subjectId || !data.dueDate) {
    throw badRequest('Class, subject, title and due date are required');
  }
  data.assignedOn = data.assignedOn || today();
  if (data.dueDate < data.assignedOn) throw badRequest('The due date cannot be before the assigned date');
  const row = await Homework.create({ ...data, createdBy: user.id, createdByName: user.name });
  return row.id;
}

export async function updateHomework(id, body) {
  const homework = await Homework.findByPk(id);
  if (!homework) throw notFound('Homework not found');
  const data = pick(body);
  const dueDate = data.dueDate ?? homework.dueDate;
  if (dueDate < (data.assignedOn ?? homework.assignedOn)) throw badRequest('The due date cannot be before the assigned date');
  if (data.maxMarks) {
    const worst = await HomeworkSubmission.max('marks', { where: { homeworkId: id } });
    if (worst !== null && worst > data.maxMarks) throw conflict(`A student already has ${worst} marks, which is above ${data.maxMarks}`);
  }
  await homework.update(data);
}

/** Teachers can remove their own homework; an admin can remove anyone's. */
export async function deleteHomework(id, user) {
  const homework = await Homework.findByPk(id);
  if (!homework) throw notFound('Homework not found');
  if (user.role !== 'admin' && homework.createdBy !== user.id) throw conflict('You can only delete homework you set');
  await homework.destroy();
}

/** Every active student of the class with their submission status (pending until marked). */
export async function getSubmissions(id) {
  const homework = await Homework.findByPk(id, { include });
  if (!homework) throw notFound('Homework not found');
  const [students, subs] = await Promise.all([
    Student.findAll({ where: { classId: homework.classId, status: 'active' }, order: [['firstName', 'ASC']] }),
    HomeworkSubmission.findAll({ where: { homeworkId: id } }),
  ]);
  const byStudent = new Map(subs.map((s) => [s.studentId, s]));
  return {
    homework: shape(homework),
    students: students.map((s) => {
      const sub = byStudent.get(s.id);
      return {
        studentId: s.id,
        admissionNo: s.admissionNo,
        name: `${s.firstName} ${s.lastName}`,
        status: sub?.status ?? 'pending',
        marks: sub?.marks ?? null,
        remarks: sub?.remarks ?? null,
      };
    }),
  };
}

/** Saves a batch atomically; marks must sit within the homework's maximum when it has one. */
export async function saveSubmissions(id, records = []) {
  const homework = await Homework.findByPk(id);
  if (!homework) throw notFound('Homework not found');

  const clean = records.map((r) => {
    if (!SUBMISSION_STATUSES.includes(r.status)) throw badRequest(`Status must be one of ${SUBMISSION_STATUSES.join(', ')}`);
    const blank = r.marks === '' || r.marks === null || r.marks === undefined;
    if (!blank) {
      const marks = Number(r.marks);
      if (Number.isNaN(marks) || marks < 0) throw badRequest('Marks must be zero or more');
      if (homework.maxMarks && marks > homework.maxMarks) throw badRequest(`Marks cannot be above ${homework.maxMarks}`);
    }
    return { homeworkId: id, studentId: r.studentId, status: r.status, marks: blank ? null : Number(r.marks), remarks: r.remarks || null };
  });

  await sequelize.transaction(async (transaction) => {
    for (const row of clean) await HomeworkSubmission.upsert(row, { transaction });
  });
  return clean.length;
}

/** A child's view: homework for their class with their own submission status. */
export async function homeworkForStudent(student) {
  if (!student.classId) return [];
  const rows = await Homework.findAll({
    where: { classId: student.classId },
    include: [...include, { model: HomeworkSubmission, required: false, where: { studentId: student.id } }],
    order: [['dueDate', 'DESC']],
    limit: 100,
  });
  return rows.map((h) => ({
    ...shape(h),
    submission: h.HomeworkSubmissions[0]
      ? { status: h.HomeworkSubmissions[0].status, marks: h.HomeworkSubmissions[0].marks, remarks: h.HomeworkSubmissions[0].remarks }
      : { status: 'pending', marks: null, remarks: null },
  }));
}
