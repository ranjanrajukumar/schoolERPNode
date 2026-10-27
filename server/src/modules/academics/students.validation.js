import { SchoolClass } from '../../models/index.js';
import { DETAIL_FIELDS } from './studentFields.js';

const GENDERS = ['male', 'female', 'other'];
const STATUSES = ['active', 'inactive'];
const REGISTRATION_STATUSES = ['complete', 'pending', 'under_review'];
const blank = (v) => v === undefined || v === null || v === '';

/** Returns a list of problems with a student payload; empty when valid. `partial` skips required checks. */
export async function validateStudent(body, { partial = false } = {}) {
  const errors = [];

  for (const [field, label] of [['admissionNo', 'Admission no'], ['firstName', 'First name'], ['lastName', 'Last name']]) {
    if (!partial && blank(body[field])) errors.push(`${label} is required`);
    else if (body[field] !== undefined && !partial && String(body[field]).trim() === '') errors.push(`${label} is required`);
  }

  if (!blank(body.gender) && !GENDERS.includes(body.gender)) errors.push('Gender is invalid');
  if (!blank(body.status) && !STATUSES.includes(body.status)) errors.push('Status is invalid');
  if (!blank(body.registrationStatus) && !REGISTRATION_STATUSES.includes(body.registrationStatus)) errors.push('Registration status must be complete, pending or under_review');

  if (!blank(body.dob)) {
    const dob = new Date(body.dob);
    if (Number.isNaN(dob.getTime())) errors.push('Date of birth is invalid');
    else if (dob > new Date()) errors.push('Date of birth cannot be in the future');
  }

  if (!blank(body.guardianPhone) && !/^[0-9+\-\s()]{7,20}$/.test(body.guardianPhone)) {
    errors.push('Guardian phone is invalid');
  }

  if (!blank(body.classId) && !(await SchoolClass.findByPk(body.classId))) errors.push('Class does not exist');

  // Registration details: lengths first (so a long value is a clear message, not a database error), then formats.
  for (const f of DETAIL_FIELDS) {
    if (f.max && !blank(body[f.key]) && String(body[f.key]).length > f.max) errors.push(`${f.label} must be ${f.max} characters or fewer`);
  }
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE = /^[0-9+\-\s()]{7,20}$/;
  for (const [key, label] of [['email', 'Student email'], ['guardianEmail', 'Guardian email']]) {
    if (!blank(body[key]) && !EMAIL.test(body[key])) errors.push(`${label} is invalid`);
  }
  for (const [key, label] of [['phone', 'Student phone'], ['fatherPhone', "Father's phone"], ['motherPhone', "Mother's phone"], ['secondaryGuardianPhone', 'Secondary contact']]) {
    if (!blank(body[key]) && !PHONE.test(body[key])) errors.push(`${label} is invalid`);
  }
  if (!blank(body.pincode) && !/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(body.pincode)) errors.push('PIN / postal code is invalid');
  if (!blank(body.nationalId) && !/^[A-Za-z0-9-]{4,20}$/.test(body.nationalId)) errors.push('Aadhaar / national ID must be 4 to 20 letters, digits or dashes');
  if (!blank(body.admissionDate)) {
    const d = new Date(body.admissionDate);
    if (Number.isNaN(d.getTime())) errors.push('Date of admission is invalid');
    else if (d > new Date()) errors.push('Date of admission cannot be in the future');
  }
  if (!blank(body.previousPercent) && !(Number(body.previousPercent) >= 0 && Number(body.previousPercent) <= 100)) errors.push('Last result must be between 0 and 100');

  return errors;
}
