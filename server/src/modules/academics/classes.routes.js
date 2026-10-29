import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  academicsOverview,
  classMap,
  createClass,
  deleteClass,
  getClass,
  listClasses,
  updateClass,
} from './classes.service.js';

const router = Router();

const problems = (body, { partial = false } = {}) => {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!String(body.name ?? '').trim()) errors.push('Class name is required');
    else if (String(body.name).trim().length > 50) errors.push('Class name is too long');
  }
  if (!partial || body.section !== undefined) {
    if (!String(body.section ?? '').trim()) errors.push('Section is required');
    else if (String(body.section).trim().length > 10) errors.push('Section is too long');
  }
  return errors;
};

router.get(
  '/',
  asyncHandler(async (_req, res) => res.json(await listClasses())),
);

// Tiles and one row per class for the Academics overview page (declared before /:id)
router.get(
  '/:id/map',
  asyncHandler(async (req, res) => {
    const map = await classMap(req.params.id);
    if (!map) return res.status(404).json({ error: 'Class not found' });
    res.json(map);
  }),
);
router.get(
  '/overview',
  asyncHandler(async (_req, res) => res.json(await academicsOverview())),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const cls = await getClass(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    res.json(cls);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const errors = problems(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    res.status(201).json({ id: await createClass(req.body) });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const errors = problems(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    if (!(await updateClass(req.params.id, req.body)))
      return res.status(404).json({ error: 'Class not found' });
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await deleteClass(req.params.id);
    if (result === 'missing') return res.status(404).json({ error: 'Class not found' });
    if (result === 'in-use')
      return res.status(409).json({ error: 'Move or remove the students in this class first' });
    res.json({ ok: true });
  }),
);

export default router;
