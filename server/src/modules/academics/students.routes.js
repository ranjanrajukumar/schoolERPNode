import { Router } from 'express';
import { Photo } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  registrationSummary,
  studentSummary,
  updateStudent,
} from './students.service.js';
import { validateStudent } from './students.validation.js';
import { setStudentElectives, studentSubjects } from './subjectMap.service.js';

const router = Router();

// GET /api/students?q=&classId=&status=&page=&pageSize=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await listStudents(req.query));
  }),
);

router.get(
  '/summary',
  asyncHandler(async (_req, res) => res.json(await studentSummary())),
);
router.get(
  '/registration-summary',
  asyncHandler(async (_req, res) => res.json(await registrationSummary())),
);

// The electives a student takes, and their class's subjects with how each is taught
router.get(
  '/:id/subjects',
  asyncHandler(async (req, res) => res.json(await studentSubjects(req.params.id))),
);
router.put(
  '/:id/electives',
  asyncHandler(async (req, res) => {
    res.json({ saved: await setStudentElectives(req.params.id, req.body.classSubjectIds) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const student = await getStudent(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  }),
);

// An empty admission no is generated. `allowDuplicate` confirms a same-name-and-birthday student; `billFees` bills the class fee structure.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const errors = await validateStudent({ ...req.body, admissionNo: req.body.admissionNo || 'auto' });
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    res
      .status(201)
      .json(
        await createStudent(req.body, {
          allowDuplicate: Boolean(req.body.allowDuplicate),
          billFees: Boolean(req.body.billFees),
        }),
      );
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const errors = await validateStudent(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors[0], errors });
    if (!(await updateStudent(req.params.id, req.body)))
      return res.status(404).json({ error: 'Student not found' });
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteStudent(req.params.id))) return res.status(404).json({ error: 'Student not found' });
    await Photo.destroy({
      where: {
        entity: [
          'student',
          'student_sign',
          'father_photo',
          'father_sign',
          'mother_photo',
          'mother_sign',
          'student_thumb',
        ],
        entityId: req.params.id,
      },
    });
    res.json({ ok: true });
  }),
);

export default router;
