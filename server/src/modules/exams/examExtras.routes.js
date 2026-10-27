import { Router } from 'express';
import { ExamGroup } from '../../models/index.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { loadGrading } from './grading.js';
import {
  assignExam, decideRevaluation, getGroupResults, listGroups, listRevaluations, meritList, requestRevaluation, saveGrading,
} from './examExtras.service.js';

// Mounted at /api/exams before the main exam router, so these fixed paths win over /:id.
const router = Router();
const admin = requireRole('admin');

/* Grade setup */
router.get('/grading', asyncHandler(async (_req, res) => {
  const g = await loadGrading();
  res.json({ passPercent: g.passPercent, bands: g.bands, isDefault: g.isDefault });
}));
router.put('/grading', admin, asyncHandler(async (req, res) => {
  await saveGrading(req.body);
  res.json({ ok: true });
}));

/* Exam groups */
router.get('/groups', asyncHandler(async (_req, res) => res.json(await listGroups())));
router.post('/groups', admin, asyncHandler(async (req, res) => {
  const { classId, name } = req.body;
  if (!classId || !String(name ?? '').trim()) throw badRequest('Class and name are required');
  res.status(201).json({ id: (await ExamGroup.create({ classId, name: name.trim() })).id });
}));
router.delete('/groups/:id', admin, asyncHandler(async (req, res) => {
  if (!(await ExamGroup.destroy({ where: { id: req.params.id } }))) throw notFound('Exam group not found');
  res.json({ ok: true });
}));
router.get('/groups/:id/results', asyncHandler(async (req, res) => res.json(await getGroupResults(req.params.id))));

// POST /api/exams/assign { examId, groupId|null, weight? }
router.post('/assign', admin, asyncHandler(async (req, res) => {
  await assignExam(req.body.examId, req.body.groupId, req.body.weight);
  res.json({ ok: true });
}));

/* Merit list: ?examId= or ?groupId=, &limit= */
router.get('/merit', asyncHandler(async (req, res) => res.json(await meritList(req.query))));

/* Revaluation */
router.get('/revaluations', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => res.json(await listRevaluations(req.query))));
router.post('/revaluations', admin, asyncHandler(async (req, res) => {
  res.status(201).json({ id: await requestRevaluation(req.body, req.user.id) });
}));
router.post('/revaluations/:id/accept', admin, asyncHandler(async (req, res) => {
  await decideRevaluation(req.params.id, 'accepted', req.body, req.user);
  res.json({ ok: true });
}));
router.post('/revaluations/:id/reject', admin, asyncHandler(async (req, res) => {
  await decideRevaluation(req.params.id, 'rejected', req.body, req.user);
  res.json({ ok: true });
}));

export default router;
