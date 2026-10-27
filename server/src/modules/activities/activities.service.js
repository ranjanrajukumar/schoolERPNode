import { Op } from 'sequelize';
import { Activity, ActivityParticipant, SchoolClass, Student, sequelize } from '../../models/index.js';
import { ACTIVITY_KINDS, ACTIVITY_STATUSES } from '../../models/activity.model.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { toCents } from '../../utils/money.js';
import { billStudents } from '../finance/fees.service.js';

export const KIND_LABEL = {
  event: 'Event', celebration: 'Celebration', competition: 'Competition', sport: 'Sport', field_trip: 'Field trip', club: 'Club',
};

const FIELDS = ['kind', 'title', 'description', 'venue', 'startDate', 'endDate', 'classId', 'capacity', 'fee', 'requiresConsent', 'organizer'];
const blankToNull = (v) => (v === '' ? null : v);
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, blankToNull(body[f])]));

/** Registration is open only while an activity is planned or open. */
const ACCEPTING = ['planned', 'open'];

/** Allowed status moves; a completed activity is final. */
const TRANSITIONS = {
  planned: ['open', 'cancelled'],
  open: ['planned', 'completed', 'cancelled'],
  completed: [],
  cancelled: ['planned'],
};

function shape(a, counts) {
  return {
    id: a.id,
    kind: a.kind,
    kindLabel: KIND_LABEL[a.kind],
    title: a.title,
    description: a.description,
    venue: a.venue,
    startDate: a.startDate,
    endDate: a.endDate,
    classId: a.classId,
    className: a.SchoolClass ? `${a.SchoolClass.name}-${a.SchoolClass.section}` : null,
    capacity: a.capacity,
    fee: a.fee,
    requiresConsent: a.requiresConsent,
    status: a.status,
    organizer: a.organizer,
    nextStatuses: TRANSITIONS[a.status],
    ...(counts && counts),
  };
}

const countsOf = (participants) => ({
  registered: participants.length,
  attended: participants.filter((p) => p.status === 'attended').length,
  consentPending: participants.filter((p) => p.consent === 'pending').length,
});

export async function listActivities({ kind, status, classId, from, to } = {}) {
  const rows = await Activity.findAll({
    where: {
      ...(kind && { kind }),
      ...(status && { status }),
      ...(classId && { classId }),
      ...(from && { endDate: { [Op.gte]: from } }),
      ...(to && { startDate: { [Op.lte]: to } }),
    },
    include: [SchoolClass, { model: ActivityParticipant, attributes: ['status', 'consent'] }],
    order: [['startDate', 'DESC'], ['id', 'DESC']],
    limit: 300,
  });
  return rows.map((a) => shape(a, countsOf(a.ActivityParticipants)));
}

function validate(data, { partial = false } = {}) {
  if (!partial || data.kind !== undefined) {
    if (!ACTIVITY_KINDS.includes(data.kind)) throw badRequest(`Kind must be one of ${ACTIVITY_KINDS.join(', ')}`);
  }
  if (!partial || data.title !== undefined) {
    if (!String(data.title ?? '').trim()) throw badRequest('Title is required');
  }
  if (!partial && !data.startDate) throw badRequest('Start date is required');
  if (data.fee !== undefined && data.fee !== null && (Number.isNaN(Number(data.fee)) || Number(data.fee) < 0)) throw badRequest('Fee cannot be negative');
}

export async function createActivity(body, userId) {
  const data = pick(body);
  validate(data);
  data.endDate = data.endDate || data.startDate;
  if (data.endDate < data.startDate) throw badRequest('The end date cannot be before the start date');
  if (data.classId && !(await SchoolClass.findByPk(data.classId))) throw notFound('Class not found');
  // Field trips need parental consent by default; the form can still switch it off.
  if (data.requiresConsent === undefined && data.kind === 'field_trip') data.requiresConsent = true;
  return (await Activity.create({ ...data, title: data.title.trim(), createdBy: userId })).id;
}

export async function updateActivity(id, body) {
  const activity = await Activity.findByPk(id);
  if (!activity) throw notFound('Activity not found');
  if (activity.status === 'completed') throw conflict('A completed activity cannot be edited');
  const data = pick(body);
  validate(data, { partial: true });
  const start = data.startDate ?? activity.startDate;
  const end = data.endDate ?? activity.endDate;
  if (end < start) throw badRequest('The end date cannot be before the start date');

  if (data.capacity !== undefined && data.capacity !== null) {
    const taken = await ActivityParticipant.count({ where: { activityId: id } });
    if (Number(data.capacity) < taken) throw conflict(`${taken} students are already registered, so capacity cannot go below that`);
  }
  // Switching consent on after students are registered would leave them without a consent state.
  if (data.requiresConsent !== undefined && Boolean(data.requiresConsent) !== activity.requiresConsent
      && await ActivityParticipant.count({ where: { activityId: id } })) {
    throw conflict('Consent cannot be switched after students are registered');
  }
  await activity.update(data);
}

export async function setStatus(id, status) {
  if (!ACTIVITY_STATUSES.includes(status)) throw badRequest('Status is invalid');
  const activity = await Activity.findByPk(id);
  if (!activity) throw notFound('Activity not found');
  if (!TRANSITIONS[activity.status].includes(status)) throw conflict(`Cannot move from ${activity.status} to ${status}`);
  await activity.update({ status });
}

/** An activity with attendance recorded is part of the school's history and is kept. */
export async function deleteActivity(id) {
  const activity = await Activity.findByPk(id);
  if (!activity) throw notFound('Activity not found');
  if (await ActivityParticipant.count({ where: { activityId: id, status: { [Op.ne]: 'registered' } } })) {
    throw conflict('Attendance has been recorded for this activity, so it cannot be deleted. Cancel it instead.');
  }
  await activity.destroy();
}

/* ---------- Participants ---------- */

async function loadActivity(id, transaction) {
  const activity = await Activity.findByPk(id, { transaction });
  if (!activity) throw notFound('Activity not found');
  return activity;
}

export async function getParticipants(id) {
  const activity = await Activity.findByPk(id, { include: [SchoolClass] });
  if (!activity) throw notFound('Activity not found');
  const rows = await ActivityParticipant.findAll({
    where: { activityId: id },
    include: [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo', 'classId'], include: [SchoolClass] }],
    order: [[Student, 'firstName', 'ASC']],
  });
  const participants = rows.map((p) => ({
    studentId: p.studentId,
    name: `${p.Student.firstName} ${p.Student.lastName}`,
    admissionNo: p.Student.admissionNo,
    className: p.Student.SchoolClass ? `${p.Student.SchoolClass.name}-${p.Student.SchoolClass.section}` : null,
    status: p.status,
    consent: p.consent,
    result: p.result,
    remarks: p.remarks,
  }));
  return { activity: shape(activity, countsOf(rows)), participants };
}

/**
 * Registers students, given directly or as a whole class. Students already registered are skipped,
 * only active students are accepted, a class-only activity takes only its own class, and capacity is a hard limit.
 */
export async function register(id, { studentIds, classId }) {
  return sequelize.transaction(async (transaction) => {
    const activity = await Activity.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!activity) throw notFound('Activity not found');
    if (!ACCEPTING.includes(activity.status)) throw conflict(`Registration is closed for a ${activity.status} activity`);

    const where = { status: 'active' };
    if (Array.isArray(studentIds) && studentIds.length) where.id = studentIds;
    else if (classId) where.classId = classId;
    else throw badRequest('Choose students or a class');
    const students = await Student.findAll({ where, transaction });
    if (Array.isArray(studentIds) && students.length !== new Set(studentIds.map(Number)).size) {
      throw badRequest('Every student must exist and be active');
    }
    if (activity.classId && students.some((s) => s.classId !== activity.classId)) {
      throw badRequest('This activity is only for its own class');
    }

    const existing = new Set((await ActivityParticipant.findAll({ where: { activityId: id }, attributes: ['studentId'], transaction })).map((p) => p.studentId));
    const fresh = students.filter((s) => !existing.has(s.id));
    if (activity.capacity && existing.size + fresh.length > activity.capacity) {
      throw conflict(`Only ${Math.max(activity.capacity - existing.size, 0)} place(s) left (capacity ${activity.capacity})`);
    }

    await ActivityParticipant.bulkCreate(fresh.map((s) => ({
      activityId: id, studentId: s.id, consent: activity.requiresConsent ? 'pending' : 'not_required',
    })), { transaction });
    return { registered: fresh.length, skipped: students.length - fresh.length };
  });
}

export async function withdraw(id, studentId) {
  const p = await ActivityParticipant.findOne({ where: { activityId: id, studentId } });
  if (!p) throw notFound('That student is not registered');
  if (p.status !== 'registered') throw conflict('Attendance is already recorded for this student');
  await p.destroy();
}

/** Marks who turned up. A trip that needs consent cannot take a child whose parent has not agreed. */
export async function markAttendance(id, records = []) {
  if (!Array.isArray(records) || !records.length) throw badRequest('records must be a non-empty list');
  if (records.some((r) => !['attended', 'absent', 'registered'].includes(r.status))) throw badRequest('Status must be attended, absent or registered');

  await sequelize.transaction(async (transaction) => {
    const activity = await loadActivity(id, transaction);
    if (!['open', 'completed'].includes(activity.status)) throw conflict('Attendance can be recorded once the activity is open');
    const rows = await ActivityParticipant.findAll({ where: { activityId: id, studentId: records.map((r) => r.studentId) }, transaction });
    const byStudent = new Map(rows.map((p) => [p.studentId, p]));
    for (const r of records) {
      const p = byStudent.get(Number(r.studentId));
      if (!p) throw badRequest('Every student must be registered for this activity');
      if (r.status === 'attended' && activity.requiresConsent && p.consent !== 'given') {
        throw conflict(`${p.studentId}: consent has not been given, so this child cannot be marked as attended`);
      }
      await p.update({ status: r.status }, { transaction });
    }
  });
  return records.length;
}

/** A result (such as "1st place") only makes sense for someone who actually took part. */
export async function setResult(id, studentId, { result, remarks }) {
  const p = await ActivityParticipant.findOne({ where: { activityId: id, studentId } });
  if (!p) throw notFound('That student is not registered');
  if (p.status !== 'attended') throw conflict('Mark the student as attended before recording a result');
  if (String(result ?? '').length > 80) throw badRequest('Result must be 80 characters or fewer');
  await p.update({ result: result?.trim() || null, remarks: remarks?.trim() || null });
}

/** Consent comes from the parent (portal) or from staff holding the signed form. */
export async function setConsent(id, studentId, consent) {
  if (!['given', 'declined', 'pending'].includes(consent)) throw badRequest('Consent must be given, declined or pending');
  const p = await ActivityParticipant.findOne({ where: { activityId: id, studentId }, include: [Activity] });
  if (!p) throw notFound('That student is not registered');
  if (!p.Activity.requiresConsent) throw conflict('This activity does not need consent');
  if (p.status === 'attended' && consent !== 'given') throw conflict('This student has already attended');
  if (['completed', 'cancelled'].includes(p.Activity.status)) throw conflict(`The activity is ${p.Activity.status}`);
  await p.update({ consent });
}

/**
 * Bills the activity fee to every participant who is going: consent given (or not needed) and not absent.
 * The bill is an ordinary fee, so it is collected, receipted and reported like any other. Safe to repeat.
 */
export async function billParticipants(id) {
  const activity = await Activity.findByPk(id);
  if (!activity) throw notFound('Activity not found');
  if (toCents(activity.fee) <= 0) throw badRequest('This activity has no fee');
  if (activity.status === 'cancelled') throw conflict('The activity is cancelled');

  const going = await ActivityParticipant.findAll({
    where: { activityId: id, status: { [Op.ne]: 'absent' }, consent: { [Op.in]: ['not_required', 'given'] } },
  });
  const title = `Activity: ${activity.title}`.slice(0, 120);
  return sequelize.transaction((transaction) => billStudents(
    going.map((p) => p.studentId), { title, amount: activity.fee, dueDate: activity.startDate }, transaction,
  ));
}

/* ---------- Views for students, calendar and reports ---------- */

/** What a student has taken part in, newest first, for the profile and the parent portal. */
export async function activitiesForStudent(studentId) {
  const rows = await ActivityParticipant.findAll({
    where: { studentId },
    include: [{ model: Activity, required: true }],
    order: [[Activity, 'startDate', 'DESC']],
  });
  return rows.map((p) => ({
    activityId: p.activityId,
    title: p.Activity.title,
    kind: p.Activity.kind,
    kindLabel: KIND_LABEL[p.Activity.kind],
    startDate: p.Activity.startDate,
    endDate: p.Activity.endDate,
    venue: p.Activity.venue,
    fee: p.Activity.fee,
    activityStatus: p.Activity.status,
    requiresConsent: p.Activity.requiresConsent,
    status: p.status,
    consent: p.consent,
    result: p.result,
  }));
}

/** Participation across the school for a date range: per-kind totals, per-activity turnout and the achievements list. */
export async function summary({ from, to } = {}) {
  const activities = await Activity.findAll({
    where: {
      status: { [Op.ne]: 'cancelled' },
      ...(from && { endDate: { [Op.gte]: from } }),
      ...(to && { startDate: { [Op.lte]: to } }),
    },
    include: [{ model: ActivityParticipant, include: [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] }] }],
    order: [['startDate', 'DESC']],
  });

  const byKind = {};
  const students = new Map();
  const achievements = [];
  const perActivity = activities.map((a) => {
    const attended = a.ActivityParticipants.filter((p) => p.status === 'attended').length;
    const k = byKind[a.kind] ?? { kind: a.kind, label: KIND_LABEL[a.kind], activities: 0, participants: 0, attended: 0 };
    k.activities += 1; k.participants += a.ActivityParticipants.length; k.attended += attended;
    byKind[a.kind] = k;

    for (const p of a.ActivityParticipants) {
      if (p.status === 'attended') {
        const s = students.get(p.studentId) ?? { studentId: p.studentId, name: `${p.Student.firstName} ${p.Student.lastName}`, admissionNo: p.Student.admissionNo, count: 0 };
        s.count += 1;
        students.set(p.studentId, s);
      }
      if (p.result) achievements.push({ studentName: `${p.Student.firstName} ${p.Student.lastName}`, admissionNo: p.Student.admissionNo, activity: a.title, kindLabel: KIND_LABEL[a.kind], date: a.startDate, result: p.result });
    }
    return {
      id: a.id, title: a.title, kindLabel: KIND_LABEL[a.kind], startDate: a.startDate, status: a.status,
      registered: a.ActivityParticipants.length, attended,
      turnoutPercent: a.ActivityParticipants.length ? Math.round((attended / a.ActivityParticipants.length) * 1000) / 10 : null,
    };
  });

  return {
    byKind: Object.values(byKind),
    activities: perActivity,
    mostActive: [...students.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    achievements,
  };
}
