import { Op } from 'sequelize';
import { Attendance, AttendanceCorrection, SchoolClass, Student, StudentLeave, sequelize } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

/** Students with an approved leave covering `date`. */
export async function studentsOnLeave(date) {
  const leaves = await StudentLeave.findAll({
    where: { status: 'approved', fromDate: { [Op.lte]: date }, toDate: { [Op.gte]: date } },
    attributes: ['studentId'],
  });
  return new Set(leaves.map((l) => l.studentId));
}

/**
 * Active students with their attendance status for the given day (null when unmarked).
 * `onApprovedLeave` tells the teacher an absence is already excused.
 */
export async function getRoster(date, classId) {
  const [students, onLeave] = await Promise.all([
    Student.findAll({
      where: { status: 'active', ...(classId && { classId }) },
      include: [{ model: Attendance, required: false, where: { date }, attributes: ['status', 'arrivalTime', 'note', 'savedAt'] }, { model: SchoolClass, attributes: ['name', 'section'], required: false }],
      order: [['firstName', 'ASC']],
    }),
    studentsOnLeave(date),
  ]);
  return students.map((s) => ({
    studentId: s.id,
    admissionNo: s.admissionNo,
    firstName: s.firstName,
    lastName: s.lastName,
    status: s.Attendances[0]?.status ?? null,
    arrivalTime: s.Attendances[0]?.arrivalTime ?? null,
    note: s.Attendances[0]?.note ?? null,
    savedAt: s.Attendances[0]?.savedAt ?? null,
    classId: s.classId,
    className: s.SchoolClass ? s.SchoolClass.name : null,
    section: s.SchoolClass ? s.SchoolClass.section : null,
    onApprovedLeave: onLeave.has(s.id),
  }));
}

/**
 * Saves a day's marks atomically. Changing a mark that already exists is a correction: it is logged
 * with the old and new value and who made it, and for any date before today a reason is required.
 */
export async function saveRecords(date, records, { reason, user }) {
  if (!Array.isArray(records) || !records.length) throw badRequest('records must be a non-empty list');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) throw badRequest('date must be YYYY-MM-DD');
  if (date > today()) throw badRequest('Attendance cannot be marked for a future date');
  if (records.some((r) => !['present', 'absent', 'late'].includes(r.status))) throw badRequest('Status must be present, absent or late');
  for (const r of records) {
    if (r.arrivalTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.arrivalTime)) throw badRequest('Arrival time must look like 08:15');
    if (r.note && String(r.note).length > 120) throw badRequest('A note must be 120 characters or fewer');
  }
  const known = await Student.count({ where: { id: records.map((r) => r.studentId) } });
  if (known !== new Set(records.map((r) => Number(r.studentId))).size) throw badRequest('Every record needs an existing student');
  const existing = await Attendance.findAll({ where: { date, studentId: records.map((r) => r.studentId) } });
  const before = new Map(existing.map((a) => [a.studentId, a.status]));
  const changes = records.filter((r) => before.has(r.studentId) && before.get(r.studentId) !== r.status);

  if (changes.length && date < today() && !String(reason ?? '').trim()) {
    throw badRequest(`A reason is required to change past attendance (${changes.length} mark(s) would change)`);
  }

  await sequelize.transaction(async (transaction) => {
    const savedAt = new Date();
    for (const { studentId, status, arrivalTime, note } of records) {
      // a student who was absent has no arrival time
      await Attendance.upsert({ studentId, date, status, arrivalTime: status === 'absent' ? null : arrivalTime || null, note: String(note ?? '').trim() || null, savedAt }, { transaction });
    }
    for (const c of changes) {
      await AttendanceCorrection.create({
        studentId: c.studentId, date, oldStatus: before.get(c.studentId), newStatus: c.status,
        reason: reason?.trim() || null, correctedBy: user.id, correctedByName: user.name,
      }, { transaction });
    }
  });
  return { saved: records.length, corrected: changes.length };
}

/** The correction log, newest first. Filters: studentId, from, to. */
export async function listCorrections({ studentId, from, to } = {}) {
  const rows = await AttendanceCorrection.findAll({
    where: {
      ...(studentId && { studentId }),
      ...((from || to) && { date: { ...(from && { [Op.gte]: from }), ...(to && { [Op.lte]: to }) } }),
    },
    include: [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] }],
    order: [['id', 'DESC']],
    limit: 300,
  });
  return rows.map((c) => ({
    id: c.id,
    date: c.date,
    studentId: c.studentId,
    studentName: `${c.Student.firstName} ${c.Student.lastName}`,
    admissionNo: c.Student.admissionNo,
    oldStatus: c.oldStatus,
    newStatus: c.newStatus,
    reason: c.reason,
    correctedByName: c.correctedByName,
    correctedAt: c.createdAt,
  }));
}
