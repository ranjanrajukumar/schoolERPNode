import { Router } from 'express';
import { Role, User } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { BASE_ROLES, LEVELS, MODULES, cleanPermissions } from './access.js';

// Mounted behind requireRole('admin'). A custom role is a built-in role narrowed to chosen modules.
const router = Router();

const shape = (r, users = 0) => ({
  id: r.id, name: r.name, description: r.description, baseRole: r.baseRole, permissions: JSON.parse(r.permissions), users,
});

function validate({ name, baseRole, permissions }) {
  if (!String(name ?? '').trim()) throw badRequest('Role name is required');
  if (BASE_ROLES.includes(String(name).trim().toLowerCase())) throw badRequest('That name is already a built-in role');
  if (!BASE_ROLES.includes(baseRole)) throw badRequest('Choose the built-in role this one is based on');
  const clean = cleanPermissions(permissions);
  if (!Object.keys(clean).length) throw badRequest('Give the role access to at least one module');
  return { name: name.trim(), baseRole, permissions: JSON.stringify(clean) };
}

router.get('/modules', (_req, res) => res.json({
  modules: MODULES.map(({ key, label }) => ({ key, label })), levels: LEVELS, baseRoles: BASE_ROLES,
}));

router.get('/', asyncHandler(async (_req, res) => {
  const [roles, users] = await Promise.all([Role.findAll({ order: [['name', 'ASC']] }), User.findAll({ attributes: ['roleId'] })]);
  res.json(roles.map((r) => shape(r, users.filter((u) => u.roleId === r.id).length)));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = validate(req.body);
  res.status(201).json({ id: (await Role.create({ ...data, description: req.body.description || null })).id });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) throw notFound('Role not found');
  const data = validate(req.body);
  // The base role is what users of this role fall back to for everything the permissions do not narrow, so it is fixed once users hold it.
  if (data.baseRole !== role.baseRole && await User.count({ where: { roleId: role.id } })) {
    throw conflict('Users already hold this role, so its base role cannot be changed');
  }
  await role.update({ ...data, description: req.body.description || null });
  // Users keep their stored built-in role in step with the role's base.
  await User.update({ role: data.baseRole }, { where: { roleId: role.id } });
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) throw notFound('Role not found');
  if (await User.count({ where: { roleId: role.id } })) throw conflict('Users still hold this role; move them to another role first');
  await role.destroy();
  res.json({ ok: true });
}));

export default router;
