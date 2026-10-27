import { Setting } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';

/**
 * Every school-wide setting: its group, label, type, limits and default. The default is what the system did
 * before settings existed, so nothing changes until an admin edits a value.
 * Types: text | integer | number. A text setting may list `options` (it must then be one of them, or blank when not `required`),
 * a `pattern` (checked when something is entered) and `required`.
 */
export const DEFINITIONS = [
  { key: 'school.name', group: 'School profile', label: 'School name', type: 'text', max: 120, default: () => process.env.SCHOOL_NAME || 'School Name', help: 'Printed on certificates, ID cards and messages.' },
  { key: 'school.code', group: 'School profile', label: 'School code', type: 'text', max: 30, pattern: /^[A-Za-z0-9-]+$/, patternHelp: 'letters, digits and dashes only', default: '' },
  { key: 'school.ownership', group: 'School profile', label: 'Ownership', type: 'text', max: 30, options: ['Private', 'Government', 'Government-aided', 'Trust / society', 'Other'], default: '' },
  { key: 'school.mode', group: 'School profile', label: 'Admission type', type: 'text', max: 30, options: ['Co-educational', 'Boys only', 'Girls only'], default: '' },
  { key: 'school.board', group: 'School profile', label: 'Board / curriculum', type: 'text', max: 40, options: ['CBSE', 'ICSE', 'ISC', 'State board', 'IB', 'Cambridge (IGCSE)', 'Other'], default: '' },
  { key: 'school.established', group: 'School profile', label: 'Established', type: 'text', max: 4, pattern: /^(1[89]\d\d|20\d\d)$/, patternHelp: 'a four-digit year such as 2008', default: '' },
  { key: 'school.registrationNo', group: 'School profile', label: 'Registration no', type: 'text', max: 60, default: '' },
  { key: 'school.address', group: 'School profile', label: 'Address', type: 'text', max: 255, default: '' },
  { key: 'school.website', group: 'School profile', label: 'Website', type: 'text', max: 150, pattern: /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/\S*)?$/, patternHelp: 'a web address such as www.example.edu.in', default: '' },
  { key: 'school.motto', group: 'School profile', label: 'School motto', type: 'text', max: 150, default: '' },
  { key: 'school.timezone', group: 'School profile', label: 'Time zone', type: 'text', max: 40, required: true, options: ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Dhaka', 'Asia/Kathmandu', 'Asia/Colombo', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'Australia/Sydney', 'UTC'], default: 'Asia/Kolkata' },
  { key: 'school.language', group: 'School profile', label: 'Default language', type: 'text', max: 10, required: true, options: ['en-IN', 'en-GB', 'en-US', 'hi-IN', 'mr-IN', 'gu-IN', 'bn-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN'], default: 'en-IN' },
  { key: 'school.dateFormat', group: 'School profile', label: 'Date format', type: 'text', max: 12, required: true, options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], default: 'DD/MM/YYYY' },
  { key: 'school.phone', group: 'School profile', label: 'Phone', type: 'text', max: 30, default: '' },
  { key: 'school.email', group: 'School profile', label: 'Email', type: 'text', max: 120, default: '' },
  { key: 'school.principal', group: 'School profile', label: 'Principal / head', type: 'text', max: 100, default: '', help: 'Shown under the signature line on certificates.' },

  { key: 'student.defaultPassword', group: 'Student login', label: 'Default password for new student logins', type: 'text', max: 40, pattern: /^.{8,40}$/, patternHelp: 'at least 8 characters', default: '', help: 'Every new student login starts with this password and the student must change it at the first sign-in. Leave blank to give each student a different random password instead.' },

  { key: 'attendance.minPercent', group: 'Attendance', label: 'Minimum attendance (%)', type: 'number', min: 0, max: 100, default: 75, help: 'Students and staff below this are highlighted in reports.' },
  { key: 'leave.studentMaxDays', group: 'Attendance', label: 'Longest student leave a parent can apply for (days)', type: 'integer', min: 1, max: 365, default: 60 },

  { key: 'grievance.escalateAfterDays', group: 'Feedback & grievance', label: 'Escalate a grievance to the next level after (days without a reply)', type: 'integer', min: 0, max: 60, default: 3, help: 'A grievance nobody has answered moves up one level: class teacher or department head, then the school office, then the principal. 0 turns automatic escalation off.' },

  { key: 'library.loanDays', group: 'Library', label: 'Loan period (days)', type: 'integer', min: 1, max: 90, default: 14 },
  { key: 'library.requireMembership', group: 'Library', label: 'Students need a library card to borrow (1 = yes, 0 = no)', type: 'integer', min: 0, max: 1, default: 0, help: 'With 0, only students who hold a card are limited by it.' },
  { key: 'library.defaultMaxBooks', group: 'Library', label: 'Books allowed at a time on a new card', type: 'integer', min: 1, max: 50, default: 3 },
  { key: 'library.finePerDay', group: 'Library', label: 'Late fine per day', type: 'number', min: 0, max: 10000, default: 2 },

  { key: 'notify.autoAbsence', group: 'Notifications', label: 'Alert parents automatically when a student is marked absent (1 = yes, 0 = no)', type: 'integer', min: 0, max: 1, default: 0, help: 'After the time below, the parent and student logins get a push notification for every student marked absent today, except those on approved leave or already contacted.' },
  { key: 'notify.autoAbsenceTime', group: 'Notifications', label: 'Send automatic absence alerts after (HH:MM)', type: 'text', max: 5, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, patternHelp: 'a time like 10:00', default: '10:00', help: 'Gives teachers time to finish and correct attendance first.' },
  { key: 'notify.autoAbsenceSms', group: 'Notifications', label: 'Also text the guardian (1 = yes, 0 = no)', type: 'integer', min: 0, max: 1, default: 1, help: 'Uses the SMS provider under Integrations. Without one, the message is only recorded, not delivered.' },
  { key: 'notify.absenceTemplate', group: 'Notifications', label: 'Absence SMS wording', type: 'text', max: 500, default: 'Dear {{guardian}}, {{student}} ({{class}}) was marked absent on {{date}}. Please contact the school if this is unexpected. - {{school}}', help: 'Placeholders: {{guardian}} {{student}} {{class}} {{date}} {{school}}.' },
  { key: 'notify.feeReminderTemplate', group: 'Notifications', label: 'Fee reminder SMS wording', type: 'text', max: 500, default: 'Dear {{guardian}}, fees of {{amount}} for {{student}} are overdue ({{items}}). Please pay at the school office. - {{school}}', help: 'Placeholders: {{guardian}} {{student}} {{class}} {{amount}} {{items}} {{school}}.' },
  { key: 'notify.reminderCooldownHours', group: 'Notifications', label: 'Hours before the same family can be reminded again', type: 'integer', min: 1, max: 720, default: 24 },

  { key: 'payment.receiptPrefix', group: 'Payments', label: 'Receipt number prefix', type: 'text', max: 8, required: true, pattern: /^[A-Za-z0-9-]{1,8}$/, patternHelp: 'letters, digits and dashes only', default: 'RCT', help: 'New receipts are numbered like RCT-000123. Receipts already issued keep their numbers.' },
  { key: 'payment.allowPartial', group: 'Payments', label: 'Allow part payments (1 = yes, 0 = pay in full only)', type: 'integer', min: 0, max: 1, default: 1 },
  { key: 'payment.allowCash', group: 'Payments', label: 'Accept cash (1 = yes, 0 = no)', type: 'integer', min: 0, max: 1, default: 1 },
  { key: 'payment.allowCard', group: 'Payments', label: 'Accept card (1 = yes, 0 = no)', type: 'integer', min: 0, max: 1, default: 1 },
  { key: 'payment.allowUpi', group: 'Payments', label: 'Accept UPI (1 = yes, 0 = no)', type: 'integer', min: 0, max: 1, default: 1 },
  { key: 'payment.allowBank', group: 'Payments', label: 'Accept bank transfer (1 = yes, 0 = no)', type: 'integer', min: 0, max: 1, default: 1 },

];

const BY_KEY = new Map(DEFINITIONS.map((d) => [d.key, d]));
const defaultOf = (d) => (typeof d.default === 'function' ? d.default() : d.default);

/** Saved overrides, read once and kept until a save changes them. */
let cache = null;
async function overrides() {
  if (!cache) {
    const rows = await Setting.findAll();
    cache = new Map(rows.map((r) => [r.key, JSON.parse(r.value)]));
  }
  return cache;
}

export async function getSetting(key) {
  const def = BY_KEY.get(key);
  if (!def) throw new Error(`Unknown setting ${key}`);
  const saved = await overrides();
  return saved.has(key) ? saved.get(key) : defaultOf(def);
}

/** Several settings at once, as { key: value }. */
export async function getSettings(keys) {
  const out = {};
  for (const key of keys) out[key] = await getSetting(key);
  return out;
}

/** Every setting with its current value, default and whether it has been changed, for the settings page. */
export async function describeAll() {
  const saved = await overrides();
  return DEFINITIONS.map((d) => ({
    key: d.key, group: d.group, label: d.label, type: d.type, help: d.help ?? null,
    min: d.min ?? null, max: d.max ?? null, options: d.options ?? null, required: Boolean(d.required),
    default: defaultOf(d),
    value: saved.has(d.key) ? saved.get(d.key) : defaultOf(d),
    changed: saved.has(d.key),
  }));
}

function coerce(def, raw) {
  if (def.type === 'text') {
    const text = String(raw ?? '').trim();
    if (text.length > def.max) throw badRequest(`${def.label} must be ${def.max} characters or fewer`);
    if (def.required && !text) throw badRequest(`${def.label} is required`);
    if (text && def.pattern && !def.pattern.test(text)) throw badRequest(`${def.label}: ${def.patternHelp}`);
    if (text && def.options && !def.options.includes(text)) throw badRequest(`${def.label} must be one of: ${def.options.join(', ')}`);
    return text;
  }
  const n = Number(raw);
  if (raw === '' || raw === null || Number.isNaN(n)) throw badRequest(`${def.label} must be a number`);
  if (def.type === 'integer' && !Number.isInteger(n)) throw badRequest(`${def.label} must be a whole number`);
  if (n < def.min || n > def.max) throw badRequest(`${def.label} must be between ${def.min} and ${def.max}`);
  return n;
}

/** Validates the whole batch first, then saves it, so a bad value changes nothing. */
export async function saveSettings(values, user) {
  const entries = Object.entries(values ?? {});
  if (!entries.length) throw badRequest('Nothing to save');
  const clean = entries.map(([key, raw]) => {
    const def = BY_KEY.get(key);
    if (!def) throw badRequest(`Unknown setting "${key}"`);
    return [key, coerce(def, raw)];
  });
  for (const [key, value] of clean) {
    await Setting.upsert({ key, value: JSON.stringify(value), updatedByName: user.name });
  }
  cache = null;
}

/** Puts a setting back to its default by removing the saved override. */
export async function resetSetting(key) {
  if (!BY_KEY.has(key)) throw badRequest(`Unknown setting "${key}"`);
  await Setting.destroy({ where: { key } });
  cache = null;
}

/** The school's printable identity, used on certificates, ID cards and messages. */
export async function schoolProfile() {
  const p = await getSettings(['school.name', 'school.address', 'school.phone', 'school.email', 'school.principal']);
  return { name: p['school.name'], address: p['school.address'], phone: p['school.phone'], email: p['school.email'], principal: p['school.principal'] };
}
