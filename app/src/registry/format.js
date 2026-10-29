import { money, niceDate } from '../ui';

// bookkeeping columns every table carries, and fields that mean nothing to a person reading a record
const HIDDEN = new Set([
  'id', 'authadd', 'authedit', 'authdel', 'addondt', 'editondt', 'delondt', 'delstatus', 'deletedAt', 'deletedByName',
  'nextStatuses', 'hasPhoto', 'password', 'passwordHash', 'readOnly', 'source', 'canDecide', 'overdue', 'expired',
]);
const MONEY = /(amount|fee|balance|paid|basic|allowances|deductions|net|total|price|cost|income|salary|fine|deposit|refunded|refundable|value)$/i;
const DATETIME = /(createdAt|checkIn|checkOut|decidedOn|sentAt|updatedAt|punch)/i;

const humanize = (key) => String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export const dateTime = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

/** One stored value as text for a person, or null when there is nothing worth showing. */
export function formatValue(key, v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return DATETIME.test(key) ? dateTime(s) : niceDate(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return niceDate(s);
  if (/^-?\d+(\.\d+)?$/.test(s) && MONEY.test(key)) return money(s);
  return s;
}

/** Every readable field of a record, labelled: used wherever a screen has no hand-written layout. */
export function autoFields(row) {
  return Object.entries(row ?? {})
    .filter(([k, v]) => !HIDDEN.has(k) && !/Id$/.test(k) && formatValue(k, v) !== null)
    .map(([k, v]) => [humanize(k), formatValue(k, v), k]);
}

/** A sensible title and subtitle for a record that has no hand-written row. */
export function autoRow(r) {
  const title = r.title ?? r.name ?? r.studentName ?? r.applicantName ?? r.staffName ?? r.subject
    ?? ([r.firstName, r.lastName].filter(Boolean).join(' ') || r.regNo || r.roomNo || r.cardNo || `#${r.id ?? ''}`);
  const sub = [r.className, r.admissionNo, r.status, r.type].filter(Boolean).join(' · ');
  return { title: String(title), sub: sub || undefined };
}

const TONE_OF = {
  active: 'green', paid: 'green', approved: 'green', issued: 'green', present: 'green', pass: 'green', resolved: 'green', received: 'green', completed: 'green', live: 'green',
  pending: 'amber', partial: 'amber', requested: 'amber', open: 'amber', late: 'amber', waitlisted: 'amber', in_progress: 'amber', applied: 'amber', draft: 'amber', ordered: 'amber',
  rejected: 'red', overdue: 'red', absent: 'red', fail: 'red', inactive: 'red', closed: 'grey', cancelled: 'grey', disposed: 'grey',
};
export const badgeFor = (status, text) => (status ? { text: text ?? String(status).replace(/_/g, ' '), tone: TONE_OF[String(status).toLowerCase()] ?? 'blue' } : null);
