import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { addItem, applyGroup, deleteGroup, deleteItem, listGroups, saveGroup } from './feeGroups.service.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => res.json(await listGroups())));
router.post('/', asyncHandler(async (req, res) => res.status(201).json({ id: await saveGroup(null, req.body) })));
router.put('/:id', asyncHandler(async (req, res) => { await saveGroup(req.params.id, req.body); res.json({ ok: true }); }));
router.delete('/:id', asyncHandler(async (req, res) => { await deleteGroup(req.params.id); res.json({ ok: true }); }));

router.post('/:id/items', asyncHandler(async (req, res) => res.status(201).json({ id: await addItem(req.params.id, req.body) })));
router.delete('/:id/items/:itemId', asyncHandler(async (req, res) => { await deleteItem(req.params.id, req.params.itemId); res.json({ ok: true }); }));

// POST /api/fee-groups/:id/apply { classId, bill? }
router.post('/:id/apply', asyncHandler(async (req, res) => res.json(await applyGroup(req.params.id, req.body))));

export default router;
