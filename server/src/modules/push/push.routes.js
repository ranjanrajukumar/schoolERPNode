import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forbidden } from '../../utils/httpError.js';
import {
  audienceSize,
  mySubscriptions,
  publicKey,
  sendPush,
  subscribe,
  unsubscribe,
} from './push.service.js';

// Open to every signed-in user (parents and students too) so each can switch notifications on for their own device.
// Sending is for built-in admins only.
const router = Router();
const adminOnly = (req) => {
  if (req.user.role !== 'admin' || req.user.customRole)
    throw forbidden('Only an administrator can send notifications');
};

router.get(
  '/key',
  asyncHandler(async (_req, res) => res.json({ publicKey: await publicKey() })),
);
router.get(
  '/mine',
  asyncHandler(async (req, res) => res.json({ devices: await mySubscriptions(req.user) })),
);
router.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    await subscribe(req.user, req.body, req.get('user-agent'));
    res.status(201).json({ ok: true });
  }),
);
router.post(
  '/unsubscribe',
  asyncHandler(async (req, res) => {
    await unsubscribe(req.user, req.body.endpoint);
    res.json({ ok: true });
  }),
);

router.get(
  '/audience',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    res.json(await audienceSize(req.query.audience));
  }),
);
router.post(
  '/send',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    res.json(await sendPush(req.body));
  }),
);

export default router;
