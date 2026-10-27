import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listTemplates, resetTemplate, saveTemplate } from './templates.service.js';
import { FIELDS, getDesign, resetDesign, saveDesign } from './idCardDesign.service.js';
import {
  createRequest, getPrintable, idCards, staffIdCards, issue, listRequests, reject, remove,
} from './documents.service.js';

const router = Router();

// Certificate wording (declared before /:id routes)
router.get('/templates', asyncHandler(async (_req, res) => res.json(await listTemplates())));
router.put('/templates/:type', asyncHandler(async (req, res) => { await saveTemplate(req.params.type, req.body, req.user.name); res.json({ ok: true }); }));
router.delete('/templates/:type', asyncHandler(async (req, res) => { await resetTemplate(req.params.type); res.json({ ok: true }); }));

// GET /api/documents?status=&type=&studentId=
router.get('/', asyncHandler(async (req, res) => res.json(await listRequests(req.query))));

// ID card design (colours, what is shown) for student and staff cards, set once under Settings
router.get('/id-card-design', asyncHandler(async (_req, res) => res.json({ design: await getDesign(), fields: FIELDS })));
router.put('/id-card-design', asyncHandler(async (req, res) => { const design = await saveDesign(req.body, req.user.name); req.body = { updated: true }; res.json({ design }); }));
router.delete('/id-card-design', asyncHandler(async (_req, res) => res.json({ design: await resetDesign() })));
router.get('/staff-id-cards', asyncHandler(async (req, res) => res.json(await staffIdCards(req.query))));

// GET /api/documents/id-cards?classId=  (declared before /:id so "id-cards" is not read as an id)
router.get('/id-cards', asyncHandler(async (req, res) => res.json(await idCards(req.query))));

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({ id: await createRequest(req.body, req.user.id, 'staff') });
}));

// POST /api/documents/:id/issue { remarks?, conduct?, leavingDate?, leavingReason?, override? }
router.post('/:id/issue', asyncHandler(async (req, res) => res.json(await issue(req.params.id, req.body, req.user))));

router.post('/:id/reject', asyncHandler(async (req, res) => {
  await reject(req.params.id, req.body, req.user);
  res.json({ ok: true });
}));

router.get('/:id/print', asyncHandler(async (req, res) => res.json(await getPrintable(req.params.id))));

router.delete('/:id', asyncHandler(async (req, res) => {
  await remove(req.params.id);
  res.json({ ok: true });
}));

export default router;
