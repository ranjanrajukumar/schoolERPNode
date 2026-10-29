import express, { Router } from 'express';
import { Admission, Photo, Staff, Student } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { sniff } from '../files/files.service.js';

const router = Router();
const MAX_PHOTO = 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** What a photo can belong to, who may change it, and how to confirm the owner exists. The school logo is entity "school", id 0. */
const OWNERS = {
  student: { model: Student, label: 'student', who: ['admin'] },
  staff: { model: Staff, label: 'staff member', who: ['admin'] },
  enquiry: { model: Admission, label: 'enquiry', who: ['admin'] },
  student_sign: { model: Student, label: 'student', who: ['admin'] },
  father_photo: { model: Student, label: 'student', who: ['admin'] },
  father_sign: { model: Student, label: 'student', who: ['admin'] },
  mother_photo: { model: Student, label: 'student', who: ['admin'] },
  mother_sign: { model: Student, label: 'student', who: ['admin'] },
  student_thumb: { model: Student, label: 'student', who: ['admin'] },
  school: { model: null, label: 'school', who: ['admin'] },
};

const owner = (req) => {
  const kind = OWNERS[req.params.entity];
  if (!kind) throw notFound('Unknown photo owner');
  const id = kind.model ? Number(req.params.id) : 0;
  if (!Number.isInteger(id) || id < 0) throw badRequest('Invalid id');
  return { ...kind, id, entity: req.params.entity };
};

// GET /api/photos/has/student?ids=1,2,3 -> [1, 3]: which of these records have a photo, so a grid asks for pictures only where they exist.
router.get(
  '/has/:entity',
  asyncHandler(async (req, res) => {
    const kind = OWNERS[req.params.entity];
    if (!kind?.model) throw notFound('Unknown photo owner');
    if (!['admin', 'teacher', 'accountant'].includes(req.user.role)) return res.json([]);
    const ids = String(req.query.ids ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 200);
    if (!ids.length) return res.json([]);
    const rows = await Photo.findAll({
      where: { entity: req.params.entity, entityId: ids },
      attributes: ['entityId'],
    });
    res.json(rows.map((r) => r.entityId));
  }),
);

// Pictures of students and staff are not for the portals; the school logo is shown to everyone signed in.
router.get(
  '/:entity/:id',
  asyncHandler(async (req, res) => {
    const o = owner(req);
    if (o.entity !== 'school' && !['admin', 'teacher', 'accountant'].includes(req.user.role))
      throw notFound('No photo');
    const row = await Photo.findOne({
      where: { entity: o.entity, entityId: o.id },
      attributes: ['mimeType', 'data', 'updatedAt'],
    });
    if (!row) throw notFound('No photo');
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

// PUT /api/photos/student/12?name=me.jpg  with the image as the raw body. The type is judged from the bytes.
router.put(
  '/:entity/:id',
  express.raw({ type: () => true, limit: MAX_PHOTO }),
  asyncHandler(async (req, res) => {
    const o = owner(req);
    if (!o.who.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('No file received');
    const mimeType = sniff(buffer);
    if (!TYPES.includes(mimeType))
      throw badRequest('The photo must be a JPEG, PNG or WebP image of at most 1 MB');
    if (o.model && !(await o.model.findByPk(o.id, { attributes: ['id'] })))
      throw notFound(`That ${o.label} does not exist`);
    const originalName = String(req.query.name || '').slice(0, 120) || null;
    await Photo.destroy({ where: { entity: o.entity, entityId: o.id } });
    await Photo.create({
      entity: o.entity,
      entityId: o.id,
      mimeType,
      size: buffer.length,
      originalName,
      data: buffer.toString('base64'),
      uploadedByName: req.user.name,
    });
    req.body = { entity: o.entity, id: o.id, size: buffer.length }; // audit the details, not the image
    res.status(201).json({ size: buffer.length, mimeType });
  }),
);

router.delete(
  '/:entity/:id',
  asyncHandler(async (req, res) => {
    const o = owner(req);
    if (!o.who.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    if (!(await Photo.destroy({ where: { entity: o.entity, entityId: o.id } }))) throw notFound('No photo');
    res.json({ ok: true });
  }),
);

export default router;
