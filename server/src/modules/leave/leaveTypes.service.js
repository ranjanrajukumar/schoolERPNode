import { Op } from 'sequelize';
import { LeaveRequest, LeaveType, SchoolClass, Staff, Student, StudentLeave } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';

const APPLIES = ['staff', 'student', 'both'];
const APPROVERS = ['admin', 'class_teacher', 'department_head'];

const optionalDays = (v, label) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 365) throw badRequest(`${label} must be a whole number from 0 to 365`);
  return n;
};

function clean(body) {
  const name = String(body.name ?? '').trim();
  if (!name || name.length > 60) throw badRequest('Name is required (60 characters at most)');
  if (!APPLIES.includes(body.appliesTo)) throw badRequest('Applies to must be staff, student or both');
  const approver = body.approver ?? 'admin';
  if (!APPROVERS.includes(approver)) throw badRequest('Approver must be admin, class_teacher or department_head');
  return {
    name,
    appliesTo: body.appliesTo,
    approver,
    paid: body.paid !== false && body.paid !== 'false',
    yearlyDays: optionalDays(body.yearlyDays, 'Yearly days'),
    autoApproveDays: optionalDays(body.autoApproveDays, 'Auto-approve days'),
    active: body.active !== false && body.active !== 'false',
  };
}

/** Leave types; `kind` ('staff' | 'student') keeps those that apply to it; inactive ones are hidden unless `all`. */
export async function listTypes({ kind, all } = {}) {
  return LeaveType.findAll({
    where: { ...(!all && { active: true }), ...(kind && { appliesTo: { [Op.in]: [kind, 'both'] } }) },
    order: [['id', 'ASC']],
  });
}

/** The type an application names, checked to be active and to apply to this kind of person. */
export async function typeFor(id, kind) {
  const type = id ? await LeaveType.findByPk(id) : null;
  if (!type) throw badRequest('Choose a leave type');
  if (!type.active) throw badRequest(`${type.name} is not available any more`);
  if (type.appliesTo !== 'both' && type.appliesTo !== kind) throw badRequest(`${type.name} is not a ${kind} leave type`);
  return type;
}

async function nameTaken(name, exceptId) {
  const row = await LeaveType.findOne({ where: { name } });
  return row && row.id !== Number(exceptId);
}

export async function createType(body) {
  const data = clean(body);
  if (await nameTaken(data.name)) throw conflict('A leave type with that name already exists');
  return (await LeaveType.create(data)).id;
}

export async function updateType(id, body) {
  const type = await LeaveType.findByPk(id);
  if (!type) throw notFound('Leave type not found');
  const data = clean(body);
  if (await nameTaken(data.name, id)) throw conflict('A leave type with that name already exists');
  await type.update(data);
}

/** A type already used by any request can only be switched off, so past records keep their meaning. */
export async function deleteType(id) {
  const [staff, students] = await Promise.all([LeaveRequest.count({ where: { leaveTypeId: id } }), StudentLeave.count({ where: { leaveTypeId: id } })]);
  if (staff + students) throw conflict('This type has been used; switch it off instead of deleting it');
  await LeaveType.destroy({ where: { id } });
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What a request covers: whole days (a range), one half day, or a few hours on one day ("timely leave", which uses no leave days).
 * Returns { dayPart, fromTime, toTime, days } after checking the combination.
 */
export function leaveSpan({ dayPart, fromTime, toTime, fromDate, toDate }) {
  for (const [label, value] of [['From date', fromDate], ['To date', toDate]]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw badRequest(`${label} must be a real date like 2026-11-05`);
  }
  if (toDate < fromDate) throw badRequest('The end date cannot be before the start date');
  if (fromDate.slice(0, 4) !== toDate.slice(0, 4)) throw badRequest('Split leave that crosses a year into two applications');
  const part = dayPart || 'full';
  if (!['full', 'first_half', 'second_half', 'time'].includes(part)) throw badRequest('Day part must be full, first_half, second_half or time');
  if (part === 'full') return { dayPart: 'full', fromTime: null, toTime: null, days: Math.round((new Date(toDate) - new Date(fromDate)) / DAY_MS) + 1 };
  if (fromDate !== toDate) throw badRequest('A half day or timely leave is for a single date');
  if (part === 'time') {
    if (!HH_MM.test(fromTime ?? '') || !HH_MM.test(toTime ?? '')) throw badRequest('Timely leave needs a from and to time like 10:30');
    if (toTime <= fromTime) throw badRequest('The end time must be after the start time');
    return { dayPart: 'time', fromTime, toTime, days: 0 };
  }
  return { dayPart: part, fromTime: null, toTime: null, days: 0.5 };
}

const modelFor = (kind) => (kind === 'staff' ? LeaveRequest : StudentLeave);
const keyFor = (kind) => (kind === 'staff' ? 'staffId' : 'studentId');

/** Days this person has already used of one type in a year. Pending days count when `includePending`; `exceptId` leaves one request out. */
export async function daysUsed(kind, personId, typeId, year, { includePending = false, exceptId } = {}) {
  const rows = await modelFor(kind).findAll({
    where: {
      [keyFor(kind)]: personId,
      leaveTypeId: typeId,
      status: includePending ? { [Op.in]: ['approved', 'pending'] } : 'approved',
      fromDate: { [Op.gte]: `${year}-01-01` },
      toDate: { [Op.lte]: `${year}-12-31` },
      ...(exceptId && { id: { [Op.ne]: exceptId } }),
    },
    attributes: ['days'],
    raw: true,
  });
  return rows.reduce((s, r) => s + Number(r.days), 0);
}

/** Throws when `days` more of this type would pass the yearly limit. */
export async function checkLimit(kind, personId, type, year, days, opts = {}) {
  if (type.yearlyDays === null) return;
  const used = await daysUsed(kind, personId, type.id, year, opts);
  if (used + days > type.yearlyDays) throw conflict(`Only ${Math.max(0, type.yearlyDays - used)} ${type.name} day(s) left this year; this request needs ${days}`);
}

/** Everyone's days used per type for the year: the leave balance register. */
export async function balances(kind, year = new Date().getFullYear()) {
  if (!['staff', 'student'].includes(kind)) throw badRequest('kind must be staff or student');
  const types = await listTypes({ kind });
  const leaves = await modelFor(kind).findAll({
    where: { status: 'approved', fromDate: { [Op.gte]: `${year}-01-01` }, toDate: { [Op.lte]: `${year}-12-31` }, leaveTypeId: { [Op.ne]: null } },
    attributes: [keyFor(kind), 'leaveTypeId', 'days'],
    raw: true,
  });
  const used = new Map();
  for (const l of leaves) {
    const k = `${l[keyFor(kind)]}:${l.leaveTypeId}`;
    used.set(k, (used.get(k) ?? 0) + Number(l.days));
  }
  const people = kind === 'staff'
    ? (await Staff.findAll({ where: { status: 'active' }, order: [['firstName', 'ASC']] })).map((s) => ({ id: s.id, no: s.staffNo, name: `${s.firstName} ${s.lastName}`, group: s.designation }))
    : (await Student.findAll({ where: { status: 'active' }, include: [{ model: SchoolClass, attributes: ['name', 'section'], required: false }], order: [['firstName', 'ASC']] }))
      .map((s) => ({ id: s.id, no: s.admissionNo, name: `${s.firstName} ${s.lastName}`, group: s.SchoolClass ? `${s.SchoolClass.name}-${s.SchoolClass.section}` : null }));
  return {
    year,
    types: types.map((t) => ({ id: t.id, name: t.name, yearlyDays: t.yearlyDays, paid: t.paid })),
    rows: people.map((p) => ({ ...p, used: Object.fromEntries(types.map((t) => [t.id, used.get(`${p.id}:${t.id}`) ?? 0])) })),
  };
}
