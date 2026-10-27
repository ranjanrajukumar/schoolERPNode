import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  addApplicant, changeApplicantStatus, deleteApplicant, deleteOpening, hire, listApplicants, listOpenings, saveOpening,
} from './recruitment.service.js';

// Mounted behind requireRole('admin').
const router = Router();

router.get('/openings', asyncHandler(async (_req, res) => res.json(await listOpenings())));
router.post('/openings', asyncHandler(async (req, res) => res.status(201).json({ id: await saveOpening(null, req.body) })));
router.put('/openings/:id', asyncHandler(async (req, res) => { await saveOpening(req.params.id, req.body); res.json({ ok: true }); }));
router.delete('/openings/:id', asyncHandler(async (req, res) => { await deleteOpening(req.params.id); res.json({ ok: true }); }));

router.get('/applicants', asyncHandler(async (req, res) => res.json(await listApplicants(req.query))));
router.post('/applicants', asyncHandler(async (req, res) => res.status(201).json({ id: await addApplicant(req.body) })));
router.post('/applicants/:id/status', asyncHandler(async (req, res) => { await changeApplicantStatus(req.params.id, req.body.status); res.json({ ok: true }); }));
router.post('/applicants/:id/hire', asyncHandler(async (req, res) => res.json(await hire(req.params.id, req.body))));
router.delete('/applicants/:id', asyncHandler(async (req, res) => { await deleteApplicant(req.params.id); res.json({ ok: true }); }));

export default router;
