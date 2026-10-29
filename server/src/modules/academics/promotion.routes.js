import { Router } from 'express';
import { SchoolClass, Student, sequelize } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { pruneElectives } from './subjectMap.service.js';

const router = Router();

/**
 * Year-end promotion. Moves active students of `fromClassId` (or only the listed `studentIds`)
 * to `toClassId`. With no `toClassId` they are marked inactive (graduated / left).
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { fromClassId, toClassId, studentIds } = req.body;
    if (!fromClassId) throw badRequest('From class is required');
    if (toClassId && Number(toClassId) === Number(fromClassId))
      throw badRequest('Choose a different target class');
    if (!(await SchoolClass.findByPk(fromClassId))) throw notFound('From class not found');
    if (toClassId && !(await SchoolClass.findByPk(toClassId))) throw notFound('Target class not found');

    const where = { classId: fromClassId, status: 'active' };
    if (Array.isArray(studentIds)) where.id = studentIds;

    const movedIds = (await Student.findAll({ where, attributes: ['id'] })).map((s) => s.id); // who moves, before their class changes
    const update = toClassId ? { classId: toClassId } : { status: 'inactive' };
    const [count] = await sequelize.transaction((transaction) =>
      Student.update(update, { where, transaction }),
    );
    await pruneElectives(movedIds);
    res.json({ moved: count, graduated: !toClassId });
  }),
);

export default router;
