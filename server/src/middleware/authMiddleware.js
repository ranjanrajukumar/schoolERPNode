import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role, User } from '../models/index.js';
import { permits } from '../modules/platform/access.js';
import { rightsAllow } from '../modules/platform/rights.service.js';
import { setCurrentUser } from '../utils/requestContext.js';

/**
 * Verifies the token, then loads the user from the database so a deleted account or a changed role
 * takes effect immediately instead of when the token expires. The role always comes from the database.
 */
export async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  let user = null;
  try {
    const payload = jwt.verify(token, env.jwtSecret());
    user = await User.findByPk(payload.id, {
      attributes: ['id', 'name', 'role', 'roleId', 'staffId', 'mustChangePassword'],
      include: [{ model: Role, attributes: ['name', 'baseRole', 'permissions'], required: false }],
    });
  } catch (err) {
    // A bad or expired token is the caller's problem; a database outage is ours.
    if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) return next(err);
  }
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  // A custom role is its base role narrowed to some modules: it can never do more than the base role, only less.
  // a temporary password must be replaced first: only the sign-in and password endpoints work until then
  if (user.mustChangePassword && !req.originalUrl.startsWith('/api/auth/'))
    return res.status(403).json({ error: 'Please change your password first.', mustChangePassword: true });
  setCurrentUser(user.name); // the audit columns on whatever this request saves or deletes
  req.user = {
    id: user.id,
    name: user.name,
    role: user.Role?.baseRole ?? user.role,
    staffId: user.staffId ?? null,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
  if (user.roleId) {
    req.user.customRole = user.Role?.name ?? null;
    req.user.permissions = user.Role ? JSON.parse(user.Role.permissions) : {}; // a role that vanished grants nothing
    if (!permits(req.user.permissions, req.method, req.originalUrl))
      return res.status(403).json({ error: 'Your role does not include this area' });
  }
  // actions an admin switched off for this role on the Role Rights page (create, edit, delete, approve, export); none by default
  if (!(await rightsAllow(req.user.role, req.method, req.originalUrl)))
    return res.status(403).json({ error: 'Your role is not allowed to do this here' });
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' });

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Any signed-in user may read; only the listed roles may create, change or delete. */
export const writeRoles =
  (...roles) =>
  (req, res, next) =>
    READ_METHODS.has(req.method) || roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ error: 'Forbidden' });
