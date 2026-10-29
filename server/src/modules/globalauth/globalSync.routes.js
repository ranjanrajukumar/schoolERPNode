import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { globalStatus, pushAll } from './globalAuth.service.js';

const router = Router();

// GET /api/global-sync -> whether this school is connected to the global registry and when its logins were last reported
router.get(
  '/',
  asyncHandler(async (_req, res) => res.json(globalStatus())),
);

// POST /api/global-sync -> report every login to the registry now, instead of waiting for the next regular push
router.post(
  '/',
  asyncHandler(async (_req, res) => {
    const result = await pushAll();
    res.json(
      result.skipped
        ? { skipped: true, reason: 'GLOBAL_URL, GLOBAL_CLIENT_CODE and GLOBAL_CLIENT_KEY are not all set' }
        : result,
    );
  }),
);

export default router;
