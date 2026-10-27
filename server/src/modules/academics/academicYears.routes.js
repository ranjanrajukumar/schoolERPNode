import { Router } from 'express';
import { AcademicYear, sequelize } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';

const router = Router();
const FIELDS = ['name', 'startDate', 'endDate'];

const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

function check(data) {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    throw badRequest('End date must be after the start date');
  }
}

router.get('/', asyncHandler(async (_req, res) => {
  res.json(await AcademicYear.findAll({ order: [['startDate', 'DESC']] }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = pick(req.body);
  check(data);
  res.status(201).json({ id: (await AcademicYear.create(data)).id });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const year = await AcademicYear.findByPk(req.params.id);
  if (!year) throw notFound('Academic year not found');
  const data = pick(req.body);
  check({ startDate: year.startDate, endDate: year.endDate, ...data });
  await year.update(data);
  res.json({ ok: true });
}));

/** Exactly one year is current; switching clears the flag on every other year. */
router.post('/:id/set-current', asyncHandler(async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const year = await AcademicYear.findByPk(req.params.id, { transaction });
    if (!year) throw notFound('Academic year not found');
    await AcademicYear.update({ isCurrent: false }, { where: {}, transaction });
    await year.update({ isCurrent: true }, { transaction });
  });
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (!(await AcademicYear.destroy({ where: { id: req.params.id } }))) throw notFound('Academic year not found');
  res.json({ ok: true });
}));

export default router;
