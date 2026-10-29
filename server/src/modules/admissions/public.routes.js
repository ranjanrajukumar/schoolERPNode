import { Router } from 'express';
import { AcademicYear, Admission, SchoolClass } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { HttpError, badRequest } from '../../utils/httpError.js';
import { checkDetails } from './admissions.service.js';

/**
 * The only unauthenticated write in the API: a family submits an enquiry from the school website.
 * Nothing it creates is visible to the public; staff review it under Admissions. Limited per address
 * (in memory, like the sign-in limiter) so the form cannot be used to flood the office.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_ADDRESS = 5;
const seen = new Map();

function limited(req, _res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = seen.get(key);
  if (!entry || entry.resetAt <= now) seen.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else if (entry.count >= MAX_PER_ADDRESS)
    return next(new HttpError(429, 'Too many applications from this address. Please try again later.'));
  else entry.count += 1;
  return next();
}

const PUBLIC_EXTRA = [
  'middleName',
  'fatherName',
  'fatherPhone',
  'motherName',
  'motherPhone',
  'email',
  'address',
  'city',
  'state',
  'pincode',
  'previousSchool',
  'previousClass',
  'nationality',
];

const router = Router();

router.get(
  '/classes',
  asyncHandler(async (_req, res) => {
    const classes = await SchoolClass.findAll({
      order: [
        ['name', 'ASC'],
        ['section', 'ASC'],
      ],
    });
    res.json(classes.map((c) => ({ id: c.id, label: `${c.name}-${c.section}` })));
  }),
);

router.post(
  '/apply',
  limited,
  asyncHandler(async (req, res) => {
    const { applicantName, dob, gender, guardianName, guardianPhone, classId, remarks } = req.body ?? {};
    // Only these extra fields are accepted from the public, each checked like the office form.
    const extra = Object.fromEntries(
      PUBLIC_EXTRA.filter((k) => req.body?.[k]).map((k) => [k, String(req.body[k]).trim()]),
    );
    await checkDetails({ ...extra, dob, gender, guardianPhone, applicantName, remarks });
    if (!String(applicantName ?? '').trim()) throw badRequest("Applicant's name is required");
    if (!String(guardianName ?? '').trim() || !String(guardianPhone ?? '').trim())
      throw badRequest('Guardian name and phone are required');
    if (gender && !['male', 'female', 'other'].includes(gender)) throw badRequest('Unknown gender');
    if (!classId) throw badRequest('Class applying for is required');
    if (!(await SchoolClass.findByPk(classId))) throw badRequest('Unknown class');
    const year = await AcademicYear.findOne({ where: { isCurrent: true }, attributes: ['name'] });
    await Admission.create({
      applicantName: String(applicantName).trim().slice(0, 160),
      dob: dob || null,
      gender: gender || null,
      guardianName: String(guardianName).trim().slice(0, 120),
      guardianPhone: String(guardianPhone).trim().slice(0, 20),
      ...extra,
      classId,
      academicYear: year?.name ?? null,
      remarks: remarks ? String(remarks).slice(0, 255) : null,
      source: 'online',
    });
    res.status(201).json({ ok: true });
  }),
);

export default router;
