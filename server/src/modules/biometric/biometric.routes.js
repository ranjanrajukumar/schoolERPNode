import { Router } from 'express';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createDevice,
  deleteDevice,
  deviceForKey,
  listDevices,
  listPunches,
  recordPunches,
  rotateKey,
  updateDevice,
} from './biometric.service.js';

/** Staff screens, mounted behind sign-in. Reads for admins and teachers; managing devices is admin only. */
const router = Router();
router.use(requireRole('admin', 'teacher'));

router.get(
  '/devices',
  asyncHandler(async (req, res) =>
    res.json(await listDevices({ withKeys: req.user.role === 'admin' && !req.user.customRole })),
  ),
);
router.post(
  '/devices',
  requireRole('admin'),
  asyncHandler(async (req, res) => res.status(201).json(await createDevice(req.body))),
);
router.put(
  '/devices/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await updateDevice(req.params.id, req.body);
    res.json({ ok: true });
  }),
);
router.post(
  '/devices/:id/rotate-key',
  requireRole('admin'),
  asyncHandler(async (req, res) => res.json(await rotateKey(req.params.id))),
);
router.delete(
  '/devices/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await deleteDevice(req.params.id);
    res.json({ ok: true });
  }),
);
router.get(
  '/punches',
  asyncHandler(async (req, res) => res.json(await listPunches(req.query.date))),
);

export default router;

/**
 * The endpoint the reader itself calls, mounted before sign-in: it carries a device key, not a user token.
 * POST /api/device/punch  x-device-key: <key>  { enrollId, time? }  or  { punches: [{ enrollId, time? }] }
 */
export const deviceRouter = Router();
deviceRouter.post(
  '/punch',
  asyncHandler(async (req, res) => {
    const device = await deviceForKey(String(req.headers['x-device-key'] ?? ''));
    if (!device) return res.status(401).json({ error: 'Unknown or inactive device key' });
    res.json(await recordPunches(device, req.body?.punches ?? req.body));
  }),
);
