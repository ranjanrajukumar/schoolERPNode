import express, { Router } from 'express';
import { Op } from 'sequelize';
import { AcademicYear, Photo, Setting } from '../../models/index.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { sniff } from '../files/files.service.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PAYMENT_METHODS } from '../finance/paymentRules.js';
import { describeAll, getSettings, resetSetting, saveSettings, schoolProfile } from './settings.service.js';

const router = Router();

// GET /api/settings/public -> the few values every staff screen needs
router.get(
  '/public',
  asyncHandler(async (_req, res) => {
    const v = await getSettings(['attendance.minPercent']);
    res.json({
      school: await schoolProfile(),
      attendanceMinPercent: v['attendance.minPercent'],
      paymentMethods: await PAYMENT_METHODS.enabled(),
      allowPartialPayments: await PAYMENT_METHODS.partialAllowed(),
    });
  }),
);

// ---- School profile (admin): the identity, contact, branding and academic defaults shown on the School Profile page
const MAX_LOGO = 1024 * 1024;
const logoInfo = async () => {
  const row = await Photo.findOne({
    where: { entity: 'school', entityId: 0 },
    attributes: ['originalName', 'size'],
  });
  return row && { name: row.originalName, size: row.size };
};

router.get(
  '/profile',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const [all, years, latest, logo] = await Promise.all([
      describeAll(),
      AcademicYear.findAll({ order: [['startDate', 'DESC']] }),
      Setting.findOne({ where: { key: { [Op.like]: 'school.%' } }, order: [['updatedAt', 'DESC']] }),
      logoInfo(),
    ]);
    res.json({
      fields: all.filter((f) => f.group === 'School profile'),
      years: years.map((y) => ({ id: y.id, name: y.name, isCurrent: y.isCurrent })),
      lastUpdated: latest?.updatedAt ?? null,
      logo: logo && { name: logo.name, size: logo.size },
    });
  }),
);

// PUT /api/settings/profile { values: { "school.name": "..." } } only the profile keys are accepted
router.put(
  '/profile',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const allowed = new Set(
      (await describeAll()).filter((f) => f.group === 'School profile').map((f) => f.key),
    );
    const values = req.body.values ?? {};
    const stray = Object.keys(values).find((k) => !allowed.has(k));
    if (stray) throw badRequest(`"${stray}" is not a school profile field`);
    await saveSettings(values, req.user);
    res.json({ ok: true });
  }),
);

// The logo is a PNG or JPEG of at most 1 MB, checked from the file's own bytes. Any signed-in user may see it.
router.get(
  '/logo',
  asyncHandler(async (_req, res) => {
    const row = await Photo.findOne({
      where: { entity: 'school', entityId: 0 },
      attributes: ['mimeType', 'data'],
    });
    if (!row) throw notFound('No logo has been uploaded');
    const buffer = Buffer.from(row.data, 'base64');
    res.set({
      'Content-Type': row.mimeType,
      'Content-Length': buffer.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache',
    });
    res.send(buffer);
  }),
);

// The logo lives in the photos table like every other picture (same rules: PNG, JPEG or WebP, 1 MB, judged from the bytes).
router.post(
  '/logo',
  requireRole('admin'),
  express.raw({ type: () => true, limit: MAX_LOGO }),
  asyncHandler(async (req, res) => {
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('No file received');
    const mimeType = sniff(buffer);
    if (!['image/png', 'image/jpeg'].includes(mimeType))
      throw badRequest('The logo must be a PNG or JPEG image');
    const name = String(req.query.name || 'logo').slice(0, 120);
    await Photo.destroy({ where: { entity: 'school', entityId: 0 } });
    await Photo.create({
      entity: 'school',
      entityId: 0,
      mimeType,
      size: buffer.length,
      originalName: name,
      data: buffer.toString('base64'),
      uploadedByName: req.user.name,
    });
    req.body = { name, size: buffer.length }; // audit the details, not the image
    res.status(201).json({ name, size: buffer.length });
  }),
);

router.delete(
  '/logo',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    if (!(await Photo.destroy({ where: { entity: 'school', entityId: 0 } })))
      throw notFound('No logo has been uploaded');
    res.json({ ok: true });
  }),
);

router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (_req, res) => res.json(await describeAll())),
);

// PUT /api/settings { values: { "library.loanDays": 21, ... } }
router.put(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await saveSettings(req.body.values, req.user);
    res.json({ ok: true });
  }),
);

router.post(
  '/reset',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await resetSetting(req.body.key);
    res.json({ ok: true });
  }),
);

export default router;
