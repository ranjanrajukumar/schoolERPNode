import fs from 'node:fs';
import os from 'node:os';
import { Router } from 'express';
import { SupportTicket } from '../../models/index.js';
import { TICKET_CATEGORIES, TICKET_STATUSES } from '../../models/supportTicket.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../../utils/httpError.js';
import { getSetting } from '../settings/settings.service.js';

const router = Router();
const pkg = JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));

// GET /api/support  an admin sees every request, anyone else only their own
router.get('/', asyncHandler(async (req, res) => {
  const where = req.user.role === 'admin' && !req.user.customRole ? {} : { createdBy: req.user.id };
  res.json(await SupportTicket.findAll({ where, order: [['id', 'DESC']], limit: 300 }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { subject, category = 'question', message } = req.body;
  if (!String(subject ?? '').trim()) throw badRequest('Subject is required');
  if (!String(message ?? '').trim()) throw badRequest('Describe your request');
  if (!TICKET_CATEGORIES.includes(category)) throw badRequest('Category is invalid');
  const ticket = await SupportTicket.create({
    subject: subject.trim().slice(0, 160), category, message: String(message).trim().slice(0, 5000), createdBy: req.user.id, createdByName: req.user.name,
  });
  res.status(201).json({ id: ticket.id });
}));

// PUT /api/support/:id { status, response }  built-in admins only
router.put('/:id', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' || req.user.customRole) throw forbidden('Only an administrator can answer requests');
  const ticket = await SupportTicket.findByPk(req.params.id);
  if (!ticket) throw notFound('Request not found');
  const { status, response } = req.body;
  if (!TICKET_STATUSES.includes(status)) throw badRequest('Status is invalid');
  await ticket.update({
    status, response: String(response ?? '').trim() || null, respondedByName: String(response ?? '').trim() ? req.user.name : ticket.respondedByName,
  });
  res.json({ ok: true });
}));

// GET /api/support/about  version and environment facts for the About page (nothing secret)
router.get('/about', asyncHandler(async (_req, res) => {
  res.json({
    name: 'School ERP', version: pkg.version, school: await getSetting('school.name'),
    node: process.version, platform: `${os.type()} ${os.release()}`, uptimeHours: Math.round((process.uptime() / 3600) * 10) / 10,
    environment: process.env.NODE_ENV || 'development',
  });
}));

export default router;
