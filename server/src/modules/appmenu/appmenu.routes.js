import express, { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest } from '../../utils/httpError.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import {
  MAX_ICON_BYTES,
  clearImage,
  listForAdmin,
  menuFor,
  resetMenu,
  setImage,
  updateItem,
} from './appmenu.service.js';

const router = Router();
const admin = requireRole('admin');

// GET /api/app-menu -> the mobile app's menu for the signed-in person (every role, parents and students included)
router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await menuFor(req.user.role))),
);

// GET /api/app-menu/admin?audience=staff|family -> every item with its settings, for the editor
router.get(
  '/admin',
  admin,
  asyncHandler(async (req, res) => res.json(await listForAdmin(req.query.audience ?? 'staff'))),
);

// PUT /api/app-menu/:id { label?, icon?, position?, active?, roles? }
router.put(
  '/:id',
  admin,
  asyncHandler(async (req, res) => res.json(await updateItem(req.params.id, req.body ?? {}))),
);

// PUT /api/app-menu/:id/image with the picture as the raw body; the type is judged from its bytes
router.put(
  '/:id/image',
  admin,
  express.raw({ type: () => true, limit: MAX_ICON_BYTES + 1024 }),
  asyncHandler(async (req, res) => {
    const item = await setImage(req.params.id, req.body);
    req.body = { id: item.id, key: item.key, picture: 'uploaded' }; // audit the fact, not the bytes
    res.json(item);
  }),
);

router.delete(
  '/:id/image',
  admin,
  asyncHandler(async (req, res) => res.json(await clearImage(req.params.id))),
);

// POST /api/app-menu/reset?audience=staff&confirm=RESET puts that menu back to the built-in defaults
router.post(
  '/reset',
  admin,
  asyncHandler(async (req, res) => {
    if (req.query.confirm !== 'RESET')
      throw badRequest('Add confirm=RESET to put the menu back to its defaults');
    res.json(await resetMenu(req.query.audience));
  }),
);

export default router;
