import { Router } from 'express';
import { Op } from 'sequelize';
import { User, UserGroup, UserGroupMember } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';

// Mounted behind requireRole('admin'). Groups collect staff logins, e.g. for emailing the heads of department.
const router = Router();
const STAFF_ROLES = ['admin', 'teacher', 'accountant'];

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const groups = await UserGroup.findAll({
      include: [
        { model: UserGroupMember, include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }] },
      ],
      order: [['name', 'ASC']],
    });
    res.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        members: g.UserGroupMembers.map((m) => ({
          id: m.User.id,
          name: m.User.name,
          email: m.User.email,
          role: m.User.role,
        })),
      })),
    );
  }),
);

router.get(
  '/candidates',
  asyncHandler(async (_req, res) => {
    res.json(
      await User.findAll({
        where: { role: { [Op.in]: STAFF_ROLES } },
        attributes: ['id', 'name', 'email', 'role'],
        order: [['name', 'ASC']],
      }),
    );
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!String(req.body.name ?? '').trim()) throw badRequest('Group name is required');
    res
      .status(201)
      .json({
        id: (
          await UserGroup.create({ name: req.body.name.trim(), description: req.body.description || null })
        ).id,
      });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const group = await UserGroup.findByPk(req.params.id);
    if (!group) throw notFound('Group not found');
    if (!String(req.body.name ?? '').trim()) throw badRequest('Group name is required');
    await group.update({ name: req.body.name.trim(), description: req.body.description || null });
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const group = await UserGroup.findByPk(req.params.id);
    if (!group) throw notFound('Group not found');
    await UserGroupMember.destroy({ where: { groupId: group.id } });
    await group.destroy();
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const group = await UserGroup.findByPk(req.params.id);
    if (!group) throw notFound('Group not found');
    const user = await User.findByPk(req.body.userId);
    if (!user || !STAFF_ROLES.includes(user.role)) throw badRequest('Choose a staff login');
    if (await UserGroupMember.findOne({ where: { groupId: group.id, userId: user.id } }))
      throw conflict('Already in this group');
    await UserGroupMember.create({ groupId: group.id, userId: user.id });
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req, res) => {
    await UserGroupMember.destroy({ where: { groupId: req.params.id, userId: req.params.userId } });
    res.json({ ok: true });
  }),
);

export default router;
