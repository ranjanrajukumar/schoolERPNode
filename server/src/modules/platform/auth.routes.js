import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { User } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { checkLoginAllowed, recordLoginFailure, recordLoginSuccess } from '../../middleware/loginLimiter.js';
import { recordLogin } from './loginActivity.js';
import { login } from './auth.service.js';
import { classesOf } from '../academics/myClass.service.js';

const router = Router();

router.post('/login', checkLoginAllowed, asyncHandler(async (req, res) => {
  const result = await login(req.body.email, req.body.password);
  if (!result) {
    recordLoginFailure(req);
    await recordLogin(req, { email: req.body.email, success: false });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  recordLoginSuccess(req);
  await recordLogin(req, { email: req.body.email, user: result.user, success: true });
  res.json(result);
}));

// The signed-in user's current access, so the UI can hide what a custom role does not include.
router.get('/me', requireAuth, asyncHandler(async (req, res) => res.json({
  id: req.user.id, name: req.user.name, role: req.user.role, customRole: req.user.customRole ?? null, permissions: req.user.permissions ?? null,
  staffId: req.user.staffId, classes: await classesOf(req.user.staffId), mustChangePassword: req.user.mustChangePassword,
})));

// POST /api/auth/change-password { currentPassword, newPassword }: anyone signed in, and the only thing a temporary password may do
router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof newPassword !== 'string' || newPassword.length < 8) throw badRequest('The new password must be at least 8 characters');
  if (newPassword === currentPassword) throw badRequest('Choose a password different from the current one');
  const user = await User.findByPk(req.user.id);
  if (!(await bcrypt.compare(String(currentPassword ?? ''), user.passwordHash))) throw badRequest('The current password is not correct');
  await user.update({ passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false });
  res.json({ ok: true });
}));

export default router;
