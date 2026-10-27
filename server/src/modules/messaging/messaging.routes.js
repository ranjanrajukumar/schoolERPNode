import { Router } from 'express';
import { MessageTemplate } from '../../models/index.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/httpError.js';
import {
  broadcast, listHistory, previewFeeReminders, resolveAudience, saveTemplate, sendFeeReminders, sendMessage, status,
} from './messaging.service.js';

const router = Router();
const admin = requireRole('admin');
const finance = requireRole('admin', 'accountant');

// Which providers are live (never secrets), so the UI can say whether messages are really delivered.
router.get('/status', requireRole('admin', 'accountant', 'teacher'), asyncHandler(async (_req, res) => res.json(await status())));

router.get('/history', admin, asyncHandler(async (req, res) => res.json(await listHistory(req.query))));

// POST /api/messaging/send { channel, to, toName?, subject?, body }
router.post('/send', admin, asyncHandler(async (req, res) => {
  const { channel, to, toName, subject, body } = req.body;
  res.status(201).json(await sendMessage({ channel, to, toName, subject, body, sentByName: req.user.name }));
}));

// GET /api/messaging/audience?channel=&classId= -> how many people a broadcast would reach
router.get('/audience', admin, asyncHandler(async (req, res) => {
  const { recipients, skipped } = await resolveAudience(req.query);
  res.json({ reachable: recipients.length, skipped });
}));

// POST /api/messaging/broadcast { channel, classId?, subject?, body } with {{guardian}} {{student}} {{class}} {{school}}
router.post('/broadcast', admin, asyncHandler(async (req, res) => {
  res.json(await broadcast(req.body, req.user.name));
}));

router.get('/templates', admin, asyncHandler(async (_req, res) => res.json(await MessageTemplate.findAll({ order: [['name', 'ASC']] }))));
router.post('/templates', admin, asyncHandler(async (req, res) => res.status(201).json({ id: await saveTemplate(null, req.body) })));
router.put('/templates/:id', admin, asyncHandler(async (req, res) => { await saveTemplate(req.params.id, req.body); res.json({ ok: true }); }));
router.delete('/templates/:id', admin, asyncHandler(async (req, res) => {
  if (!(await MessageTemplate.destroy({ where: { id: req.params.id } }))) throw notFound('Template not found');
  res.json({ ok: true });
}));

router.get('/fee-reminders', finance, asyncHandler(async (req, res) => res.json(await previewFeeReminders(req.query))));
router.post('/fee-reminders', finance, asyncHandler(async (req, res) => res.json(await sendFeeReminders(req.body, req.user.name))));

export default router;
