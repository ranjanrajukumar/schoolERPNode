import { Router } from 'express';
import { SchoolClass, Student, StudentBoardRegistration } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { boardOfClass } from './boardRules.service.js';

const router = Router();
const STATUSES = ['pending', 'submitted', 'registered'];

// GET /api/board-registration?classId= -> the class's board and each active student with their registration for it
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.query.classId) throw badRequest('classId is required');
    const cls = await SchoolClass.findByPk(req.query.classId);
    if (!cls) throw notFound('Class not found');
    const board = await boardOfClass(cls);
    const students = await Student.findAll({
      where: { classId: cls.id, status: 'active' },
      order: [
        ['firstName', 'ASC'],
        ['lastName', 'ASC'],
      ],
    });
    const regs = new Map(
      (
        await StudentBoardRegistration.findAll({
          where: { boardId: board.id, studentId: students.map((s) => s.id) },
        })
      ).map((r) => [r.studentId, r]),
    );
    res.json({
      board: { id: board.id, name: board.name },
      className: `${cls.name}-${cls.section}`,
      rows: students.map((s) => {
        const r = regs.get(s.id);
        return {
          studentId: s.id,
          admissionNo: s.admissionNo,
          name: `${s.firstName} ${s.lastName}`,
          dob: s.dob,
          gender: s.gender,
          guardianName: s.guardianName,
          registrationNo: r?.registrationNo ?? '',
          rollNo: r?.rollNo ?? '',
          examYear: r?.examYear ?? null,
          status: r?.status ?? 'pending',
        };
      }),
    });
  }),
);

const clean = (v) =>
  String(v ?? '')
    .trim()
    .slice(0, 40) || null;

// PUT /api/board-registration/:studentId { registrationNo, rollNo, examYear, status }
// The board comes from the student's class, never from the request.
router.put(
  '/:studentId',
  asyncHandler(async (req, res) => {
    const student = await Student.findByPk(req.params.studentId, { include: [SchoolClass] });
    if (!student) throw notFound('Student not found');
    if (!student.SchoolClass) throw badRequest('The student is not in a class');
    const board = await boardOfClass(student.SchoolClass);
    const status = req.body.status ?? 'pending';
    if (!STATUSES.includes(status)) throw badRequest('Unknown status');
    const year = req.body.examYear === '' || req.body.examYear == null ? null : Number(req.body.examYear);
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100))
      throw badRequest('Exam year is not valid');
    const registrationNo = clean(req.body.registrationNo);
    if (status === 'registered' && !registrationNo)
      throw badRequest('A registered student needs the registration number the board issued');
    const where = { studentId: student.id, boardId: board.id };
    const values = { registrationNo, rollNo: clean(req.body.rollNo), examYear: year, status };
    const existing = await StudentBoardRegistration.findOne({ where });
    if (existing) await existing.update(values);
    else await StudentBoardRegistration.create({ ...where, ...values });
    res.json({ ok: true });
  }),
);

export default router;
