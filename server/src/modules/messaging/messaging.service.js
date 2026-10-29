import { Op } from 'sequelize';
import { getSetting } from '../settings/settings.service.js';
import {
  AbsenceAlert,
  Attendance,
  Message,
  MessageTemplate,
  Parent,
  ParentStudent,
  SchoolClass,
  Staff,
  Student,
  User,
  UserGroupMember,
} from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';
import { listFees } from '../finance/fees.service.js';
import { deliver, isEmail, normalizePhone, providerStatus } from './providers.js';

const CHANNELS = ['email', 'sms'];
const MAX_RECIPIENTS = 500;
const BATCH = 5;
const SMS_MAX = 1000;
const HISTORY_LIMIT = 300;
const HOUR_MS = 60 * 60 * 1000;
const cooldownMs = async () => (await getSetting('notify.reminderCooldownHours')) * HOUR_MS;

const schoolName = () => getSetting('school.name');
const className = (c) => (c ? `${c.name}-${c.section}` : '');

/** Fills {{placeholders}}; an unknown or missing value becomes empty rather than showing the braces. */
const render = (text, vars = {}) =>
  String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => vars[key] ?? '');

const shape = (m) => ({
  id: m.id,
  channel: m.channel,
  kind: m.kind,
  recipient: m.recipient,
  recipientName: m.recipientName,
  studentId: m.studentId,
  subject: m.subject,
  body: m.body,
  status: m.status,
  provider: m.provider,
  error: m.error,
  sentByName: m.sentByName,
  createdAt: m.createdAt,
});

/**
 * Validates, delivers and records one message. A delivery failure is recorded (status "failed"),
 * not thrown; only bad input throws.
 */
export async function sendMessage({
  channel,
  to,
  toName,
  subject,
  body,
  kind = 'direct',
  studentId = null,
  sentByName = null,
}) {
  if (!CHANNELS.includes(channel)) throw badRequest('Channel must be email or sms');
  const text = String(body ?? '').trim();
  if (!text) throw badRequest('Message text is required');
  if (channel === 'sms' && text.length > SMS_MAX)
    throw badRequest(`SMS text is limited to ${SMS_MAX} characters`);
  if (channel === 'email' && !String(subject ?? '').trim()) throw badRequest('Email subject is required');

  const address = channel === 'sms' ? normalizePhone(to) : String(to ?? '').trim();
  if (channel === 'sms' && !address)
    throw badRequest(
      'Phone number is invalid. Include the country code (e.g. +91...) or set DEFAULT_COUNTRY_CODE in server/.env',
    );
  if (channel === 'email' && !isEmail(address)) throw badRequest('Email address is invalid');

  const result = await deliver(channel, { to: address, subject: subject?.trim(), body: text });
  const row = await Message.create({
    channel,
    kind,
    recipient: address,
    recipientName: toName || null,
    studentId,
    subject: channel === 'email' ? subject.trim() : null,
    body: text,
    status: result.status,
    provider: result.provider,
    error: result.error ?? null,
    sentByName,
  });
  return shape(row);
}

export async function listHistory({ channel, status, kind } = {}) {
  const rows = await Message.findAll({
    where: { ...(channel && { channel }), ...(status && { status }), ...(kind && { kind }) },
    order: [['id', 'DESC']],
    limit: HISTORY_LIMIT,
  });
  return rows.map(shape);
}

/* ---------- Templates ---------- */

export async function saveTemplate(id, { name, channel, subject, body }) {
  if (!String(name ?? '').trim() || !String(body ?? '').trim())
    throw badRequest('Name and text are required');
  if (!CHANNELS.includes(channel)) throw badRequest('Channel must be email or sms');
  const data = { name: name.trim(), channel, subject: channel === 'email' ? subject || null : null, body };
  if (!id) return (await MessageTemplate.create(data)).id;
  const template = await MessageTemplate.findByPk(id);
  if (!template) throw notFound('Template not found');
  await template.update(data);
  return template.id;
}

/* ---------- Audiences ---------- */

/**
 * Who a broadcast reaches. SMS goes to each active student's guardian phone; email goes once to each
 * parent portal account (with the matching children). People without the needed contact are counted as skipped.
 */
export async function resolveAudience({ channel, classId, audience, groupId }) {
  if (!CHANNELS.includes(channel)) throw badRequest('Channel must be email or sms');
  if (audience === 'staff') return resolveStaffAudience(channel);
  if (audience === 'group') return resolveGroupAudience(channel, groupId);
  const studentWhere = { status: 'active', ...(classId && { classId }) };
  const base = { school: await schoolName() };

  if (channel === 'sms') {
    const students = await Student.findAll({ where: studentWhere, include: [SchoolClass] });
    const recipients = [];
    let skipped = 0;
    for (const s of students) {
      const to = normalizePhone(s.guardianPhone);
      if (!to) {
        skipped += 1;
        continue;
      }
      recipients.push({
        to,
        name: s.guardianName,
        studentId: s.id,
        vars: {
          ...base,
          guardian: s.guardianName || 'Parent',
          student: `${s.firstName} ${s.lastName}`,
          class: className(s.SchoolClass),
        },
      });
    }
    return { recipients, skipped };
  }

  const parents = await Parent.findAll({
    include: [
      { model: User, attributes: ['email'] },
      {
        model: ParentStudent,
        required: true,
        include: [{ model: Student, where: studentWhere, include: [SchoolClass] }],
      },
    ],
  });
  return {
    recipients: parents.map((p) => ({
      to: p.User.email,
      name: p.name,
      studentId: null,
      vars: {
        ...base,
        guardian: p.name,
        student: p.ParentStudents.map((l) => `${l.Student.firstName} ${l.Student.lastName}`).join(', '),
        class: [...new Set(p.ParentStudents.map((l) => className(l.Student.SchoolClass)))].join(', '),
      },
    })),
    skipped: 0,
  };
}

/** Active staff, reached by their own email address or phone; staff without it are counted as skipped. */
async function resolveStaffAudience(channel) {
  const staff = await Staff.findAll({ where: { status: 'active' } });
  const school = await schoolName();
  const recipients = [];
  let skipped = 0;
  for (const s of staff) {
    const to =
      channel === 'sms'
        ? normalizePhone(s.phone)
        : isEmail(String(s.email ?? '').trim())
          ? s.email.trim()
          : null;
    if (!to) {
      skipped += 1;
      continue;
    }
    const name = `${s.firstName} ${s.lastName}`;
    recipients.push({ to, name, studentId: null, vars: { school, guardian: name, student: '', class: '' } });
  }
  return { recipients, skipped };
}

/** A user group's members by their login email. Logins have no phone number, so groups are email only. */
async function resolveGroupAudience(channel, groupId) {
  if (channel !== 'email') throw badRequest('User groups can only be emailed: logins have no phone number');
  if (!groupId) throw badRequest('Choose a group');
  const members = await UserGroupMember.findAll({
    where: { groupId },
    include: [{ model: User, attributes: ['name', 'email'] }],
  });
  const school = await schoolName();
  return {
    recipients: members.map((m) => ({
      to: m.User.email,
      name: m.User.name,
      studentId: null,
      vars: { school, guardian: m.User.name, student: '', class: '' },
    })),
    skipped: 0,
  };
}

/** Runs `fn` over the list a few at a time, so a big send is quick but does not hammer the provider. */
async function inBatches(list, fn) {
  const out = [];
  for (let i = 0; i < list.length; i += BATCH) {
    out.push(...(await Promise.all(list.slice(i, i + BATCH).map(fn))));
  }
  return out;
}

const tally = (results, skipped = 0) => ({
  total: results.length + skipped,
  sent: results.filter((r) => r.status === 'sent').length,
  logged: results.filter((r) => r.status === 'logged').length,
  failed: results.filter((r) => r.status === 'failed').length,
  skipped,
});

/** Sends one message to every parent in the audience, personalised per recipient. */
export async function broadcast({ channel, classId, audience, groupId, subject, body }, sentByName) {
  const { recipients, skipped } = await resolveAudience({ channel, classId, audience, groupId });
  if (!recipients.length) throw badRequest('Nobody in this audience has a usable contact');
  if (recipients.length > MAX_RECIPIENTS)
    throw badRequest(
      `Too many recipients (${recipients.length}); limit is ${MAX_RECIPIENTS}. Choose a class.`,
    );

  const results = await inBatches(recipients, (r) =>
    sendMessage({
      channel,
      to: r.to,
      toName: r.name,
      subject: render(subject, r.vars),
      body: render(body, r.vars),
      kind: 'broadcast',
      studentId: r.studentId,
      sentByName,
    }).catch((err) => ({ status: 'failed', error: err.message })),
  );
  return tally(results, skipped);
}

/* ---------- Absence alerts ---------- */

/**
 * Texts a student's guardian about an absence. Only a real delivery counts as "guardian informed" in the
 * absence-alert log; in log-only mode nothing was delivered, so the log is left alone.
 */
export async function sendAbsenceAlert({ studentId, date }, user, template) {
  const day = date || today();
  const mark = await Attendance.findOne({ where: { studentId, date: day, status: 'absent' } });
  if (!mark) throw badRequest('That student is not marked absent on this date');
  if (await AbsenceAlert.findOne({ where: { studentId, date: day, method: 'sms' } }))
    throw conflict('An SMS was already sent for this absence');

  const student = await Student.findByPk(studentId, { include: [SchoolClass] });
  if (!normalizePhone(student.guardianPhone))
    throw badRequest('This student has no valid guardian phone number');

  const vars = {
    school: await schoolName(),
    guardian: student.guardianName || 'Parent',
    student: `${student.firstName} ${student.lastName}`,
    class: className(student.SchoolClass),
    date: day,
  };
  const message = await sendMessage({
    channel: 'sms',
    to: student.guardianPhone,
    toName: student.guardianName,
    body: render(template || (await getSetting('notify.absenceTemplate')), vars),
    kind: 'absence',
    studentId,
    sentByName: user.name,
  });
  if (message.status === 'sent') {
    await AbsenceAlert.create({
      studentId,
      date: day,
      method: 'sms',
      note: 'Automatic SMS',
      notifiedBy: user.id,
      notifiedByName: user.name,
    });
  }
  return message;
}

/* ---------- Fee reminders ---------- */

/** Overdue balances grouped per student, with the guardian to contact. */
async function overdueByStudent(classId) {
  const fees = await listFees({ status: 'overdue', ...(classId && { classId }) });
  const grouped = new Map();
  for (const f of fees) {
    const entry = grouped.get(f.studentId) ?? { cents: 0, titles: [] };
    entry.cents += toCents(f.balance);
    entry.titles.push(f.title);
    grouped.set(f.studentId, entry);
  }
  const students = await Student.findAll({ where: { id: [...grouped.keys()] }, include: [SchoolClass] });
  return students.map((s) => ({ student: s, ...grouped.get(s.id) }));
}

/** What a fee-reminder run would do, without sending anything. */
export async function previewFeeReminders({ classId }) {
  const rows = await overdueByStudent(classId);
  const since = new Date(Date.now() - (await cooldownMs()));
  const recent = await Message.findAll({
    where: {
      kind: 'fee_reminder',
      studentId: rows.map((r) => r.student.id),
      status: { [Op.ne]: 'failed' },
      createdAt: { [Op.gte]: since },
    },
    attributes: ['studentId'],
  });
  const reminded = new Set(recent.map((m) => m.studentId));
  return rows.map((r) => ({
    studentId: r.student.id,
    name: `${r.student.firstName} ${r.student.lastName}`,
    className: className(r.student.SchoolClass),
    guardianName: r.student.guardianName,
    guardianPhone: r.student.guardianPhone,
    hasPhone: Boolean(normalizePhone(r.student.guardianPhone)),
    overdue: fromCents(r.cents),
    items: r.titles.join(', '),
    remindedToday: reminded.has(r.student.id),
  }));
}

/** Texts every guardian with overdue fees. Anyone already reminded within the cooldown (a setting, 24 hours by default) is skipped. */
export async function sendFeeReminders({ classId, body }, sentByName) {
  const preview = await previewFeeReminders({ classId });
  const targets = preview.filter((r) => r.hasPhone && !r.remindedToday);
  if (targets.length > MAX_RECIPIENTS)
    throw badRequest(`Too many recipients (${targets.length}); limit is ${MAX_RECIPIENTS}. Choose a class.`);

  const school = await schoolName();
  const template = body || (await getSetting('notify.feeReminderTemplate'));
  const results = await inBatches(targets, (r) =>
    sendMessage({
      channel: 'sms',
      to: r.guardianPhone,
      toName: r.guardianName,
      kind: 'fee_reminder',
      studentId: r.studentId,
      sentByName,
      body: render(template, {
        school,
        guardian: r.guardianName || 'Parent',
        student: r.name,
        class: r.className,
        amount: r.overdue,
        items: r.items,
      }),
    }).catch((err) => ({ status: 'failed', error: err.message })),
  );

  return {
    ...tally(results, preview.length - targets.length),
    alreadyReminded: preview.filter((r) => r.hasPhone && r.remindedToday).length,
  };
}

export const status = async () => ({
  ...providerStatus(),
  defaults: {
    absence: await getSetting('notify.absenceTemplate'),
    feeReminder: await getSetting('notify.feeReminderTemplate'),
  },
});
