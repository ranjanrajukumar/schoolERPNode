import { Router } from 'express';
import { ClassSubject, SchoolClass, Staff, Subject } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { conflict, notFound } from '../../utils/httpError.js';
import { COMPONENT_LABEL, afterClassSubjectChange, classSubjectMap, cleanClassSubject, electiveSheet } from './subjectMap.service.js';

const router = Router();

/** Class–subject assignments with readable class, subject and teacher names, and how each subject is taught. */
router.get('/', asyncHandler(async (_req, res) => {
  const rows = await ClassSubject.findAll({
    include: [
      { model: SchoolClass, attributes: ['name', 'section'] },
      { model: Subject, attributes: ['name'] },
      { model: Staff, attributes: ['firstName', 'lastName'], required: false },
    ],
    order: [['classId', 'ASC'], ['subjectId', 'ASC']],
  });
  res.json(rows.map((r) => ({
    id: r.id, classId: r.classId, subjectId: r.subjectId, staffId: r.staffId,
    component: r.component, componentLabel: COMPONENT_LABEL[r.component], isElective: r.isElective, electiveGroup: r.electiveGroup, periodsPerWeek: r.periodsPerWeek, practicalShare: r.practicalShare,
    className: `${r.SchoolClass.name}-${r.SchoolClass.section}`, subjectName: r.Subject.name, teacherName: r.Staff ? `${r.Staff.firstName} ${r.Staff.lastName}` : null,
  })));
}));

// One class's subject map, and its elective sheet (declared before /:id)
router.get('/map', asyncHandler(async (req, res) => res.json(await classSubjectMap(req.query.classId))));
router.get('/electives', asyncHandler(async (req, res) => res.json(await electiveSheet(req.query.classId))));

router.post('/', asyncHandler(async (req, res) => {
  const data = cleanClassSubject(req.body);
  if (await ClassSubject.findOne({ where: { classId: data.classId, subjectId: data.subjectId } })) throw conflict('That subject is already in this class');
  res.status(201).json({ id: (await ClassSubject.create(data)).id });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const row = await ClassSubject.findByPk(req.params.id);
  if (!row) throw notFound('Not found');
  await row.update(cleanClassSubject(req.body, { partial: true }));
  await afterClassSubjectChange(row.id);
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await ClassSubject.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
