import { Router } from 'express';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest } from '../../utils/httpError.js';
import { balances, createType, deleteType, listTypes, updateType } from './leaveTypes.service.js';

/** Leave setup. Every staff login reads the types (the leave forms need them); only an admin changes them. */
const router = Router();

router.get('/', asyncHandler(async (req, res) => res.json(await listTypes({ kind: req.query.kind, all: req.query.all === '1' && req.user.role === 'admin' }))));
router.get('/balances', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => {
  if (req.query.kind === 'staff' && req.user.role !== 'admin') throw badRequest('Staff leave balances are for admins');
  res.json(await balances(req.query.kind, req.query.year ? Number(req.query.year) : undefined));
}));
router.post('/', requireRole('admin'), asyncHandler(async (req, res) => res.status(201).json({ id: await createType(req.body) })));
router.put('/:id', requireRole('admin'), asyncHandler(async (req, res) => { await updateType(req.params.id, req.body); res.json({ ok: true }); }));
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => { await deleteType(req.params.id); res.json({ ok: true }); }));

export default router;
