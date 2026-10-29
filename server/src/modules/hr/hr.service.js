import { Op, fn, col } from 'sequelize';
import {
  Department,
  LeaveRequest,
  LeaveType,
  Staff,
  StaffAttendance,
  User,
  sequelize,
} from '../../models/index.js';
import { checkLimit, daysUsed, leaveSpan, listTypes, typeFor } from '../leave/leaveTypes.service.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/httpError.js';
import { notifyUsers } from '../push/push.service.js';
import { today } from '../../utils/money.js';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const name = (s) => `${s.firstName} ${s.lastName}`;

/** Calendar days from `from` to `to`, both included. */

function monthRange(month) {
  if (!MONTH.test(month ?? '')) throw badRequest('month must be YYYY-MM');
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

/* ---------- Staff attendance ---------- */

/** Active staff with their mark for the day. Staff on approved leave default to "leave" until saved. */
export async function getRoster(date) {
  const [staff, marks, leaves] = await Promise.all([
    Staff.findAll({ where: { status: 'active' }, order: [['firstName', 'ASC']] }),
    StaffAttendance.findAll({ where: { date } }),
    LeaveRequest.findAll({
      where: { status: 'approved', fromDate: { [Op.lte]: date }, toDate: { [Op.gte]: date } },
    }),
  ]);
  const byStaff = new Map(marks.map((m) => [m.staffId, m.status]));
  const onLeave = new Set(leaves.map((l) => l.staffId));
  return staff.map((s) => ({
    staffId: s.id,
    staffNo: s.staffNo,
    name: name(s),
    status: byStaff.get(s.id) ?? (onLeave.has(s.id) ? 'leave' : null),
    onApprovedLeave: onLeave.has(s.id),
  }));
}

export async function saveAttendance({ date, records = [] }) {
  if (!date) throw badRequest('date is required');
  await sequelize.transaction(async (transaction) => {
    for (const { staffId, status } of records) {
      await StaffAttendance.upsert({ staffId, date, status }, { transaction });
    }
  });
}

/* ---------- Leave ---------- */

/** Allowance, used and remaining for each staff leave type this year. */
export async function leaveBalance(staffId, year = new Date().getFullYear()) {
  if (!(await Staff.findByPk(staffId))) throw notFound('Staff not found');
  const out = [];
  for (const type of await listTypes({ kind: 'staff' })) {
    const used = await daysUsed('staff', staffId, type.id, year);
    out.push({
      typeId: type.id,
      type: type.name,
      allowance: type.yearlyDays,
      used,
      remaining: type.yearlyDays === null ? null : type.yearlyDays - used,
    });
  }
  return out;
}

/** An admin decides any staff leave; a department head decides it for their own department, when the type says so, and never their own. */
const mayDecide = (decider, leave, type) =>
  decider?.role === 'admin' ||
  (type?.approver === 'department_head' &&
    Boolean(decider?.staffId) &&
    decider.staffId !== leave.staffId &&
    Boolean(leave.Staff?.Department) &&
    leave.Staff.Department.headStaffId === decider.staffId);

const withDepartment = [
  {
    model: Staff,
    attributes: ['firstName', 'lastName', 'staffNo', 'departmentId'],
    required: true,
    include: [{ model: Department, attributes: ['headStaffId'], required: false }],
  },
  { model: LeaveType, required: false },
];

/** Leave requests. A department head (a non-admin) sees only the requests they can decide. */
export async function listLeaves({ status, staffId } = {}, viewer = null) {
  const rows = await LeaveRequest.findAll({
    where: { ...(status && { status }), ...(staffId && { staffId }) },
    include: withDepartment,
    order: [['id', 'DESC']],
  });
  return rows
    .map((l) => ({ l, can: mayDecide(viewer, l, l.LeaveType) }))
    .filter(({ can }) => !viewer || viewer.role === 'admin' || can)
    .map(({ l, can }) => ({
      ...l.toJSON(),
      Staff: undefined,
      LeaveType: undefined,
      staffName: name(l.Staff),
      staffNo: l.Staff.staffNo,
      approver: l.LeaveType?.approver ?? 'admin',
      canDecide: l.status === 'pending' && can,
    }));
}

/**
 * Records a staff leave request. A request no longer than the type's auto-approve days (and within the yearly limit)
 * is approved straight away; anything else waits for an admin.
 */
export async function applyLeave({
  staffId,
  leaveTypeId,
  fromDate,
  toDate,
  reason,
  dayPart,
  fromTime,
  toTime,
}) {
  const type = await typeFor(leaveTypeId, 'staff');
  if (!fromDate || !toDate) throw badRequest('From and to dates are required');
  if (toDate < fromDate) throw badRequest('The end date cannot be before the start date');
  if (fromDate.slice(0, 4) !== toDate.slice(0, 4))
    throw badRequest('Split leave that crosses a year into two applications');
  if (!(await Staff.findByPk(staffId))) throw notFound('Staff not found');

  // Overlapping an existing live request is almost always a mistake.
  const clash = await LeaveRequest.findOne({
    where: {
      staffId,
      status: { [Op.in]: ['pending', 'approved'] },
      fromDate: { [Op.lte]: toDate },
      toDate: { [Op.gte]: fromDate },
    },
  });
  if (clash)
    throw conflict(`Overlaps an existing ${clash.status} leave (${clash.fromDate} to ${clash.toDate})`);

  const span = leaveSpan({ dayPart, fromTime, toTime, fromDate, toDate });
  const { days } = span;
  let auto = type.autoApproveDays !== null && days <= type.autoApproveDays;
  if (auto) {
    try {
      await checkLimit('staff', staffId, type, fromDate.slice(0, 4), days);
    } catch {
      auto = false;
    } // over the limit: let an admin decide
  }
  const person = await Staff.findByPk(staffId, {
    include: [{ model: Department, attributes: ['headStaffId'], required: false }],
  });
  const row = await LeaveRequest.create({
    staffId,
    type: type.name,
    leaveTypeId: type.id,
    fromDate,
    toDate,
    days,
    dayPart: span.dayPart,
    fromTime: span.fromTime,
    toTime: span.toTime,
    reason: reason || null,
    ...(auto && { status: 'approved', remarks: 'Auto-approved' }),
  });
  const headId = person.Department?.headStaffId;
  if (row.status === 'pending' && type.approver === 'department_head' && headId && headId !== staffId) {
    const head = await User.findOne({ where: { staffId: headId }, attributes: ['id'] });
    if (head)
      await notifyUsers([head.id], {
        title: 'Leave request waiting',
        body: `${name(person)}: ${fromDate} to ${toDate}. ${type.name}`,
        url: '/leave-applications',
      });
  }
  return { id: row.id, status: row.status };
}

/** Approving checks the balance for the year first, so the limit can never be exceeded. */
export async function decideLeave(id, decision, { remarks }, decider) {
  return sequelize.transaction(async (transaction) => {
    const leave = await LeaveRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!leave) throw notFound('Leave request not found');
    if (leave.status !== 'pending') throw conflict(`This request is already ${leave.status}`);
    const type = leave.leaveTypeId ? await LeaveType.findByPk(leave.leaveTypeId, { transaction }) : null;
    const requester = await Staff.findByPk(leave.staffId, {
      include: [{ model: Department, attributes: ['headStaffId'], required: false }],
      transaction,
    });
    if (!mayDecide(decider, { ...leave.toJSON(), Staff: requester }, type)) {
      throw forbidden(
        type?.approver === 'department_head'
          ? "Only an admin or the head of this staff member's department can decide this leave"
          : 'Only an admin can decide this leave',
      );
    }

    if (decision === 'approved') {
      if (type)
        await checkLimit('staff', leave.staffId, type, leave.fromDate.slice(0, 4), leave.days, {
          exceptId: leave.id,
        });
    } else if (!String(remarks ?? '').trim()) {
      throw badRequest('Give a reason for rejecting');
    }
    await leave.update(
      { status: decision, remarks: remarks || null, decidedBy: decider.id },
      { transaction },
    );
  });
}

/** A pending request can be withdrawn, and an approved one cancelled while it has not started. */
export async function cancelLeave(id) {
  const leave = await LeaveRequest.findByPk(id);
  if (!leave) throw notFound('Leave request not found');
  const started = leave.fromDate <= today();
  if (leave.status === 'approved' && started)
    throw conflict('Leave that has already started cannot be cancelled');
  if (!['pending', 'approved'].includes(leave.status))
    throw conflict(`A ${leave.status} request cannot be cancelled`);
  await leave.update({ status: 'cancelled' });
}

/* ---------- Reports ---------- */

export async function hrSummary(month) {
  const { from, to } = monthRange(month);
  const year = Number(month.slice(0, 4));

  const [staff, departments, marks] = await Promise.all([
    Staff.findAll({ where: { status: 'active' }, include: [Department], order: [['firstName', 'ASC']] }),
    Department.findAll(),
    StaffAttendance.findAll({
      where: { date: { [Op.between]: [from, to] } },
      attributes: ['staffId', 'status', [fn('COUNT', col('id')), 'count']],
      group: ['staffId', 'status'],
      raw: true,
    }),
  ]);

  const counts = new Map();
  marks.forEach((m) => {
    const row = counts.get(m.staffId) ?? { present: 0, late: 0, absent: 0, leave: 0 };
    row[m.status] = Number(m.count);
    counts.set(m.staffId, row);
  });

  const perStaff = [];
  for (const s of staff) {
    const c = counts.get(s.id) ?? { present: 0, late: 0, absent: 0, leave: 0 };
    const marked = c.present + c.late + c.absent + c.leave;
    perStaff.push({
      staffId: s.id,
      staffNo: s.staffNo,
      name: name(s),
      department: s.Department?.name ?? null,
      ...c,
      markedDays: marked,
      attendancePercent: marked ? Math.round(((c.present + c.late) / marked) * 1000) / 10 : null,
      leaveTakenThisYear: (await leaveBalance(s.id, year)).reduce((sum, b) => sum + b.used, 0),
    });
  }

  const byDepartment = departments.map((d) => ({
    department: d.name,
    headcount: staff.filter((s) => s.departmentId === d.id).length,
  }));
  const unassigned = staff.filter((s) => !s.departmentId).length;
  if (unassigned) byDepartment.push({ department: 'Unassigned', headcount: unassigned });

  const pendingLeaves = await LeaveRequest.count({ where: { status: 'pending' } });
  return { month, headcount: staff.length, byDepartment, pendingLeaves, staff: perStaff };
}
