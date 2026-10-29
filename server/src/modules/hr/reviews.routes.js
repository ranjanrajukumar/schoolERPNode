import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createReview, deleteReview, finalizeReview, listReviews, updateReview } from './reviews.service.js';

// Mounted behind requireRole('admin').
const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listReviews(req.query))),
);
router.post(
  '/',
  asyncHandler(async (req, res) => res.status(201).json({ id: await createReview(req.body) })),
);
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    await updateReview(req.params.id, req.body);
    res.json({ ok: true });
  }),
);
router.post(
  '/:id/finalize',
  asyncHandler(async (req, res) => {
    await finalizeReview(req.params.id);
    res.json({ ok: true });
  }),
);
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteReview(req.params.id);
    res.json({ ok: true });
  }),
);

export default router;
