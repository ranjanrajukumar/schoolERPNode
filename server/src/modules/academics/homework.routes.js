import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createHomework,
  deleteHomework,
  getSubmissions,
  listHomework,
  saveSubmissions,
  updateHomework,
} from './homework.service.js';

const router = Router();

// GET /api/homework?classId=&subjectId=
router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listHomework(req.query))),
);

router.post(
  '/',
  asyncHandler(async (req, res) => res.status(201).json({ id: await createHomework(req.body, req.user) })),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    await updateHomework(req.params.id, req.body);
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteHomework(req.params.id, req.user);
    res.json({ ok: true });
  }),
);

router.get(
  '/:id/submissions',
  asyncHandler(async (req, res) => res.json(await getSubmissions(req.params.id))),
);

// POST /api/homework/:id/submissions { records: [{ studentId, status, marks?, remarks? }] }
router.post(
  '/:id/submissions',
  asyncHandler(async (req, res) => {
    res.json({ saved: await saveSubmissions(req.params.id, req.body.records) });
  }),
);

export default router;
