import { Router } from 'express';
import { AppMenuItem } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest } from '../../utils/httpError.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { MODULES } from './access.js';
import { ACTIONS, PORTAL_AREAS, rightsOfRole, saveRight } from './rights.service.js';

const router = Router();
const RIGHT_ROLES = ['teacher', 'accountant', 'parent', 'student'];
const FAMILY = ['parent', 'student'];
const EVERY_ROLE = ['admin', 'teacher', 'accountant', 'parent', 'student'];
const splitRoles = (text) =>
  text
    ? text
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    : null;

// GET /api/role-rights/mine -> { moduleKey: { view, create, edit, delete, approve, export } } for the signed-in role (the buttons to show)
router.get(
  '/mine',
  asyncHandler(async (req, res) =>
    res.json(await rightsOfRole(req.user.role, FAMILY.includes(req.user.role) ? PORTAL_AREAS : MODULES)),
  ),
);

// GET /api/role-rights?role=teacher -> every module with whether its menu entry is shown and what the role may do there
router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const role = req.query.role;
    if (!RIGHT_ROLES.includes(role)) throw badRequest(`role must be one of: ${RIGHT_ROLES.join(', ')}`);
    const family = FAMILY.includes(role);
    const areas = family ? PORTAL_AREAS.filter((a) => a.menu[role]) : MODULES;
    const [rights, menu] = await Promise.all([
      rightsOfRole(role, areas),
      AppMenuItem.findAll({ where: { audience: 'web' } }),
    ]);
    const menuByKey = new Map(menu.map((m) => [m.key, m]));
    res.json({
      role,
      actions: family ? ['view', 'create', 'edit', 'delete'] : ACTIONS,
      modules: areas.map((a) => {
        // a module's menu entry is its group; a portal area's is the page of the My Children or My School menu that opens it
        const row = menuByKey.get(family ? a.menu[role] : a.key);
        const inMenu = row ? row.active && (splitRoles(row.roles)?.includes(role) ?? true) : false;
        return { key: a.key, label: a.label, inMenu, rights: rights[a.key] };
      }),
    });
  }),
);

// PUT /api/role-rights { role, module, menu?, view?, create?, edit?, delete?, approve?, export? }
router.put(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { role, module, menu } = req.body ?? {};
    if (!RIGHT_ROLES.includes(role)) throw badRequest(`role must be one of: ${RIGHT_ROLES.join(', ')}`);
    const area = PORTAL_AREAS.find((a) => a.key === module);
    if (!area && !MODULES.some((m) => m.key === module)) throw badRequest('Unknown module');
    if (Boolean(area) !== FAMILY.includes(role))
      throw badRequest(
        area ? 'That area is for parents and students' : 'Parents and students are set by portal area',
      );
    if (menu !== undefined) {
      const row = await AppMenuItem.findOne({
        where: { audience: 'web', key: area ? area.menu[role] : module },
      });
      if (row && area) await row.update({ active: Boolean(menu) });
      else if (row) {
        const roles = new Set(splitRoles(row.roles) ?? EVERY_ROLE);
        if (menu) roles.add(role);
        else roles.delete(role);
        if (!roles.size)
          throw badRequest('Keep at least one role, or hide the module on the menu page instead.');
        await row.update({ roles: [...roles].join(','), ...(menu ? { active: true } : {}) });
      }
    }
    res.json({ ok: true, rights: await saveRight(role, module, req.body) });
  }),
);

export default router;
