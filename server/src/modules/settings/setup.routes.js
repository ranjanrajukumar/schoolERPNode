import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { classReadiness, setupStatus } from './setup.service.js';

// Mounted behind requireRole('admin'): the implementation checklist and class readiness belong to whoever sets the school up.
const router = Router();

router.get('/status', asyncHandler(async (_req, res) => res.json(await setupStatus())));
router.get('/classes', asyncHandler(async (_req, res) => res.json(await classReadiness())));

export default router;
