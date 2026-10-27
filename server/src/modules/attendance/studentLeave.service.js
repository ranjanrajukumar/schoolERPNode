import { Op } from 'sequelize';
import { getSetting } from '../settings/settings.service.js';
import { LeaveType, Parent, ParentStudent, SchoolClass, Student, StudentAccount, StudentLeave, User, sequelize } from '../../models/index.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/httpError.js';
import { notifyUsers } from '../push/push.service.js';
import { today } from '../../utils/money.js';
import { checkLimit, leaveSpan, typeFor } from '../leave/leaveTypes.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const inclusiveDays = (from, to) => Math.round((new Date(to) - new Date(from)) / DAY_MS) + 1;

function shape(l) {
  return {
    id: l.id,
    studentId: l.studentId,
    leaveTypeId: l.leaveTypeId,
    leaveType: l.LeaveType?.name ?? null,
    fromDate: l.fromDate,
    toDate: l.toDate,
    days: l.days,
    dayPart: l.dayPart,
    fromTime: l.fromTime,
    toTime: l.toTime,
    reason: l.reason,
    status: l.status,
    remarks: l.remarks,
    createdAt: l.createdAt,
    appliedBy: l.requestedByRole ?? null,
    decidedByName: l.decidedByName ?? null,
    decidedOn: l.decidedOn ?? null,
    studentName: l.Student ? `${l.Student.firstName} ${l.Student.lastName}` : undefined,
    admissionNo: l.Student?.admissionNo,
    className: l.Student?.SchoolClass ? `${l.Student.SchoolClass.name}-${l.Student.SchoolClass.section}` : undefined,
  };
}

/** An admin decides any leave; a teacher decides it only when the leave type lets the class teacher approve, and for their own class. */
export const mayDecide = (decider, student, type) => decider?.role === 'admin'
  || (decider?.role === 'teacher' && type?.approver !== 'admin' && Boolean(decider.staffId) && Boolean(student?.SchoolClass?.classTeacherId) && student.SchoolClass.classTeacherId === decider.staffId);

/** The student's own login and their parents' logins: everyone who should hear about a decision. */
export async function familyUserIds(studentId) {
  const [account, links] = await Promise.all([
    StudentAccount.findOne({ where: { studentId }, attributes: ['userId'] }),
    ParentStudent.findAll({ where: { studentId }, include: [{ model: Parent, attributes: ['userId'] }] }),
  ]);
  return [account?.userId, ...links.map((l) => l.Parent?.userId)].filter(Boolean);
}

/** Tells whoever decides this leave that one is waiting: the class teacher, or the admins when the class has none. */
async function notifyDeciders(student, leave) {
  const teacher = student.SchoolClass?.classTeacherId ? await User.findOne({ where: { staffId: student.SchoolClass.classTeacherId }, attributes: ['id'] }) : null;
  const ids = teacher ? [teacher.id] : (await User.findAll({ where: { role: 'admin' }, attributes: ['id'] })).map((u) => u.id);
  await notifyUsers(ids, { title: 'Leave request waiting', body: `${student.firstName} ${student.lastName}: ${leave.fromDate} to ${leave.toDate}. ${leave.reason}`, url: '/student-leaves' });
}

export async function listLeaves({ status, studentId, classId } = {}, viewer = null) {
  const rows = await StudentLeave.findAll({
    where: { ...(status && { status }), ...(studentId && { studentId }) },
    include: [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo', 'classId'], where: classId ? { classId } : {}, include: [SchoolClass] }, { model: LeaveType, required: false }],
    order: [['id', 'DESC']],
    limit: 300,
  });
  return rows.map((l) => ({ ...shape(l), ...(viewer && { canDecide: l.status === 'pending' && mayDecide(viewer, l.Student, l.LeaveType) }) }));
}

/** Staff record a request received by phone or letter; parents and students apply for themselves through the portal. */
export async function applyLeave({ studentId, leaveTypeId, fromDate, toDate, reason, dayPart, fromTime, toTime }, requestedBy, requestedByRole = 'staff') {
  const type = await typeFor(leaveTypeId, 'student');
  if (!fromDate || !toDate) throw badRequest('From and to dates are required');
  if (toDate < fromDate) throw badRequest('The end date cannot be before the start date');
  if (!String(reason ?? '').trim()) throw badRequest('A reason is required');
  const span = leaveSpan({ dayPart, fromTime, toTime, fromDate, toDate });
  const { days } = span;
  const maxDays = await getSetting('leave.studentMaxDays');
  if (days > maxDays) throw badRequest(`Leave cannot be longer than ${maxDays} days; speak to the school office`);
  // a parent or student cannot ask for days that are over; staff recording a leave afterwards can
  if (toDate < today() && requestedByRole !== 'staff') throw badRequest('Leave cannot be applied for dates that are already over');

  const student = await Student.findByPk(studentId, { include: [SchoolClass] });
  if (!student) throw notFound('Student not found');
  if (student.status !== 'active') throw conflict('Only active students can apply for leave');

  const clash = await StudentLeave.findOne({
    where: { studentId, status: { [Op.in]: ['pending', 'approved'] }, fromDate: { [Op.lte]: toDate }, toDate: { [Op.gte]: fromDate } },
  });
  if (clash) throw conflict(`Overlaps an existing ${clash.status} leave (${clash.fromDate} to ${clash.toDate})`);

  // pending days count against the yearly limit too, so a limit cannot be passed by queueing requests
  await checkLimit('student', studentId, type, fromDate.slice(0, 4), days, { includePending: true });

  const auto = type.autoApproveDays !== null && days <= type.autoApproveDays;
  const leave = await StudentLeave.create({
    studentId, leaveTypeId: type.id, fromDate, toDate, days, dayPart: span.dayPart, fromTime: span.fromTime, toTime: span.toTime, reason: reason.trim(), requestedBy, requestedByRole,
    ...(auto && { status: 'approved', decidedByName: 'Auto-approved', decidedOn: new Date() }),
  });
  if (!auto) await notifyDeciders(student, leave);
  return leave.id;
}

/** Approve or reject a pending request. `decider` is the signed-in user ({ id, name, role, staffId }); the family is told the outcome. */
export async function decideLeave(id, decision, { remarks }, decider) {
  const leave = await sequelize.transaction(async (transaction) => {
    const row = await StudentLeave.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw notFound('Leave request not found');
    if (row.status !== 'pending') throw conflict(`This request is already ${row.status}`);
    const student = await Student.findByPk(row.studentId, { include: [SchoolClass], transaction });
    const type = row.leaveTypeId ? await LeaveType.findByPk(row.leaveTypeId, { transaction }) : null;
    if (!mayDecide(decider, student, type)) throw forbidden(type?.approver === 'admin' ? 'Only an admin can approve or reject this type of leave' : 'Only the class teacher of this student, or an admin, can approve or reject this leave');
    if (decision === 'rejected' && !String(remarks ?? '').trim()) throw badRequest('Give a reason for rejecting');
    await row.update({ status: decision, remarks: remarks?.trim() || null, decidedBy: decider.id, decidedByName: decider.name, decidedOn: new Date() }, { transaction });
    return row;
  });
  const student = await Student.findByPk(leave.studentId, { attributes: ['firstName', 'lastName'] });
  await notifyUsers([...(await familyUserIds(leave.studentId)), leave.requestedBy], {
    title: decision === 'approved' ? 'Leave approved' : 'Leave not approved',
    body: `${student.firstName} ${student.lastName}, ${leave.fromDate} to ${leave.toDate}: ${decision === 'approved' ? 'approved' : 'rejected'} by ${decider.name}.${leave.remarks ? ` ${leave.remarks}` : ''}`,
    url: '/portal?tab=Leave',
  });
}

/** A request can be withdrawn while pending, or an approved one before it starts. `studentId` limits a parent to their own child. */
export async function cancelLeave(id, { studentId } = {}) {
  const leave = await StudentLeave.findByPk(id);
  if (!leave || (studentId && leave.studentId !== Number(studentId))) throw notFound('Leave request not found');
  if (leave.status === 'approved' && leave.fromDate <= today()) throw conflict('Leave that has already started cannot be cancelled');
  if (!['pending', 'approved'].includes(leave.status)) throw conflict(`A ${leave.status} request cannot be cancelled`);
  await leave.update({ status: 'cancelled' });
}
