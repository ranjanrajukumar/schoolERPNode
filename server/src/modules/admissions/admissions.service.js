import { Admission, FeeStructure, SchoolClass, Student, sequelize } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { nextNumber } from '../../utils/numbering.js';
import { getSetting } from '../settings/settings.service.js';
import { ADMISSION_DETAIL_KEYS } from '../academics/studentFields.js';
import { STUDENT_EXTRA_KEYS } from './enquiryFields.js';
import { loadExtras, saveExtras } from './recordExtras.js';
import { createStudentLogin } from '../portal/studentLogin.service.js';
import { carryOverToStudent } from './applicationForm.service.js';
import { applyChoices } from './admissionChoices.service.js';
import { validateStudent } from '../academics/students.validation.js';
import { billStudents } from '../finance/fees.service.js';
import { daysFromNow, today } from '../../utils/money.js';

/** Days a family has to confirm an offer when no date was set. */
const OFFER_DAYS = 14;
const plusDays = (n) => daysFromNow(n);

export const ADMISSION_FIELDS = [
  'applicantName', 'dob', 'gender', 'guardianName', 'guardianPhone', 'classId', 'remarks', 'source', 'referredBy', 'academicYear', 'followUpOn', 'visitOn', ...ADMISSION_DETAIL_KEYS,
];

const SOURCE_KEYS = ['online', 'office', 'phone', 'referral', 'social', 'other'];

/** The registration details follow the same rules as a student's; the applicant's own checks come with them. */
export async function checkDetails(body) {
  const errors = await validateStudent(Object.fromEntries(Object.entries(body).filter(([k]) => ADMISSION_DETAIL_KEYS.includes(k) || ['dob', 'gender', 'guardianPhone'].includes(k))), { partial: true });
  if (String(body.applicantName ?? '').length > 160) errors.push('Applicant name is too long');
  if (String(body.remarks ?? '').length > 255) errors.push('Remarks must be 255 characters or fewer');
  if (body.source && !SOURCE_KEYS.includes(body.source)) errors.push('Source is invalid');
  for (const [key, label] of [['followUpOn', 'Follow-up date'], ['visitOn', 'Visit date']]) {
    if (body[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(body[key]) || Number.isNaN(new Date(body[key]).getTime()))) errors.push(`${label} is invalid`);
  }
  if (errors.length) throw badRequest(errors[0]);
}

/** Allowed status moves. "enrolled" is only reachable through enroll(), which creates the student. */
export const TRANSITIONS = {
  draft: ['applied'],
  enquiry: ['applied', 'rejected'],
  applied: ['approved', 'waitlisted', 'rejected'],
  waitlisted: ['approved', 'applied', 'rejected'],
  approved: ['waitlisted', 'rejected'],
  rejected: ['enquiry'],
  enrolled: [],
};

const pick = (body) => Object.fromEntries(
  ADMISSION_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]),
);

function shape(admission) {
  const { SchoolClass: cls, ...rest } = admission.toJSON();
  return { ...rest, className: cls ? `${cls.name}-${cls.section}` : null, nextStatuses: TRANSITIONS[rest.status] };
}

const include = [{ model: SchoolClass, attributes: ['name', 'section'] }];

export async function listAdmissions({ status } = {}) {
  const rows = await Admission.findAll({ where: status ? { status } : {}, include, order: [['id', 'DESC']] });
  return rows.map(shape);
}

export async function createAdmission(body) {
  const data = pick(body);
  if (!String(data.applicantName ?? '').trim()) throw badRequest('Applicant name is required');
  await checkDetails(body);
  return (await Admission.create(data)).id;
}

export async function updateAdmission(id, body) {
  const admission = await Admission.findByPk(id);
  if (!admission) throw notFound('Admission not found');
  if (admission.status === 'enrolled') throw conflict('An enrolled applicant can only be edited on the student record');
  await checkDetails(body);
  await admission.update(pick(body));
}

export async function changeStatus(id, status) {
  const admission = await Admission.findByPk(id);
  if (!admission) throw notFound('Admission not found');
  if (!TRANSITIONS[admission.status].includes(status)) {
    throw conflict(`Cannot move from ${admission.status} to ${status}`);
  }
  // The application form is where the required details are collected; an enquiry cannot skip it.
  if (status === 'applied' && ['enquiry', 'draft'].includes(admission.status)) throw conflict('Submit the student application first (Apply on the enquiry)');
  if (status === 'approved' && !admission.classId) throw badRequest('Choose the class applied for before approving');
  // An offer always carries a confirm-by date, so it can expire and free the seat.
  await admission.update({ status, ...(status === 'approved' && !admission.offerExpiry && { offerExpiry: plusDays(OFFER_DAYS) }) });
}

/** Next admission number from the school's formula (default ADM-2026-0007). */
async function nextAdmissionNo(transaction) {
  return nextNumber({ model: Student, field: 'admissionNo', formula: await getSetting('numbering.admission'), transaction });
}

/**
 * Turns an approved applicant into a student in the applied-for class and bills the class
 * fee structure. All of it happens in one transaction, so a failure leaves nothing behind.
 */
export async function enroll(id, { admissionNo } = {}, byName = null) {
  return sequelize.transaction(async (transaction) => {
    const admission = await Admission.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!admission) throw notFound('Admission not found');
    if (admission.status !== 'approved') throw conflict('Only approved applicants can be enrolled');
    if (admission.offerExpiry && admission.offerExpiry < today()) throw conflict(`The offer expired on ${admission.offerExpiry}. Extend the date under Admission Offers first.`);

    const [firstName, ...rest] = admission.applicantName.trim().split(/\s+/);
    const student = await Student.create({
      admissionNo: admissionNo?.trim() || await nextAdmissionNo(transaction),
      firstName,
      lastName: rest.join(' ') || '-',
      dob: admission.dob,
      gender: admission.gender,
      guardianName: admission.guardianName,
      guardianPhone: admission.guardianPhone,
      classId: admission.classId,
      // Everything collected on the application carries over to the student record.
      ...Object.fromEntries(ADMISSION_DETAIL_KEYS.filter((k) => k !== 'middleName' || admission.middleName).map((k) => [k, admission[k]])),
      remarks: admission.remarks,
      admissionDate: today(),
    }, { transaction });
    // the personal, parent, contact, address, qualification and official details collected at enquiry and application
    const carried = await loadExtras('admission', admission.id, transaction);
    await saveExtras('student', student.id, {
      ...Object.fromEntries(STUDENT_EXTRA_KEYS.filter((k) => carried[k] !== undefined).map((k) => [k, carried[k]])),
      source: admission.source, referredBy: admission.referredBy,
    }, transaction);

    const studentLogin = await createStudentLogin(student, { transaction }); // { username, password }, shown once to the office
    const items = await FeeStructure.findAll({ where: { classId: admission.classId }, transaction });
    for (const item of items) await billStudents([student.id], item, transaction);

    await admission.update({ status: 'enrolled', studentId: student.id, enrolledOn: today(), followUpOn: null }, { transaction });
    return { studentId: student.id, admissionNo: student.admissionNo, feesBilled: items.length, studentLogin };
  }).then(async (result) => {
    // the documents and photo that came with the application now belong to the student
    const notCopied = await carryOverToStudent(id, result.studentId, byName);
    const admission = await Admission.findByPk(id);
    const student = await Student.findByPk(result.studentId);
    const followUps = await applyChoices(admission, student);
    return { ...result, ...(notCopied.length && { notCopied }), ...(followUps.length && { followUps }) };
  });
}

