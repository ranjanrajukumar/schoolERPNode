import { Op } from 'sequelize';
import { Department, Feedback, FeedbackLog, SchoolClass, Staff, Student, User } from '../../models/index.js';
import { FEEDBACK_CATEGORIES, FEEDBACK_KINDS, FEEDBACK_STATUSES } from '../../models/feedback.model.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/httpError.js';
import { nextNumber } from '../../utils/numbering.js';
import { getSetting } from '../settings/settings.service.js';
import { notifyUsers } from '../push/push.service.js';

const PRIORITIES = ['low', 'normal', 'high'];
const OPEN = ['open', 'in_progress'];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The grievance ladder. A grievance starts with the person closest to it and moves up when it is not settled:
 * 1 = the student's class teacher (or the department head, for a staff member's grievance), 2 = the school office (admin), 3 = the principal.
 * Feedback (suggestions and praise) goes straight to the office.
 */
export const LEVELS = [
  { level: 1, label: 'Class teacher / department head', short: 'L1' },
  { level: 2, label: 'School office', short: 'L2' },
  { level: 3, label: 'Principal', short: 'L3' },
];
const levelLabel = (n) => LEVELS.find((l) => l.level === n)?.label ?? '';

export const meta = async () => ({ levels: LEVELS, escalateAfterDays: await getSetting('grievance.escalateAfterDays') });

const withDetail = [
  { model: Student, attributes: ['firstName', 'lastName', 'classId'], required: false, include: [{ model: SchoolClass, attributes: ['name', 'section', 'classTeacherId'], required: false }] },
  { model: FeedbackLog, required: false },
];

/** The user (login) who handles level 1 of this item: a student's class teacher, or the head of a staff member's department. */
async function levelOneHandler(f) {
  let staffId = null;
  if (f.studentId) {
    const student = f.Student ?? await Student.findByPk(f.studentId, { include: [SchoolClass] });
    staffId = student?.SchoolClass?.classTeacherId ?? null;
  } else if (f.submittedByRole === 'staff') {
    const sender = await User.findByPk(f.submittedByUserId, { attributes: ['staffId'] });
    const person = sender?.staffId ? await Staff.findByPk(sender.staffId, { attributes: ['id', 'departmentId'] }) : null;
    const dept = person?.departmentId ? await Department.findByPk(person.departmentId, { attributes: ['headStaffId'] }) : null;
    if (dept?.headStaffId && dept.headStaffId !== person.id) staffId = dept.headStaffId;
  }
  return staffId;
}

/** Whether this signed-in user may act on the item at its current level. An admin can act at any level. */
async function canAct(user, f) {
  if (user.role === 'admin') return true;
  if (f.kind !== 'grievance' || f.level !== 1 || !user.staffId) return false;
  return (await levelOneHandler(f)) === user.staffId && f.submittedByUserId !== user.id;
}

/** What a reader sees: an anonymous sender, and the child, are hidden from everyone but the sender, whoever is handling it. */
async function shape(f, user, { own }) {
  const hide = f.anonymous && !own;
  const acting = user ? await canAct(user, f) : false;
  return {
    id: f.id,
    ticketNo: f.ticketNo,
    kind: f.kind,
    category: f.category,
    subject: f.subject,
    details: f.details,
    rating: f.rating,
    anonymous: f.anonymous,
    submittedByName: hide ? 'Anonymous' : f.submittedByName,
    submittedByRole: hide ? null : f.submittedByRole,
    studentName: hide || !f.Student ? null : `${f.Student.firstName} ${f.Student.lastName}`,
    className: hide || !f.Student?.SchoolClass ? null : `${f.Student.SchoolClass.name}-${f.Student.SchoolClass.section}`,
    status: f.status,
    priority: f.priority,
    level: f.level,
    levelLabel: levelLabel(f.level),
    canAct: acting && !['resolved', 'closed'].includes(f.status),
    canEscalate: acting && f.kind === 'grievance' && f.level < 3 && !['resolved', 'closed'].includes(f.status),
    response: f.response,
    respondedByName: f.respondedByName,
    respondedOn: f.respondedOn,
    createdAt: f.createdAt,
    timeline: (f.FeedbackLogs ?? []).sort((a, b) => a.id - b.id).map((l) => ({ action: l.action, level: l.level, levelLabel: levelLabel(l.level), note: l.note, by: l.byName, at: l.createdAt })),
  };
}

async function nextTicket() {
  return nextNumber({ model: Feedback, field: 'ticketNo', formula: await getSetting('numbering.grievance') });
}

const log = (feedbackId, action, level, note, byName) => FeedbackLog.create({ feedbackId, action, level, note: note ? String(note).slice(0, 500) : null, byName: byName ?? null });

/** Tells whoever handles this level that something is waiting: the level-1 person, or the admins. */
async function notifyLevel(f, title) {
  let ids = [];
  if (f.level === 1) {
    const staffId = await levelOneHandler(f);
    const handler = staffId ? await User.findOne({ where: { staffId }, attributes: ['id'] }) : null;
    if (handler) ids = [handler.id];
  }
  if (!ids.length) ids = (await User.findAll({ where: { role: 'admin' }, attributes: ['id'] })).map((a) => a.id);
  await notifyUsers(ids, { title, body: `${f.ticketNo}: ${f.subject}`, url: '/feedback' });
}

/** Saves a new item. `sender` is { id, name, role } where role is parent | student | staff. */
export async function submit({ kind, category, subject, details, rating, anonymous, studentId }, sender) {
  if (!FEEDBACK_KINDS.includes(kind)) throw badRequest('Choose feedback or grievance');
  if (!FEEDBACK_CATEGORIES.includes(category)) throw badRequest('Choose a category');
  if (!String(subject ?? '').trim()) throw badRequest('A subject is required');
  if (String(subject).trim().length > 150) throw badRequest('The subject can be at most 150 characters');
  if (!String(details ?? '').trim()) throw badRequest('Please describe it');
  if (String(details).length > 3000) throw badRequest('The description can be at most 3000 characters');
  const stars = rating === undefined || rating === null || rating === '' ? null : Number(rating);
  if (stars !== null && (!Number.isInteger(stars) || stars < 1 || stars > 5)) throw badRequest('Rating must be from 1 to 5');

  const row = await Feedback.create({
    ticketNo: await nextTicket(),
    kind,
    category,
    subject: subject.trim(),
    details: details.trim(),
    rating: kind === 'feedback' ? stars : null,
    anonymous: anonymous === true || anonymous === 'true',
    submittedByUserId: sender.id,
    submittedByName: sender.name,
    submittedByRole: sender.role,
    studentId: studentId || null,
    priority: kind === 'grievance' ? 'high' : 'normal',
    level: 2,
    lastActionOn: new Date(),
  });
  // a grievance starts at level 1 when there is someone there to handle it; otherwise it goes to the office
  if (kind === 'grievance' && (await levelOneHandler(row))) await row.update({ level: 1 });
  await log(row.id, 'submitted', row.level, null, row.anonymous ? null : sender.name);
  await notifyLevel(row, kind === 'grievance' ? 'New grievance' : 'New feedback');
  return { id: row.id, ticketNo: row.ticketNo, level: row.level, levelLabel: levelLabel(row.level) };
}

/** Moves an untouched grievance up a level once it has waited too long. Runs whenever the lists are read. */
export async function autoEscalate() {
  const days = await getSetting('grievance.escalateAfterDays');
  if (!days) return;
  const cutoff = new Date(Date.now() - days * DAY_MS);
  const stale = await Feedback.findAll({ where: { kind: 'grievance', status: { [Op.in]: OPEN }, level: { [Op.lt]: 3 }, lastActionOn: { [Op.lt]: cutoff } } });
  for (const f of stale) {
    await f.update({ level: f.level + 1, lastActionOn: new Date() });
    await log(f.id, 'auto_escalated', f.level, `No reply for ${days} day${days === 1 ? '' : 's'}`, null);
    await notifyLevel(f, 'Grievance escalated to you');
    await notifyUsers([f.submittedByUserId], { title: `${f.ticketNo}: escalated`, body: `Moved up to ${levelLabel(f.level)}.`, url: f.submittedByRole === 'staff' ? '/feedback' : '/portal?tab=Feedback' });
  }
}

/** Admin: everything. A level-1 handler (class teacher or department head): what is waiting with them. Anyone: what they sent. */
export async function list(user, { kind, status } = {}) {
  await autoEscalate();
  const admin = user.role === 'admin';
  const rows = await Feedback.findAll({
    where: { ...(admin ? {} : { [Op.or]: [{ submittedByUserId: user.id }, { kind: 'grievance', level: 1 }] }), ...(kind && { kind }), ...(status && { status }) },
    include: withDetail,
    order: [['id', 'DESC']],
    limit: 500,
  });
  const out = [];
  for (const f of rows) {
    const mine = f.submittedByUserId === user.id;
    if (!admin && !mine && !(await canAct(user, f))) continue; // a level-1 grievance of somebody else's class stays hidden
    out.push(await shape(f, user, { own: mine }));
  }
  return out;
}

/** What one portal user sent (optionally about one child). */
export async function listOwn(userId, studentId) {
  await autoEscalate();
  const rows = await Feedback.findAll({ where: { submittedByUserId: userId, ...(studentId && { studentId }) }, include: withDetail, order: [['id', 'DESC']], limit: 100 });
  return Promise.all(rows.map((f) => shape(f, null, { own: true })));
}

async function load(id, user) {
  const row = await Feedback.findByPk(id, { include: withDetail });
  if (!row) throw notFound('Not found');
  if (!(await canAct(user, row))) throw forbidden('This item is not with you at the moment');
  return row;
}

/** A handler's reply: status, priority and a response the sender can read. */
export async function respond(id, { status, priority, response }, user) {
  const row = await load(id, user);
  if (status && !FEEDBACK_STATUSES.includes(status)) throw badRequest('Status is invalid');
  if (priority && !PRIORITIES.includes(priority)) throw badRequest('Priority is invalid');
  const text = response === undefined ? row.response : String(response).trim() || null;
  if (['resolved', 'closed'].includes(status ?? row.status) && !text) throw badRequest('Write a response before resolving or closing');
  const replied = text !== row.response;
  const statusChanged = status && status !== row.status;
  await row.update({
    ...(status && { status }),
    ...(priority && user.role === 'admin' && { priority }),
    response: text,
    lastActionOn: new Date(),
    ...(replied && { respondedByName: user.name, respondedOn: new Date() }),
  });
  if (replied) await log(row.id, 'replied', row.level, text, user.name);
  if (statusChanged) await log(row.id, 'status', row.level, `Marked ${status.replace('_', ' ')}`, user.name);
  await notifyUsers([row.submittedByUserId], {
    title: `${row.ticketNo}: ${row.status === 'resolved' ? 'resolved' : row.status === 'closed' ? 'closed' : row.status === 'in_progress' ? 'being looked into' : 'update'}`,
    body: text ? text.slice(0, 140) : row.subject,
    url: row.submittedByRole === 'staff' ? '/feedback' : '/portal?tab=Feedback',
  });
}

/** Passes a grievance up to the next level with a reason. */
export async function escalate(id, { note }, user) {
  const row = await load(id, user);
  if (row.kind !== 'grievance') throw badRequest('Only a grievance can be escalated');
  if (['resolved', 'closed'].includes(row.status)) throw conflict('This grievance is already settled');
  if (row.level >= 3) throw conflict('It is already with the principal, the highest level');
  if (!String(note ?? '').trim()) throw badRequest('Say why it is being escalated');
  await row.update({ level: row.level + 1, status: 'open', lastActionOn: new Date() });
  await log(row.id, 'escalated', row.level, note, user.name);
  await notifyLevel(row, 'Grievance escalated to you');
  await notifyUsers([row.submittedByUserId], { title: `${row.ticketNo}: escalated`, body: `Moved up to ${levelLabel(row.level)}.`, url: row.submittedByRole === 'staff' ? '/feedback' : '/portal?tab=Feedback' });
}
