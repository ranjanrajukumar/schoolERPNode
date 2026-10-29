import { Router } from 'express';
import { Branch, SchoolClass, sequelize } from '../../models/index.js';
import { writeRoles } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';

const router = Router();
const FIELDS = ['name', 'code', 'address', 'phone', 'incharge'];
const pick = (body) =>
  Object.fromEntries(
    FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, String(body[f]).trim() || null]),
  );

// Any signed-in user may read (class forms list campuses); only admins change them.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [branches, classes] = await Promise.all([
      Branch.findAll({
        order: [
          ['isMain', 'DESC'],
          ['name', 'ASC'],
        ],
      }),
      SchoolClass.findAll({ attributes: ['branchId'] }),
    ]);
    res.json(
      branches.map((b) => ({ ...b.toJSON(), classCount: classes.filter((c) => c.branchId === b.id).length })),
    );
  }),
);

router.post(
  '/',
  writeRoles('admin'),
  asyncHandler(async (req, res) => {
    const data = pick(req.body);
    if (!data.name) throw badRequest('Campus name is required');
    // The first campus is the main one.
    const first = (await Branch.count()) === 0;
    res.status(201).json({ id: (await Branch.create({ ...data, isMain: first })).id });
  }),
);

router.put(
  '/:id',
  writeRoles('admin'),
  asyncHandler(async (req, res) => {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) throw notFound('Campus not found');
    const data = pick(req.body);
    if (data.name === null) throw badRequest('Campus name is required');
    await branch.update(data);
    res.json({ ok: true });
  }),
);

// Makes this the main campus and clears the flag on the others, together.
router.post(
  '/:id/main',
  writeRoles('admin'),
  asyncHandler(async (req, res) => {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) throw notFound('Campus not found');
    await sequelize.transaction(async (transaction) => {
      await Branch.update({ isMain: false }, { where: {}, transaction });
      await branch.update({ isMain: true }, { transaction });
    });
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  writeRoles('admin'),
  asyncHandler(async (req, res) => {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) throw notFound('Campus not found');
    if (branch.isMain)
      throw conflict('The main campus cannot be deleted; make another campus the main one first');
    if (await SchoolClass.count({ where: { branchId: branch.id } }))
      throw conflict('Classes still belong to this campus');
    await branch.destroy();
    res.json({ ok: true });
  }),
);

export default router;
