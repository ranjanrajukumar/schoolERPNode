import { Router } from 'express';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createArea, deleteArea, getGrades, getProgressCard, listAreas, saveGrades } from './progress.service.js';

/** Co-scholastic grading and the holistic progress card. Admins and teachers grade; only admins change the list of areas. */
const router = Router();

router.get('/areas', asyncHandler(async (_req, res) => res.json(await listAreas())));
router.post('/areas', requireRole('admin'), asyncHandler(async (req, res) => res.status(201).json({ id: await createArea(req.body) })));
router.delete('/areas/:id', requireRole('admin'), asyncHandler(async (req, res) => { await deleteArea(req.params.id); res.json({ ok: true }); }));

router.get('/groups/:groupId/grades', asyncHandler(async (req, res) => res.json(await getGrades(req.params.groupId))));
router.post('/groups/:groupId/grades', asyncHandler(async (req, res) => res.json({ saved: await saveGrades(req.params.groupId, req.body.records) })));

router.get('/groups/:groupId/card/:studentId', asyncHandler(async (req, res) => res.json(await getProgressCard(req.params.groupId, req.params.studentId))));

export default router;
