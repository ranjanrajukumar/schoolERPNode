import { Router } from 'express';
import { SchoolClass, StudyMaterial, Subject } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';

const router = Router();
const FIELDS = ['classId', 'subjectId', 'title', 'url', 'description'];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]));

const include = [{ model: SchoolClass, attributes: ['name', 'section'] }, { model: Subject, attributes: ['name'] }];

export function shape(m) {
  return {
    id: m.id,
    classId: m.classId,
    subjectId: m.subjectId,
    title: m.title,
    url: m.url,
    description: m.description,
    createdByName: m.createdByName,
    createdAt: m.createdAt,
    className: m.SchoolClass ? `${m.SchoolClass.name}-${m.SchoolClass.section}` : null,
    subjectName: m.Subject?.name ?? null,
  };
}

export const materialInclude = include;

// GET /api/study-materials?classId=&subjectId=
router.get('/', asyncHandler(async (req, res) => {
  const { classId, subjectId } = req.query;
  const rows = await StudyMaterial.findAll({
    where: { ...(classId && { classId }), ...(subjectId && { subjectId }) }, include, order: [['id', 'DESC']],
  });
  res.json(rows.map(shape));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (!data.classId || !data.subjectId || !String(data.title ?? '').trim() || !data.url) {
    throw badRequest('Class, subject, title and link are required');
  }
  const row = await StudyMaterial.create({ ...data, createdByName: req.user.name });
  res.status(201).json({ id: row.id });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const row = await StudyMaterial.findByPk(req.params.id);
  if (!row) throw notFound('Material not found');
  await row.update(pick(req.body));
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const row = await StudyMaterial.findByPk(req.params.id);
  if (!row) throw notFound('Material not found');
  if (req.user.role !== 'admin' && row.createdByName !== req.user.name) throw conflict('You can only delete materials you added');
  await row.destroy();
  res.json({ ok: true });
}));

export default router;
