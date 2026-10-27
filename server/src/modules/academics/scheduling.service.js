import { Op } from 'sequelize';
import {
  LeaveRequest, Room, RoomBooking, SchoolClass, Staff, Subject, Substitution, TimetableSlot,
} from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { daysFromNow, today } from '../../utils/money.js';

const DAYS = 6; // Monday to Saturday
const PERIODS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const name = (s) => (s ? `${s.firstName} ${s.lastName}` : null);
const className = (c) => (c ? `${c.name}-${c.section}` : null);

/** Timetable day number for a date: Monday = 1 ... Sunday = 7. */
function weekday(date) {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw badRequest('Date is not valid');
  return d.getUTCDay() === 0 ? 7 : d.getUTCDay();
}

/* ---------- Rooms ---------- */

export async function listRooms() {
  const rooms = await Room.findAll({ order: [['name', 'ASC']] });
  const slots = await TimetableSlot.findAll({ where: { roomId: { [Op.ne]: null } }, attributes: ['roomId'] });
  const bookings = await RoomBooking.findAll({ where: { date: { [Op.gte]: today() } }, attributes: ['roomId'] });
  return rooms.map((r) => ({
    ...r.toJSON(),
    periodsPerWeek: slots.filter((s) => s.roomId === r.id).length,
    upcomingBookings: bookings.filter((b) => b.roomId === r.id).length,
  }));
}

export async function deleteRoom(id) {
  const room = await Room.findByPk(id);
  if (!room) throw notFound('Room not found');
  if (await TimetableSlot.count({ where: { roomId: id } })) throw conflict('This room is used in the timetable; clear it from those periods first');
  if (await RoomBooking.count({ where: { roomId: id } })) throw conflict('This room has bookings and cannot be deleted');
  await room.destroy();
}

/** One room's weekly timetable use plus its bookings from today on. */
export async function roomSchedule(id) {
  const room = await Room.findByPk(id);
  if (!room) throw notFound('Room not found');
  const [slots, bookings] = await Promise.all([
    TimetableSlot.findAll({
      where: { roomId: id },
      include: [{ model: SchoolClass, attributes: ['name', 'section'] }, { model: Subject, attributes: ['name'] }, { model: Staff, attributes: ['firstName', 'lastName'], required: false }],
      order: [['day', 'ASC'], ['period', 'ASC']],
    }),
    RoomBooking.findAll({ where: { roomId: id, date: { [Op.gte]: today() } }, order: [['date', 'ASC'], ['period', 'ASC']] }),
  ]);
  return {
    room: room.toJSON(),
    slots: slots.map((s) => ({ id: s.id, day: s.day, period: s.period, className: className(s.SchoolClass), subjectName: s.Subject?.name, teacherName: name(s.Staff) })),
    bookings: bookings.map((b) => b.toJSON()),
  };
}

export async function createBooking({ roomId, date, period, purpose }, bookedByName) {
  const room = await Room.findByPk(roomId);
  if (!room) throw notFound('Room not found');
  const p = Number(period);
  if (!Number.isInteger(p) || p < 1 || p > PERIODS) throw badRequest(`Period must be 1 to ${PERIODS}`);
  if (!String(purpose ?? '').trim()) throw badRequest('Purpose is required');
  if (!date || date < today()) throw badRequest('Choose today or a later date');
  const day = weekday(date);
  const lesson = await TimetableSlot.findOne({ where: { roomId, day, period: p }, include: [{ model: SchoolClass, attributes: ['name', 'section'] }] });
  if (lesson) throw conflict(`The room is used by ${className(lesson.SchoolClass)} in that period`);
  if (await RoomBooking.findOne({ where: { roomId, date, period: p } })) throw conflict('The room is already booked for that period');
  return (await RoomBooking.create({ roomId, date, period: p, purpose: purpose.trim(), bookedByName })).id;
}

export async function deleteBooking(id) {
  const booking = await RoomBooking.findByPk(id);
  if (!booking) throw notFound('Booking not found');
  await booking.destroy();
}

/* ---------- Substitutions ---------- */

async function onLeave(date) {
  const leaves = await LeaveRequest.findAll({
    where: { status: 'approved', fromDate: { [Op.lte]: date }, toDate: { [Op.gte]: date } }, attributes: ['staffId'],
  });
  return new Set(leaves.map((l) => l.staffId));
}

/** Active teachers with no lesson, no cover duty and no approved leave in that period of that date. */
export async function freeTeachers(date, period) {
  const day = weekday(date);
  const p = Number(period);
  if (!Number.isInteger(p) || p < 1) throw badRequest('Period is required');
  const [staff, busy, covering, away] = await Promise.all([
    Staff.findAll({ where: { status: 'active' }, order: [['firstName', 'ASC']] }),
    TimetableSlot.findAll({ where: { day, period: p, staffId: { [Op.ne]: null } }, attributes: ['staffId'] }),
    Substitution.findAll({ where: { date }, include: [{ model: TimetableSlot, where: { period: p }, attributes: [] }], attributes: ['substituteId'] }),
    onLeave(date),
  ]);
  const taken = new Set([...busy.map((s) => s.staffId), ...covering.map((s) => s.substituteId), ...away]);
  return staff.filter((s) => !taken.has(s.id)).map((s) => ({ id: s.id, name: name(s), staffNo: s.staffNo }));
}

const slotInclude = [
  { model: SchoolClass, attributes: ['name', 'section'] }, { model: Subject, attributes: ['name'] },
  { model: Staff, attributes: ['firstName', 'lastName'], required: false },
];
const subInclude = [{ model: Staff, as: 'Substitute', attributes: ['firstName', 'lastName'] }];

/** Periods of teachers on approved leave on `date`, with the cover already arranged (if any). */
export async function neededCover(date) {
  const day = weekday(date);
  const away = await onLeave(date);
  const slots = await TimetableSlot.findAll({ where: { day, staffId: { [Op.in]: [...away] } }, include: slotInclude, order: [['period', 'ASC']] });
  const subs = await Substitution.findAll({ where: { date }, include: subInclude });
  const bySlot = new Map(subs.map((s) => [s.slotId, s]));
  return slots.map((s) => {
    const sub = bySlot.get(s.id);
    return {
      slotId: s.id, period: s.period, className: className(s.SchoolClass), subjectName: s.Subject?.name, teacherName: name(s.Staff),
      substitution: sub ? { id: sub.id, substituteId: sub.substituteId, substituteName: name(sub.Substitute), reason: sub.reason } : null,
    };
  });
}

export async function assignSubstitute({ slotId, date, substituteId, reason }, createdByName) {
  const slot = await TimetableSlot.findByPk(slotId);
  if (!slot) throw notFound('Timetable period not found');
  if (!date || date < today()) throw badRequest('Choose today or a later date');
  if (weekday(date) !== slot.day) throw badRequest('That period is not taught on that day of the week');
  if (Number(substituteId) === slot.staffId) throw badRequest('The usual teacher cannot cover their own period');
  if (await Substitution.findOne({ where: { slotId, date } })) throw conflict('This period already has cover; remove it first');
  const free = await freeTeachers(date, slot.period);
  if (!free.some((t) => t.id === Number(substituteId))) throw conflict('That teacher is not free in this period (lesson, other cover, or on leave)');
  return (await Substitution.create({ slotId, date, substituteId, reason: reason || null, createdByName })).id;
}

export async function removeSubstitution(id) {
  const sub = await Substitution.findByPk(id);
  if (!sub) throw notFound('Substitution not found');
  if (sub.date < today()) throw conflict('Past cover is a record and cannot be removed');
  await sub.destroy();
}

export async function listSubstitutions({ from, to } = {}) {
  const start = from || daysFromNow(-30);
  const rows = await Substitution.findAll({
    where: { date: { [Op.gte]: start, ...(to && { [Op.lte]: to }) } },
    include: [...subInclude, { model: TimetableSlot, include: slotInclude }],
    order: [['date', 'DESC'], ['id', 'DESC']],
  });
  return rows.map((s) => ({
    id: s.id, date: s.date, period: s.TimetableSlot.period, className: className(s.TimetableSlot.SchoolClass), subjectName: s.TimetableSlot.Subject?.name,
    teacherName: name(s.TimetableSlot.Staff), substituteName: name(s.Substitute), reason: s.reason, removable: s.date >= today(),
  }));
}

/* ---------- Report ---------- */

export async function timetableReport() {
  const [slots, staff, rooms, classes, subs] = await Promise.all([
    TimetableSlot.findAll({ include: slotInclude }),
    Staff.findAll({ where: { status: 'active' } }),
    Room.findAll({ order: [['name', 'ASC']] }),
    SchoolClass.findAll({ order: [['name', 'ASC'], ['section', 'ASC']] }),
    Substitution.findAll({ where: { date: { [Op.gte]: daysFromNow(-30) } } }),
  ]);
  const capacity = DAYS * PERIODS;
  const covered = new Map();
  subs.forEach((s) => covered.set(s.substituteId, (covered.get(s.substituteId) ?? 0) + 1));
  return {
    periodsPerWeek: capacity,
    teacherLoad: staff
      .map((s) => ({ id: s.id, name: name(s), periods: slots.filter((x) => x.staffId === s.id).length, coverLast30Days: covered.get(s.id) ?? 0 }))
      .sort((a, b) => b.periods - a.periods),
    classes: classes.map((c) => ({ id: c.id, name: className(c), periods: slots.filter((x) => x.classId === c.id).length })),
    unassigned: slots.filter((s) => !s.staffId).map((s) => ({ id: s.id, className: className(s.SchoolClass), subjectName: s.Subject?.name, day: s.day, period: s.period })),
    rooms: rooms.map((r) => {
      const used = slots.filter((x) => x.roomId === r.id).length;
      return { id: r.id, name: r.name, kind: r.kind, periods: used, utilisationPercent: Math.round((used / capacity) * 1000) / 10 };
    }),
    substitutionsLast30Days: subs.length,
  };
}
