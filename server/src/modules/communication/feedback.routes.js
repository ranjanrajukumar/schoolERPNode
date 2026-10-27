import { Router } from 'express';
import { FEEDBACK_CATEGORIES } from '../../models/feedback.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { escalate, list, meta, respond, submit } from './feedback.service.js';

/**
 * Staff side. Any staff login can send feedback. An admin sees and answers everything; a class teacher or department head
 * sees and handles the level-1 grievances that are theirs; everyone sees what they sent themselves. Who may act is checked inside.
 */
const router = Router();

router.get('/categories', (_req, res) => res.json(FEEDBACK_CATEGORIES));
router.get('/meta', asyncHandler(async (_req, res) => res.json(await meta())));
router.get('/', asyncHandler(async (req, res) => res.json(await list(req.user, req.query))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await submit(req.body, { id: req.user.id, name: req.user.name, role: 'staff' }))));
router.put('/:id', asyncHandler(async (req, res) => { await respond(req.params.id, req.body, req.user); res.json({ ok: true }); }));
router.post('/:id/escalate', asyncHandler(async (req, res) => { await escalate(req.params.id, req.body, req.user); res.json({ ok: true }); }));

export default router;
