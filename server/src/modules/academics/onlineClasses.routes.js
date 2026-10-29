import { Router } from 'express';
import { Op } from 'sequelize';
import { OnlineClass, SchoolClass, Subject } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

/** Live classes over a video link, scheduled by admins and teachers (mounted behind writeRoles). Students see theirs through the portal. */
const router = Router();
const FIELDS = [
  'title',
  'classId',
  'subjectId',
  'classDate',
  'startTime',
  'endTime',
  'link',
  'teacherName',
  'notes',
];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (v) => String(v ?? '').trim();

async function clean(body) {
  const d = {};
  for (const f of FIELDS)
    if (body[f] !== undefined)
      d[f] = text(body[f]) === '' ? null : typeof body[f] === 'string' ? body[f].trim() : body[f];
  if (!d.title) throw badRequest('Title is required');
  if (String(d.title).length > 160) throw badRequest('Title must be 160 characters or fewer');
  if (!d.classId || !(await SchoolClass.findByPk(d.classId)))
    throw badRequest('Choose the class this is for');
  if (d.subjectId && !(await Subject.findByPk(d.subjectId))) throw badRequest('That subject does not exist');
  if (
    !d.classDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d.classDate) ||
    Number.isNaN(new Date(d.classDate).getTime())
  )
    throw badRequest('Date is required');
  if (!d.startTime || !TIME.test(d.startTime)) throw badRequest('Start time must look like 14:30');
  if (d.endTime && (!TIME.test(d.endTime) || d.endTime <= d.startTime))
    throw badRequest('End time must look like 15:15 and be after the start time');
  if (!d.link) throw badRequest('The joining link is required');
  if (!/^https?:\/\/\S+$/i.test(d.link) || d.link.length > 500)
    throw badRequest('The joining link must be a web address starting with http:// or https://');
  if (d.notes && String(d.notes).length > 500) throw badRequest('Notes must be 500 characters or fewer');
  return d;
}

const shape = (c) => ({
  id: c.id,
  title: c.title,
  classId: c.classId,
  className: c.SchoolClass ? `${c.SchoolClass.name}-${c.SchoolClass.section}` : null,
  subjectId: c.subjectId,
  subjectName: c.Subject?.name ?? null,
  classDate: c.classDate,
  startTime: c.startTime,
  endTime: c.endTime,
  link: c.link,
  teacherName: c.teacherName,
  notes: c.notes,
});

// GET /api/online-classes?classId=&when=upcoming|past   upcoming first for "upcoming", newest first for "past"
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { classId, when } = req.query;
    const day = today();
    const where = {
      ...(classId && { classId }),
      ...(when === 'upcoming' && { classDate: { [Op.gte]: day } }),
      ...(when === 'past' && { classDate: { [Op.lt]: day } }),
    };
    const rows = await OnlineClass.findAll({
      where,
      include: [
        { model: SchoolClass, attributes: ['name', 'section'] },
        { model: Subject, attributes: ['name'] },
      ],
      order:
        when === 'past'
          ? [
              ['classDate', 'DESC'],
              ['startTime', 'DESC'],
            ]
          : [
              ['classDate', 'ASC'],
              ['startTime', 'ASC'],
            ],
      limit: 300,
    });
    res.json(rows.map(shape));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) =>
    res
      .status(201)
      .json({ id: (await OnlineClass.create(await clean({ teacherName: req.user.name, ...req.body }))).id }),
  ),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await OnlineClass.findByPk(req.params.id);
    if (!row) throw notFound('Online class not found');
    await row.update(await clean({ ...row.toJSON(), ...req.body }));
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!(await OnlineClass.destroy({ where: { id: req.params.id } })))
      throw notFound('Online class not found');
    res.json({ ok: true });
  }),
);

export default router;
