import { Router } from 'express';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  approveRequest,
  cancelRequest,
  createRequest,
  listRequests,
  rejectRequest,
  requestCatalog,
} from './requests.service.js';

// Mounted for admins and teachers: anyone on the teaching staff can ask for items; only an admin decides.
const router = Router();
const admin = requireRole('admin');

router.get(
  '/catalog',
  asyncHandler(async (_req, res) => res.json(await requestCatalog())),
);
router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listRequests(req.user, req.query))),
);
router.post(
  '/',
  asyncHandler(async (req, res) => res.status(201).json({ id: await createRequest(req.body, req.user) })),
);
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    await cancelRequest(req.params.id, req.user);
    res.json({ ok: true });
  }),
);
router.post(
  '/:id/approve',
  admin,
  asyncHandler(async (req, res) => {
    await approveRequest(req.params.id, req.body, req.user);
    res.json({ ok: true });
  }),
);
router.post(
  '/:id/reject',
  admin,
  asyncHandler(async (req, res) => {
    await rejectRequest(req.params.id, req.body, req.user);
    res.json({ ok: true });
  }),
);

export default router;
