import { Router } from 'express';
import { Exam } from '../../models/index.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import {
  EXAM_FIELDS, getMarkSheet, getReportCard, getResults, listExams, saveMarks,
} from './exams.service.js';

const router = Router();
const admin = requireRole('admin');
const markers = requireRole('admin', 'teacher');

const pick = (body) => Object.fromEntries(
  EXAM_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]),
);

router.get('/', asyncHandler(async (_req, res) => res.json(await listExams())));

router.post('/', admin, asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (!String(data.name ?? '').trim() || !data.classId) throw badRequest('Name and class are required');
  res.status(201).json({ id: (await Exam.create(data)).id });
}));

router.put('/:id', admin, asyncHandler(async (req, res) => {
  const exam = await Exam.findByPk(req.params.id);
  if (!exam) throw notFound('Exam not found');
  await exam.update(pick(req.body));
  res.json({ ok: true });
}));

router.delete('/:id', admin, asyncHandler(async (req, res) => {
  if (!(await Exam.destroy({ where: { id: req.params.id } }))) throw notFound('Exam not found');
  res.json({ ok: true });
}));

router.get('/:id/marks', markers, asyncHandler(async (req, res) => res.json(await getMarkSheet(req.params.id, req.user))));

// POST /api/exams/:id/marks { records: [{ studentId, subjectId, marks }] }
router.post('/:id/marks', markers, asyncHandler(async (req, res) => {
  res.json({ saved: await saveMarks(req.params.id, req.body.records, req.user) });
}));

router.get('/:id/results', asyncHandler(async (req, res) => res.json(await getResults(req.params.id))));

router.get('/:id/report-card/:studentId', asyncHandler(async (req, res) => {
  res.json(await getReportCard(req.params.id, req.params.studentId));
}));

export default router;
