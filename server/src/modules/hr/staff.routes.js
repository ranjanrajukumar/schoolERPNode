import { Router } from 'express';
import { Department, Payslip, Photo, Staff } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { nextStaffNo } from './staffNumber.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { STAFF_DETAILS, STAFF_DETAIL_KEYS, visibleDetailKeys } from './staffFields.js';

// Mounted with writeRoles('admin'): any staff role may read, only admins change. What a reader sees depends on their role.
const router = Router();

const CORE = ['staffNo', 'firstName', 'lastName', 'designation', 'departmentId', 'phone', 'email', 'joinDate', 'status'];
const WRITABLE = [...CORE, ...STAFF_DETAIL_KEYS];
const blank = (v) => v === undefined || v === null || v === '';
const include = [{ model: Department, attributes: ['name'] }];

const shape = (staff, role) => {
  const { Department: dept, ...row } = staff.toJSON();
  const allowed = new Set([...Object.keys(row).filter((k) => !STAFF_DETAIL_KEYS.includes(k)), ...visibleDetailKeys(role)]);
  return { ...Object.fromEntries(Object.entries(row).filter(([k]) => allowed.has(k))), departmentName: dept?.name ?? null };
};

/** Problems with a staff payload; empty when valid. Also used by the bulk staff import so both follow the same rules. */
export function problems(body, { partial = false } = {}) {
  const errors = [];
  for (const [key, label] of [['firstName', 'First name'], ['lastName', 'Last name']]) {
    if ((!partial && blank(body[key])) || (body[key] !== undefined && String(body[key]).trim() === '')) errors.push(`${label} is required`);
  }
  for (const f of STAFF_DETAILS) {
    const v = body[f.key];
    if (blank(v)) continue;
    if (f.max && String(v).length > f.max) errors.push(`${f.label} must be ${f.max} characters or fewer`);
    if (f.oneOf && !f.oneOf.includes(v)) errors.push(`${f.label} is invalid`);
  }
  if (!blank(body.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('Email is invalid');
  for (const [key, label] of [['phone', 'Phone'], ['emergencyPhone', 'Emergency phone']]) {
    if (!blank(body[key]) && !/^[0-9+\-\s()]{7,20}$/.test(body[key])) errors.push(`${label} is invalid`);
  }
  if (!blank(body.pincode) && !/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(body.pincode)) errors.push('PIN / postal code is invalid');
  if (!blank(body.nationalId) && !/^[A-Za-z0-9-]{4,20}$/.test(body.nationalId)) errors.push('Aadhaar / national ID must be 4 to 20 letters, digits or dashes');
  if (!blank(body.bankAccountNo) && !/^[0-9A-Za-z-]{6,30}$/.test(body.bankAccountNo)) errors.push('Bank account number is invalid');
  for (const [key, label] of [['dob', 'Date of birth'], ['joinDate', 'Joining date']]) {
    if (!blank(body[key]) && Number.isNaN(new Date(body[key]).getTime())) errors.push(`${label} is invalid`);
  }
  if (!blank(body.dob) && new Date(body.dob) > new Date()) errors.push('Date of birth cannot be in the future');
  if (!blank(body.experienceYears) && !(Number(body.experienceYears) >= 0 && Number(body.experienceYears) <= 80)) errors.push('Years of experience must be between 0 and 80');
  if (!blank(body.status) && !['active', 'inactive'].includes(body.status)) errors.push('Status is invalid');
  if (!blank(body.departmentId) && !blank(body.departmentId) && !Number.isInteger(Number(body.departmentId))) errors.push('Department is invalid');
  return errors;
}

const pick = (body) => Object.fromEntries(WRITABLE.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]));

router.get('/', asyncHandler(async (req, res) => {
  const rows = await Staff.findAll({ include, order: [['id', 'DESC']] });
  res.json(rows.map((s) => shape(s, req.user.role)));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const staff = await Staff.findByPk(req.params.id, { include });
  if (!staff) throw notFound('Staff member not found');
  res.json(shape(staff, req.user.role));
}));

router.post('/', asyncHandler(async (req, res) => {
  const errors = problems(req.body);
  if (errors.length) throw badRequest(errors[0]);
  const data = pick(req.body);
  if (!data.staffNo) data.staffNo = await nextStaffNo();
  res.status(201).json({ id: (await Staff.create(data)).id });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const errors = problems(req.body, { partial: true });
  if (errors.length) throw badRequest(errors[0]);
  const staff = await Staff.findByPk(req.params.id);
  if (!staff) throw notFound('Staff member not found');
  const data = pick(req.body);
  if (!data.staffNo) delete data.staffNo; // the number is never blanked
  await staff.update(data);
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (await Payslip.count({ where: { staffId: req.params.id } })) throw conflict('This staff member has payslips on record. Mark them inactive instead of deleting.');
  await Staff.destroy({ where: { id: req.params.id } });
  await Photo.destroy({ where: { entity: 'staff', entityId: req.params.id } });
  res.json({ ok: true });
}));

export default router;
