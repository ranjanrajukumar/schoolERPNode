import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { User } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { checkLoginAllowed, recordLoginFailure, recordLoginSuccess } from '../../middleware/loginLimiter.js';
import { recordLogin } from './loginActivity.js';
import { login } from './auth.service.js';
import { ssoLogin } from '../globalauth/globalAuth.service.js';
import { classesOf } from '../academics/myClass.service.js';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with email/mobile number and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@school.local }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Signed in; the token is used as a Bearer token on later requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { type: object }
 *       401:
 *         description: Wrong email or password
 */
router.post(
  '/login',
  checkLoginAllowed,
  asyncHandler(async (req, res) => {
    const result = await login(req.body.email, req.body.password);
    if (!result) {
      recordLoginFailure(req);
      await recordLogin(req, { email: req.body.email, success: false });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    recordLoginSuccess(req);
    await recordLogin(req, { email: req.body.email, user: result.user, success: true });
    res.json(result);
  }),
);

// POST /api/auth/sso { ticket }: sign in with the ticket the global registry gave after checking the person's mobile number or email and password.
// Used by the one mobile app that serves many schools; the ticket works once, for two minutes, and only at the school it names.
router.post(
  '/sso',
  asyncHandler(async (req, res) => {
    const { user, session } = await ssoLogin(req.body?.ticket);
    await recordLogin(req, { email: user.email, user: session.user, success: true });
    res.json(session);
  }),
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: The signed-in user's own profile and access
 *     responses:
 *       200:
 *         description: The current user, so the UI can hide what a custom role does not include
 */
// The signed-in user's current access, so the UI can hide what a custom role does not include.
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) =>
    res.json({
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      customRole: req.user.customRole ?? null,
      permissions: req.user.permissions ?? null,
      staffId: req.user.staffId,
      classes: await classesOf(req.user.staffId),
      mustChangePassword: req.user.mustChangePassword,
    }),
  ),
);

// POST /api/auth/change-password { currentPassword, newPassword }: anyone signed in, and the only thing a temporary password may do
router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof newPassword !== 'string' || newPassword.length < 8)
      throw badRequest('The new password must be at least 8 characters');
    if (newPassword === currentPassword) throw badRequest('Choose a password different from the current one');
    const user = await User.findByPk(req.user.id);
    if (!(await bcrypt.compare(String(currentPassword ?? ''), user.passwordHash)))
      throw badRequest('The current password is not correct');
    await user.update({ passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false });
    res.json({ ok: true });
  }),
);

export default router;
