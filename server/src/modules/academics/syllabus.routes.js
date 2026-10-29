import { Router } from 'express';
import { SchoolClass, Subject, SyllabusTopic } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

const router = Router();
const FIELDS = ['classId', 'subjectId', 'sequence', 'title', 'objective', 'plannedDate', 'status'];
const STATUSES = ['not_started', 'in_progress', 'completed'];

const pick = (body) =>
  Object.fromEntries(
    FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]),
  );

// GET /api/syllabus?classId=&subjectId=  -> topics in teaching order
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { classId, subjectId } = req.query;
    res.json(
      await SyllabusTopic.findAll({
        where: { ...(classId && { classId }), ...(subjectId && { subjectId }) },
        order: [
          ['classId', 'ASC'],
          ['subjectId', 'ASC'],
          ['sequence', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
    );
  }),
);

// GET /api/syllabus/progress -> % of topics completed for each class and subject
router.get(
  '/progress',
  asyncHandler(async (_req, res) => {
    const topics = await SyllabusTopic.findAll({
      include: [
        { model: SchoolClass, attributes: ['name', 'section'] },
        { model: Subject, attributes: ['name'] },
      ],
    });
    const groups = new Map();
    for (const t of topics) {
      const key = `${t.classId}:${t.subjectId}`;
      const g = groups.get(key) ?? {
        classId: t.classId,
        subjectId: t.subjectId,
        className: `${t.SchoolClass.name}-${t.SchoolClass.section}`,
        subjectName: t.Subject.name,
        total: 0,
        completed: 0,
        inProgress: 0,
        behind: 0,
      };
      g.total += 1;
      if (t.status === 'completed') g.completed += 1;
      if (t.status === 'in_progress') g.inProgress += 1;
      // Planned for a date that has passed but not finished: the plan is slipping.
      if (t.status !== 'completed' && t.plannedDate && t.plannedDate < today()) g.behind += 1;
      groups.set(key, g);
    }
    res.json(
      [...groups.values()]
        .map((g) => ({ ...g, percent: Math.round((g.completed / g.total) * 100) }))
        .sort((a, b) => a.className.localeCompare(b.className) || a.subjectName.localeCompare(b.subjectName)),
    );
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = pick(req.body);
    if (!data.classId || !data.subjectId || !String(data.title ?? '').trim())
      throw badRequest('Class, subject and title are required');
    if (data.status && !STATUSES.includes(data.status)) throw badRequest('Status is invalid');
    res.status(201).json({ id: (await SyllabusTopic.create(data)).id });
  }),
);

/** Completing a topic stamps the date; moving it back clears the stamp. */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const topic = await SyllabusTopic.findByPk(req.params.id);
    if (!topic) throw notFound('Topic not found');
    const data = pick(req.body);
    if (data.status && !STATUSES.includes(data.status)) throw badRequest('Status is invalid');
    if (data.status === 'completed' && topic.status !== 'completed') data.completedOn = today();
    if (data.status && data.status !== 'completed') data.completedOn = null;
    await topic.update(data);
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!(await SyllabusTopic.destroy({ where: { id: req.params.id } }))) throw notFound('Topic not found');
    res.json({ ok: true });
  }),
);

export default router;
