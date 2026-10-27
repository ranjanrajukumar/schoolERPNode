import { Op } from 'sequelize';
import { photoIds } from '../../utils/photoFlags.js';
import { AcademicYear, Admission, ApplicationDocument, Photo, SchoolClass, Staff } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';
import { TRANSITIONS, checkDetails } from './admissions.service.js';
import { ADMISSION_DETAIL_KEYS } from '../academics/studentFields.js';
import { cleanEnquiryExtras } from './enquiryFields.js';
import { loadExtras, saveExtras } from './recordExtras.js';

/** Where an enquiry came from. `online` is the public /apply form. */
export const SOURCES = { online: 'Website', office: 'Walk-in', phone: 'Phone', referral: 'Referral', social: 'Social media', other: 'Other' };
/** How the family prefers to be reached, and the kind of follow-up planned. */
export const CONTACT_METHODS = { phone: 'Phone call', whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email', visit: 'In person' };
export const FOLLOW_UP_TYPES = { phone_call: 'Phone call', whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email', visit: 'Campus visit', meeting: 'Meeting' };
/** Stages in which a family is still being worked with (not yet enrolled or turned away). */
const OPEN = ['enquiry', 'applied', 'waitlisted', 'approved'];
const STAGE_LABEL = { enquiry: 'New', applied: 'Applied', waitlisted: 'Waitlisted', approved: 'Offered', enrolled: 'Converted', rejected: 'Closed' };
const MAX_PAGE = 100;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const enquiryId = (a) => `ENQ-${new Date(a.createdAt).getFullYear()}-${String(a.id).padStart(4, '0')}`;
const monthStart = (offset = 0) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + offset, 1); };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null);
const escapeLike = (t) => t.replace(/[\\%_]/g, (c) => `\\${c}`);

const staffNames = async () => new Map((await Staff.findAll({ attributes: ['id', 'firstName', 'lastName'] })).map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

const include = [{ model: SchoolClass, attributes: ['name', 'section'] }];

function shape(a, staff = new Map()) {
  const due = Boolean(a.followUpOn && a.followUpOn <= today() && OPEN.includes(a.status));
  return {
    id: a.id, deletedAt: a.deletedAt ?? null, deletedByName: a.deletedByName ?? null, enquiryId: enquiryId(a), applicantName: a.applicantName, classId: a.classId,
    className: a.SchoolClass ? `${a.SchoolClass.name}-${a.SchoolClass.section}` : null,
    guardianName: a.guardianName || a.fatherName || a.motherName || null, guardianPhone: a.guardianPhone || a.fatherPhone || a.motherPhone || null, email: a.email,
    source: a.source, sourceLabel: SOURCES[a.source] ?? 'Other', createdAt: a.createdAt, enquiryDate: a.enquiryOn ?? String(a.createdAt).slice(0, 10), status: a.status,
    academicYear: a.academicYear, assignedToId: a.assignedToId, assignedToName: a.assignedToId ? staff.get(a.assignedToId) ?? null : null,
    preferredContact: a.preferredContact, followUpType: a.followUpType, followUpTypeLabel: FOLLOW_UP_TYPES[a.followUpType] ?? null, followUpNote: a.followUpNote,
    stageLabel: due ? 'Follow-up' : STAGE_LABEL[a.status], followUpDue: due, followUpOn: a.followUpOn, visitOn: a.visitOn, lastContactedOn: a.lastContactedOn,
    remarks: a.remarks, nextStatuses: TRANSITIONS[a.status],
  };
}

/** Conditions for one tab of the page. */
function tabWhere(tab) {
  const now = today();
  switch (tab) {
    case 'new': return { status: 'enquiry', [Op.or]: [{ followUpOn: null }, { followUpOn: { [Op.gt]: now } }] };
    case 'followup': return { status: { [Op.in]: OPEN }, followUpOn: { [Op.lte]: now } };
    case 'converted': return { status: 'enrolled' };
    case 'deleted': return { deletedAt: { [Op.ne]: null } };
    default: return { status: { [Op.ne]: 'draft' } }; // an unsubmitted application is not an enquiry
  }
}

/**
 * The enquiry list: one page of rows plus the total, filtered by tab, class, stage, source, dates and free text.
 * Free text matches the child's or parent's name, any phone, the email, or the enquiry number (ENQ-2026-0012 or just 12).
 */
export async function listEnquiries(query = {}) {
  const { tab, q, classId, stage, source, from, to, visit } = query;
  const size = Math.min(Math.max(Number(query.pageSize) || 10, 1), MAX_PAGE);
  const page = Math.max(Number(query.page) || 1, 1);
  if ((from && !DAY.test(from)) || (to && !DAY.test(to))) throw badRequest('Dates must look like 2026-10-24');
  if (stage && !TRANSITIONS[stage]) throw badRequest('Unknown stage');
  if (source && !SOURCES[source]) throw badRequest('Unknown source');

  const and = [tabWhere(tab)];
  if (classId) and.push({ classId: Number(classId) });
  if (stage) and.push({ status: stage });
  if (source) and.push({ source });
  if (from || to) and.push({ enquiryOn: { ...(from && { [Op.gte]: from }), ...(to && { [Op.lte]: to }) } });
  if (visit) and.push({ status: { [Op.in]: OPEN }, visitOn: { [Op.gte]: today() } });
  for (const term of String(q ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 5)) {
    const like = { [Op.like]: `%${escapeLike(term)}%` };
    const ref = /^enq-?\d{4}-?(\d+)$/i.exec(term);
    const number = ref ? Number(ref[1]) : /^\d{1,8}$/.test(term) ? Number(term) : null;
    and.push({
      [Op.or]: [
        { applicantName: like }, { guardianName: like }, { fatherName: like }, { motherName: like }, { guardianPhone: like }, { fatherPhone: like }, { motherPhone: like }, { email: like },
        ...(number ? [{ id: number }] : []),
      ],
    });
  }

  const staff = await staffNames();
  const { rows, count } = await Admission.findAndCountAll({
    where: { [Op.and]: and }, include, order: [['id', 'DESC']], paranoid: tab !== 'deleted', limit: size, offset: (page - 1) * size, distinct: true,
  });
  const withPhoto = await photoIds('enquiry', rows.map((r) => r.id));
  return { rows: rows.map((r) => ({ ...shape(r, staff), hasPhoto: withPhoto.has(r.id) })), total: count, page, pageSize: size };
}

/** Tiles and tab counts. Trends compare this calendar month with the one before. */
export async function enquirySummary() {
  const now = today();
  const thisMonth = monthStart(0); const lastMonth = monthStart(-1);
  const between = (from, to) => ({ [Op.gte]: from, [Op.lt]: to });
  const [total, received, receivedBefore, due, visits, converted, convertedBefore, fresh, followup, enrolledAll] = await Promise.all([
    Admission.count({ where: tabWhere('all') }),
    Admission.count({ where: { enquiryOn: { [Op.gte]: iso(thisMonth) } } }),
    Admission.count({ where: { enquiryOn: between(iso(lastMonth), iso(thisMonth)) } }),
    Admission.count({ where: tabWhere('followup') }),
    Admission.count({ where: { status: { [Op.in]: OPEN }, visitOn: { [Op.gte]: now } } }),
    Admission.count({ where: { status: 'enrolled', enrolledOn: { [Op.gte]: iso(thisMonth) } } }),
    Admission.count({ where: { status: 'enrolled', enrolledOn: between(iso(lastMonth), iso(thisMonth)) } }),
    Admission.count({ where: tabWhere('new') }),
    Admission.count({ where: tabWhere('followup') }),
    Admission.count({ where: tabWhere('converted') }),
  ]);
  return {
    total, receivedThisMonth: received, receivedTrend: pct(received, receivedBefore),
    needsFollowUp: due, visitsScheduled: visits, convertedThisMonth: converted, convertedTrend: pct(converted, convertedBefore),
    tabs: { all: total, new: fresh, followup, converted: enrolledAll, deleted: await Admission.count({ where: tabWhere('deleted'), paranoid: false }) },
  };
}

const validDay = (v, label) => {
  if (!DAY.test(String(v)) || Number.isNaN(new Date(`${v}T00:00:00`).getTime())) throw badRequest(`${label} must look like 2026-10-24`);
  if (v < today()) throw badRequest(`${label} cannot be in the past`);
};

/**
 * Records a contact and/or plans the next steps: a follow-up date, a campus visit date, a note. Send a date as null or '' to clear it.
 * `contacted` stamps today as the last contact. The note is added to the remarks, newest last, keeping the latest 255 characters.
 */
export async function planFollowUp(id, { followUpOn, visitOn, note, contacted, followUpType, followUpNote }) {
  const a = await Admission.findByPk(id);
  if (!a) throw notFound('Enquiry not found');
  if (!OPEN.includes(a.status)) throw conflict(`A ${a.status} enquiry has nothing left to follow up`);
  const data = {};
  for (const [key, value, label] of [['followUpOn', followUpOn, 'Follow-up date'], ['visitOn', visitOn, 'Visit date']]) {
    if (value === undefined) continue;
    if (value === null || value === '') data[key] = null; else { validDay(value, label); data[key] = value; }
  }
  if (followUpType !== undefined) {
    if (followUpType && !FOLLOW_UP_TYPES[followUpType]) throw badRequest('Follow-up type is invalid');
    data.followUpType = followUpType || null;
  }
  if (followUpNote !== undefined) {
    if (String(followUpNote).length > 200) throw badRequest('The reminder must be 200 characters or fewer');
    data.followUpNote = String(followUpNote).trim() || null;
  }
  if (contacted) data.lastContactedOn = today();
  const text = String(note ?? '').trim();
  if (text) {
    if (text.length > 200) throw badRequest('The note must be 200 characters or fewer');
    data.remarks = `${a.remarks ? `${a.remarks} | ` : ''}${today()}: ${text}`.slice(-255);
  }
  if (!Object.keys(data).length) throw badRequest('Nothing to save');
  await a.update(data);
}

/* ---------- Creating and editing an enquiry from the enquiry form ---------- */

const text = (v) => String(v ?? '').trim();
const orNull = (v) => (text(v) === '' ? null : text(v));

/**
 * Checks the enquiry form and turns it into the columns to save. Required: first and last name, grade, academic year (once any exist),
 * parent name, phone and source. `stored` is the saved row when editing, so an unchanged past follow-up date is not rejected.
 */
async function enquiryData(body, stored = null) {
  const missing = [];
  const first = text(body.firstName); const last = text(body.lastName);
  if (!first) missing.push('Student first name');
  if (!last) missing.push('Student last name');
  if (!body.classId) missing.push('Grade applying for');
  const years = await AcademicYear.findAll({ attributes: ['name'] });
  if (years.length && !text(body.academicYear)) missing.push('Academic year');
  if (!text(body.guardianName)) missing.push('Parent / guardian name');
  if (!text(body.guardianPhone)) missing.push('Phone number');
  if (!text(body.source)) missing.push('Enquiry source');
  if (missing.length) throw badRequest(`${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required`);

  if (years.length && !years.some((y) => y.name === text(body.academicYear))) throw badRequest('Choose one of the academic years');
  if (!(await SchoolClass.findByPk(body.classId))) throw badRequest('Grade does not exist');
  if (body.assignedToId) {
    const person = await Staff.findByPk(body.assignedToId);
    if (!person || person.status !== 'active') throw badRequest('Assigned to must be an active staff member');
  }
  if (text(body.preferredContact) && !CONTACT_METHODS[body.preferredContact]) throw badRequest('Preferred contact method is invalid');
  if (text(body.followUpType) && !FOLLOW_UP_TYPES[body.followUpType]) throw badRequest('Follow-up type is invalid');
  if (String(body.followUpNote ?? '').length > 200) throw badRequest('The internal reminder must be 200 characters or fewer');
  if (text(body.enquiryOn)) {
    if (!DAY.test(body.enquiryOn) || Number.isNaN(new Date(body.enquiryOn).getTime())) throw badRequest('Enquiry date must look like 2026-10-24');
    if (body.enquiryOn > today()) throw badRequest('The enquiry date cannot be in the future');
  }
  if (text(body.followUpOn) && body.followUpOn !== stored?.followUpOn) validDay(body.followUpOn, 'Follow-up date');
  const applicantName = `${first} ${last}`;
  await checkDetails({ ...body, applicantName }); // dates of birth, gender, phone and email follow the same rules as everywhere else
  const extras = cleanEnquiryExtras(body);
  if (extras.error) throw badRequest(extras.error);
  // the registration details (parents' names, nationality, religion...) the form sends along
  const details = Object.fromEntries(ADMISSION_DETAIL_KEYS.filter((k) => body[k] !== undefined).map((k) => [k, orNull(body[k])]));

  const columns = {
    ...details,
    applicantName, dob: orNull(body.dob), gender: orNull(body.gender), classId: body.classId, academicYear: orNull(body.academicYear), previousSchool: orNull(body.previousSchool),
    guardianName: text(body.guardianName), guardianRelation: orNull(body.guardianRelation), guardianPhone: text(body.guardianPhone), email: orNull(body.email), address: orNull(body.address),
    source: text(body.source), assignedToId: body.assignedToId || null, enquiryOn: orNull(body.enquiryOn) ?? today(), preferredContact: orNull(body.preferredContact),
    remarks: orNull(body.remarks), followUpOn: orNull(body.followUpOn), followUpType: orNull(body.followUpType), followUpNote: orNull(body.followUpNote),
  };
  return { columns, extras: extras.data };
}

export async function createEnquiry(body) {
  if (!SOURCES[text(body.source)]) throw badRequest('Choose where the enquiry came from');
  const { columns, extras } = await enquiryData(body);
  return Admission.sequelize.transaction(async (transaction) => {
    const a = await Admission.create(columns, { transaction });
    await saveExtras('admission', a.id, extras, transaction);
    return a.id;
  });
}

/** Everything the enquiry form shows, for editing. */
export async function getEnquiry(id) {
  const a = await Admission.findByPk(id, { include });
  if (!a) throw notFound('Enquiry not found');
  const [first, ...rest] = a.applicantName.trim().split(/\s+/);
  return { ...a.toJSON(), ...(await loadExtras('admission', a.id)), SchoolClass: undefined, firstName: first, lastName: rest.join(' '), enquiryOn: a.enquiryOn ?? String(a.createdAt).slice(0, 10) };
}

export async function updateEnquiry(id, body) {
  const a = await Admission.findByPk(id);
  if (!a) throw notFound('Enquiry not found');
  if (!SOURCES[text(body.source)]) throw badRequest('Choose where the enquiry came from');
  const { columns, extras } = await enquiryData(body, a);
  await Admission.sequelize.transaction(async (transaction) => {
    await a.update(columns, { transaction });
    await saveExtras('admission', a.id, extras, transaction);
  });
}

/** Soft delete: the enquiry disappears from every list and report but stays in the database, so it can be restored. */
export async function softDeleteEnquiry(id, byName) {
  const a = await Admission.findByPk(id);
  if (!a) throw notFound('Enquiry not found');
  // A converted enquiry can be deleted too: the student it created is a separate record and is not touched.
  await a.update({ deletedByName: byName ?? null });
  await a.destroy();
}

export async function restoreEnquiry(id) {
  const a = await Admission.findByPk(id, { paranoid: false });
  if (!a || !a.deletedAt) throw notFound('That enquiry is not in the deleted list');
  await a.restore();
  await a.update({ deletedByName: null });
}

/** Removes a soft-deleted enquiry for good, together with its photo. Only works on one that is already deleted. */
export async function purgeEnquiry(id) {
  const a = await Admission.findByPk(id, { paranoid: false });
  if (!a || !a.deletedAt) throw conflict('Delete the enquiry first; only deleted enquiries can be removed permanently');
  await Photo.destroy({ where: { entity: 'enquiry', entityId: a.id } });
  await ApplicationDocument.destroy({ where: { admissionId: a.id } });
  await a.destroy({ force: true });
}
