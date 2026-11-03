import { Router } from 'express';
import { ClassSubject, SchoolClass, Staff, Subject } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { stageOf } from './subjectTemplates.js';
import { boardOfClass, resolveRule } from '../boards/boardRules.service.js';
import {
  COMPONENT_LABEL,
  afterClassSubjectChange,
  classSubjectMap,
  cleanClassSubject,
  electiveSheet,
} from './subjectMap.service.js';

const router = Router();

/** Class–subject assignments with readable class, subject and teacher names, and how each subject is taught. */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await ClassSubject.findAll({
      include: [
        { model: SchoolClass, attributes: ['name', 'section'] },
        { model: Subject, attributes: ['name'] },
        { model: Staff, attributes: ['firstName', 'lastName'], required: false },
      ],
      order: [
        ['classId', 'ASC'],
        ['subjectId', 'ASC'],
      ],
    });
    res.json(
      rows.map((r) => ({
        id: r.id,
        classId: r.classId,
        subjectId: r.subjectId,
        staffId: r.staffId,
        component: r.component,
        componentLabel: COMPONENT_LABEL[r.component],
        isElective: r.isElective,
        electiveGroup: r.electiveGroup,
        periodsPerWeek: r.periodsPerWeek,
        practicalShare: r.practicalShare,
        className: `${r.SchoolClass.name}-${r.SchoolClass.section}`,
        subjectName: r.Subject.name,
        teacherName: r.Staff ? `${r.Staff.firstName} ${r.Staff.lastName}` : null,
      })),
    );
  }),
);

// One class's subject map, and its elective sheet (declared before /:id)
router.get(
  '/map',
  asyncHandler(async (req, res) => res.json(await classSubjectMap(req.query.classId))),
);
router.get(
  '/electives',
  asyncHandler(async (req, res) => res.json(await electiveSheet(req.query.classId))),
);

// POST /api/class-subjects/apply-template { classIds?: [] }: gives each class its board's default subjects and periods per week.
// Subjects are created when missing. Anything already assigned is kept; only a missing periods-per-week is filled in.
router.post(
  '/apply-template',
  asyncHandler(async (req, res) => {
    const wanted = Array.isArray(req.body.classIds) ? req.body.classIds.map(Number) : [];
    const classes = await SchoolClass.findAll({ where: wanted.length ? { id: wanted } : {} });
    if (!classes.length) throw badRequest('No classes to apply a template to');
    const byName = new Map((await Subject.findAll()).map((s) => [s.name.toLowerCase(), s]));
    const codes = new Set([...byName.values()].map((s) => s.code));
    const templates = new Map(); // board|stage -> rule
    let added = 0;
    let filled = 0;
    const noTemplate = [];
    for (const cls of classes) {
      const stage = stageOf(cls.name);
      const board = await boardOfClass(cls);
      const key = `${board.id}|${stage}`;
      if (!templates.has(key))
        templates.set(key, stage ? await resolveRule(board, 'subject_template', stage) : null);
      const list = templates.get(key)?.payload.subjects;
      if (!list) {
        noTemplate.push(`${cls.name}-${cls.section}`);
        continue;
      }
      for (const { name, periodsPerWeek, component } of list) {
        let subject = byName.get(name.toLowerCase());
        if (!subject) {
          let code =
            name
              .replace(/[^A-Za-z]/g, '')
              .slice(0, 6)
              .toUpperCase() || 'SUB';
          for (let n = 2; codes.has(code); n++) code = `${code.slice(0, 6)}${n}`.slice(0, 20);
          codes.add(code);
          subject = await Subject.create({ name, code });
          byName.set(name.toLowerCase(), subject);
        }
        const link = await ClassSubject.findOne({ where: { classId: cls.id, subjectId: subject.id } });
        if (!link) {
          await ClassSubject.create({ classId: cls.id, subjectId: subject.id, component, periodsPerWeek });
          added += 1;
        } else if (link.periodsPerWeek == null) {
          await link.update({ periodsPerWeek });
          filled += 1;
        }
      }
    }
    res.json({ classes: classes.length, added, filled, noTemplate });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = cleanClassSubject(req.body);
    if (await ClassSubject.findOne({ where: { classId: data.classId, subjectId: data.subjectId } }))
      throw conflict('That subject is already in this class');
    res.status(201).json({ id: (await ClassSubject.create(data)).id });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await ClassSubject.findByPk(req.params.id);
    if (!row) throw notFound('Not found');
    await row.update(cleanClassSubject(req.body, { partial: true }));
    await afterClassSubjectChange(row.id);
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await ClassSubject.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

export default router;
