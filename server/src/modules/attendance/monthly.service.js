import { Op } from 'sequelize';
import {
  Attendance,
  CalendarEvent,
  LeaveRequest,
  LeaveType,
  SchoolClass,
  Staff,
  StaffAttendance,
  Student,
  StudentLeave,
} from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';
import { saveRecords } from '../academics/attendance.service.js';
import { saveAttendance } from '../hr/hr.service.js';

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function bounds(month) {
  const m = MONTH.exec(month ?? '');
  if (!m) throw badRequest('month must look like 2026-10');
  const days = new Date(Number(m[1]), Number(m[2]), 0).getDate();
  return { days, from: `${month}-01`, to: `${month}-${String(days).padStart(2, '0')}` };
}

/** One row per person: the mark for each day of the month plus totals. Late counts as attended; the percentage is over the days marked. */
function register(people, marks, leaves, { days, month }) {
  const byPerson = new Map();
  const details = new Map();
  for (const m of marks) {
    if (!byPerson.has(m.id)) byPerson.set(m.id, {});
    byPerson.get(m.id)[Number(m.date.slice(8))] = m.status;
    if (m.arrivalTime || m.outTime || m.note) {
      if (!details.has(m.id)) details.set(m.id, {});
      details.get(m.id)[Number(m.date.slice(8))] = {
        in: m.arrivalTime ?? null,
        out: m.outTime ?? null,
        note: m.note ?? null,
      };
    }
  }
  return {
    month,
    days,
    rows: people.map((p) => {
      const day = { ...(byPerson.get(p.id) ?? {}) };
      // an approved leave excuses a day nobody marked, and a day marked absent
      const onLeave = leaves.get(p.id) ?? new Map();
      for (const [d, info] of onLeave)
        if (!day[d] || day[d] === 'absent') day[d] = info.half ? 'half' : 'leave';
      const values = Object.values(day);
      const count = (s) => values.filter((v) => v === s).length;
      const attended = count('present') + count('late') + count('half') * 0.5; // half a day on leave: the other half was worked
      return {
        ...p,
        marks: day,
        details: details.get(p.id) ?? {}, // day -> { in, note }
        leaveTypes: Object.fromEntries([...onLeave].map(([d, info]) => [d, info.name])), // day -> leave type name
        present: count('present'),
        late: count('late'),
        absent: count('absent'),
        leave: count('leave') + count('half') * 0.5,
        marked: values.length,
        percentage: values.length ? Math.round((attended / values.length) * 1000) / 10 : null,
      };
    }),
  };
}

/** person id -> (day number -> leave type name) for the days of the month covered by an approved leave. */
function leaveDays(leaves, idKey, { from, to }, typeNames) {
  const out = new Map();
  for (const l of leaves) {
    const set = out.get(l[idKey]) ?? new Map();
    for (let d = Number(from.slice(8)); d <= Number(to.slice(8)); d += 1) {
      const date = `${from.slice(0, 8)}${String(d).padStart(2, '0')}`;
      if (l.dayPart !== 'time' && date >= l.fromDate && date <= l.toDate)
        set.set(d, {
          name: typeNames.get(l.leaveTypeId) ?? 'Leave',
          half: l.dayPart === 'first_half' || l.dayPart === 'second_half',
        });
    }
    out.set(l[idKey], set);
  }
  return out;
}

/**
 * Days nobody is expected: Sundays are the weekly off ("W"); holidays from the academic calendar are "H" with their title.
 * A holiday for staff only does not apply to students and the other way round.
 */
async function offDays({ from, to, days }, month, audience) {
  const out = {};
  for (let d = 1; d <= days; d += 1)
    if (new Date(`${month}-${String(d).padStart(2, '0')}T00:00:00`).getDay() === 0)
      out[d] = { code: 'W', label: 'Weekly off' };
  const events = await CalendarEvent.findAll({
    where: {
      type: 'holiday',
      audience: { [Op.in]: ['all', audience] },
      startDate: { [Op.lte]: to },
      endDate: { [Op.gte]: from },
    },
    attributes: ['title', 'startDate', 'endDate'],
    raw: true,
  });
  for (const e of events) {
    for (let d = 1; d <= days; d += 1) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      if (date >= e.startDate && date <= e.endDate) out[d] = { code: 'H', label: e.title };
    }
  }
  return out;
}

const typeNames = async () =>
  new Map((await LeaveType.findAll({ attributes: ['id', 'name'] })).map((t) => [t.id, t.name]));

export async function studentMonthly(month, classId) {
  const range = bounds(month);
  const students = await Student.findAll({
    where: { status: 'active', ...(classId && { classId }) },
    include: [{ model: SchoolClass, attributes: ['name', 'section'], required: false }],
    order: [['firstName', 'ASC']],
  });
  const marks = students.length
    ? await Attendance.findAll({
        where: { studentId: students.map((s) => s.id), date: { [Op.between]: [range.from, range.to] } },
        attributes: ['studentId', 'date', 'status', 'arrivalTime', 'outTime', 'note'],
        raw: true,
      })
    : [];
  const leaves = students.length
    ? await StudentLeave.findAll({
        where: {
          studentId: students.map((x) => x.id),
          status: 'approved',
          fromDate: { [Op.lte]: range.to },
          toDate: { [Op.gte]: range.from },
        },
        attributes: ['studentId', 'leaveTypeId', 'fromDate', 'toDate', 'dayPart'],
        raw: true,
      })
    : [];
  return {
    ...register(
      students.map((s) => ({
        id: s.id,
        no: s.admissionNo,
        name: `${s.firstName} ${s.lastName}`,
        className: s.SchoolClass ? `${s.SchoolClass.name}-${s.SchoolClass.section}` : null,
      })),
      marks.map((m) => ({
        id: m.studentId,
        date: String(m.date),
        status: m.status,
        arrivalTime: m.arrivalTime,
        outTime: m.outTime,
        note: m.note,
      })),
      leaveDays(leaves, 'studentId', range, await typeNames()),
      { ...range, month },
    ),
    offs: await offDays(range, month, 'parents'),
  };
}

export async function staffMonthly(month, category) {
  const range = bounds(month);
  const staff = await Staff.findAll({
    where: { status: 'active', ...(category && { staffCategory: category }) },
    order: [['firstName', 'ASC']],
  });
  const marks = staff.length
    ? await StaffAttendance.findAll({
        where: { staffId: staff.map((s) => s.id), date: { [Op.between]: [range.from, range.to] } },
        attributes: ['staffId', 'date', 'status'],
        raw: true,
      })
    : [];
  const leaves = staff.length
    ? await LeaveRequest.findAll({
        where: {
          staffId: staff.map((x) => x.id),
          status: 'approved',
          fromDate: { [Op.lte]: range.to },
          toDate: { [Op.gte]: range.from },
        },
        attributes: ['staffId', 'leaveTypeId', 'fromDate', 'toDate', 'dayPart'],
        raw: true,
      })
    : [];
  return {
    ...register(
      staff.map((s) => ({
        id: s.id,
        no: s.staffNo,
        name: `${s.firstName} ${s.lastName}`,
        designation: s.designation,
        category: s.staffCategory ?? null,
      })),
      marks.map((m) => ({ id: m.staffId, date: String(m.date), status: m.status })),
      leaveDays(leaves, 'staffId', range, await typeNames()),
      { ...range, month },
    ),
    offs: await offDays(range, month, 'staff'),
  };
}

/** Validates edits made on the register: [{ id, date, status }] inside one month, none in the future. */
function checkChanges(month, changes, statuses) {
  bounds(month);
  if (!Array.isArray(changes) || !changes.length) throw badRequest('Nothing to save');
  for (const c of changes) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c?.date ?? '') || !c.date.startsWith(month))
      throw badRequest('Every change must be a day of the chosen month');
    if (c.date > today()) throw badRequest('Attendance cannot be marked for a future date');
    if (!statuses.includes(c.status)) throw badRequest(`Status must be one of: ${statuses.join(', ')}`);
  }
  const byDate = new Map();
  for (const c of changes) byDate.set(c.date, [...(byDate.get(c.date) ?? []), c]);
  return byDate;
}

/** Saves edits to student marks, one day at a time through the normal flow, so corrections are logged and past changes need a reason. */
export async function saveStudentMonthly({ month, changes, reason }, user) {
  const byDate = checkChanges(month, changes, ['present', 'absent', 'late']);
  let saved = 0;
  let corrected = 0;
  for (const [date, list] of [...byDate].sort()) {
    // changing a status must not wipe the arrival time or note already on the mark
    const existing = new Map(
      (
        await Attendance.findAll({
          where: { date, studentId: list.map((c) => c.id) },
          attributes: ['studentId', 'arrivalTime', 'note'],
          raw: true,
        })
      ).map((a) => [a.studentId, a]),
    );
    const out = await saveRecords(
      date,
      list.map((c) => ({
        studentId: c.id,
        status: c.status,
        arrivalTime: existing.get(c.id)?.arrivalTime ?? undefined,
        note: c.note ? String(c.note).slice(0, 120) : (existing.get(c.id)?.note ?? undefined),
      })),
      { reason, user },
    );
    saved += out.saved;
    corrected += out.corrected;
  }
  return { saved, corrected };
}

export async function saveStaffMonthly({ month, changes }) {
  const byDate = checkChanges(month, changes, ['present', 'late', 'absent', 'leave']);
  for (const [date, list] of [...byDate].sort())
    await saveAttendance({ date, records: list.map((c) => ({ staffId: c.id, status: c.status })) });
  return { saved: changes.length };
}
