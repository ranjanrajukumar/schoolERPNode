import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { Op } from 'sequelize';
import { Role, Staff, User } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { startingPassword } from '../portal/studentLogin.service.js';

const router = Router();
const ROLES = ['admin', 'teacher', 'accountant'];
const MIN_PASSWORD = 8;

const publicUser = ({ id, name, email, role, roleId, staffId, Role: custom, createdAt }, staff) => ({
  id,
  name,
  email,
  role,
  roleId,
  roleName: custom?.name ?? null,
  staffId,
  staffName: staffId ? (staff.get(staffId) ?? null) : null,
  createdAt,
});

/** A login can be tied to one staff member, and a staff member has one login. */
async function chooseStaff(staffId, userId) {
  if (staffId === undefined) return {};
  if (staffId === null || staffId === '') return { staffId: null };
  if (!(await Staff.findByPk(staffId))) throw badRequest('Staff member not found');
  const taken = await User.findOne({ where: { staffId } });
  if (taken && taken.id !== userId) throw conflict(`${taken.name} is already linked to that staff member`);
  return { staffId: Number(staffId) };
}

/** A login has either a built-in role or a custom one (whose base role is stored as its built-in role). */
async function chooseRole({ role, roleId }) {
  if (roleId) {
    const custom = await Role.findByPk(roleId);
    if (!custom) throw badRequest('Custom role not found');
    return { role: custom.baseRole, roleId: custom.id };
  }
  if (!ROLES.includes(role)) throw badRequest('Role is invalid');
  return { role, roleId: null };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    // Parent and student logins are managed on their own account pages, not here.
    const [users, staff] = await Promise.all([
      User.findAll({
        where: { role: { [Op.notIn]: ['parent', 'student'] } },
        include: [{ model: Role, attributes: ['name'], required: false }],
        order: [['id', 'ASC']],
      }),
      Staff.findAll({ attributes: ['id', 'firstName', 'lastName'] }),
    ]);
    const names = new Map(staff.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));
    res.json(users.map((x) => publicUser(x, names)));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!String(name ?? '').trim()) throw badRequest('Name is required');
    const chosen = await chooseRole(req.body);
    if (String(password ?? '').length < MIN_PASSWORD)
      throw badRequest(`Password must be at least ${MIN_PASSWORD} characters`);
    const user = await User.create({
      name: name.trim(),
      email,
      ...chosen,
      ...(await chooseStaff(req.body.staffId)),
      passwordHash: await bcrypt.hash(password, 10),
    });
    res.status(201).json({ id: user.id });
  }),
);

/**
 * POST /api/users/teacher-logins -> gives every active teacher who has no login one: the staff email is the username, the login is linked to the
 * staff record, and the random starting password must be changed at the first sign-in. The passwords are returned here once, for the office to hand out.
 * A teacher with no usable email, or whose email already belongs to another login, is skipped and listed with the reason.
 */
router.post(
  '/teacher-logins',
  asyncHandler(async (_req, res) => {
    const [staff, linked] = await Promise.all([
      Staff.findAll({
        where: { status: 'active' },
        order: [
          ['firstName', 'ASC'],
          ['lastName', 'ASC'],
        ],
      }),
      User.findAll({ where: { staffId: { [Op.ne]: null } }, attributes: ['staffId'] }),
    ]);
    const has = new Set(linked.map((u) => u.staffId));
    const teachers = staff.filter((s) => /teach/i.test(s.designation ?? ''));
    const created = [];
    const skipped = [];
    for (const t of teachers) {
      if (has.has(t.id)) continue;
      const name = `${t.firstName} ${t.lastName}`;
      const email = String(t.email ?? '')
        .trim()
        .toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        skipped.push({ name, reason: 'No valid email on the staff record' });
        continue;
      }
      if (await User.findOne({ where: { email }, attributes: ['id'] })) {
        skipped.push({ name, reason: 'That email already belongs to another login' });
        continue;
      }
      const password = startingPassword();
      await User.create({
        name,
        email,
        role: 'teacher',
        staffId: t.id,
        passwordHash: await bcrypt.hash(password, 10),
        mustChangePassword: true,
      });
      created.push({ name, designation: t.designation, email, password });
    }
    res.json({
      created,
      skipped,
      alreadyHad: teachers.filter((t) => has.has(t.id)).length,
      teachers: teachers.length,
    });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) throw notFound('User not found');
    const { name, password } = req.body;
    const changingRole = req.body.role !== undefined || req.body.roleId !== undefined;
    const chosen = changingRole ? await chooseRole(req.body) : null;
    if (chosen && (chosen.role !== 'admin' || chosen.roleId) && user.id === req.user.id)
      throw conflict('You cannot remove your own admin role');
    if (password && String(password).length < MIN_PASSWORD)
      throw badRequest(`Password must be at least ${MIN_PASSWORD} characters`);
    const linked = await chooseStaff(req.body.staffId, user.id);
    await user.update({
      ...linked,
      ...(name && { name: name.trim() }),
      ...(chosen && chosen),
      ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
    });
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) throw conflict('You cannot delete your own account');
    const removed = await User.destroy({ where: { id: req.params.id } });
    if (!removed) throw notFound('User not found');
    res.json({ ok: true });
  }),
);

export default router;
