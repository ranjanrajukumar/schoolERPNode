import { Router } from 'express';
import { Op, fn, col } from 'sequelize';
import { BehaviorRecord, SchoolClass, Student, StudentHealth } from '../../models/index.js';
import { BEHAVIOR_TYPES } from '../../models/behaviorRecord.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

export const healthRouter = Router();
export const behaviorRouter = Router();

const HEALTH_FIELDS = [
  'bloodGroup',
  'heightCm',
  'weightKg',
  'allergies',
  'conditions',
  'medications',
  'emergencyName',
  'emergencyPhone',
  'doctorName',
  'doctorPhone',
  'notes',
];
const blankToNull = (v) => (v === '' ? null : v);
const PHONE = /^[0-9+\-\s()]{7,20}$/;

/* ---------- Health ---------- */

// GET /api/student-health/:studentId -> the record, or {} when none has been saved yet
healthRouter.get(
  '/:studentId',
  asyncHandler(async (req, res) => {
    if (!(await Student.findByPk(req.params.studentId))) throw notFound('Student not found');
    res.json((await StudentHealth.findOne({ where: { studentId: req.params.studentId } }))?.toJSON() ?? {});
  }),
);

healthRouter.put(
  '/:studentId',
  asyncHandler(async (req, res) => {
    if (!(await Student.findByPk(req.params.studentId))) throw notFound('Student not found');
    const data = Object.fromEntries(
      HEALTH_FIELDS.filter((f) => req.body[f] !== undefined).map((f) => [f, blankToNull(req.body[f])]),
    );
    for (const phone of [data.emergencyPhone, data.doctorPhone]) {
      if (phone && !PHONE.test(phone)) throw badRequest('Phone number is invalid');
    }
    await StudentHealth.upsert({ studentId: req.params.studentId, ...data });
    res.json({ ok: true });
  }),
);

// GET /api/student-health -> students with something staff must know (allergy, condition or medication)
healthRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await StudentHealth.findAll({
      where: {
        [Op.or]: [
          { allergies: { [Op.ne]: null } },
          { conditions: { [Op.ne]: null } },
          { medications: { [Op.ne]: null } },
        ],
      },
      include: [
        {
          model: Student,
          attributes: ['firstName', 'lastName', 'admissionNo', 'status', 'classId'],
          where: { status: 'active', ...(req.query.classId && { classId: req.query.classId }) },
          include: [SchoolClass],
        },
      ],
    });
    res.json(
      rows.map((h) => ({
        studentId: h.studentId,
        name: `${h.Student.firstName} ${h.Student.lastName}`,
        admissionNo: h.Student.admissionNo,
        className: h.Student.SchoolClass
          ? `${h.Student.SchoolClass.name}-${h.Student.SchoolClass.section}`
          : null,
        bloodGroup: h.bloodGroup,
        allergies: h.allergies,
        conditions: h.conditions,
        medications: h.medications,
        emergencyName: h.emergencyName,
        emergencyPhone: h.emergencyPhone,
      })),
    );
  }),
);

/* ---------- Behavior ---------- */

function shape(r) {
  return {
    id: r.id,
    studentId: r.studentId,
    date: r.date,
    type: r.type,
    title: r.title,
    description: r.description,
    points: r.points,
    recordedByName: r.recordedByName,
    studentName: r.Student ? `${r.Student.firstName} ${r.Student.lastName}` : undefined,
    admissionNo: r.Student?.admissionNo,
  };
}

// GET /api/behavior?studentId=&classId=&type=
behaviorRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { studentId, classId, type } = req.query;
    const rows = await BehaviorRecord.findAll({
      where: { ...(studentId && { studentId }), ...(type && { type }) },
      include: [
        {
          model: Student,
          attributes: ['firstName', 'lastName', 'admissionNo'],
          where: classId ? { classId } : {},
        },
      ],
      order: [
        ['date', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: 500,
    });
    res.json(rows.map(shape));
  }),
);

/**
 * Merits add points and demerits subtract them; the sign is applied here, so the form only ever
 * asks for a positive number. Incidents and notes carry no points.
 */
behaviorRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { studentId, type, title, description, date } = req.body;
    if (!BEHAVIOR_TYPES.includes(type)) throw badRequest(`Type must be one of ${BEHAVIOR_TYPES.join(', ')}`);
    if (!String(title ?? '').trim()) throw badRequest('Title is required');
    if (!(await Student.findByPk(studentId))) throw notFound('Student not found');

    const size = Math.abs(Number(req.body.points) || 0);
    if (size > 100) throw badRequest('Points must be 100 or fewer');
    const points = type === 'merit' ? size : type === 'demerit' ? -size : 0;

    const row = await BehaviorRecord.create({
      studentId,
      type,
      title: title.trim(),
      description: description || null,
      date: date || today(),
      points,
      recordedBy: req.user.id,
      recordedByName: req.user.name,
    });
    res.status(201).json({ id: row.id });
  }),
);

behaviorRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await BehaviorRecord.findByPk(req.params.id);
    if (!row) throw notFound('Record not found');
    // Teachers may remove their own entries; removing anyone else's needs an admin.
    if (req.user.role !== 'admin' && row.recordedBy !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete records you entered' });
    }
    await row.destroy();
    res.json({ ok: true });
  }),
);

// GET /api/behavior/summary?classId= -> points per student, lowest first so concerns surface
behaviorRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const totals = await BehaviorRecord.findAll({
      attributes: [
        'studentId',
        [fn('SUM', col('points')), 'points'],
        [fn('COUNT', col('BehaviorRecord.id')), 'records'],
      ],
      include: [
        {
          model: Student,
          attributes: ['firstName', 'lastName', 'admissionNo'],
          where: { status: 'active', ...(req.query.classId && { classId: req.query.classId }) },
          include: [SchoolClass],
        },
      ],
      group: ['studentId', 'Student.id', 'Student->SchoolClass.id'],
      raw: false,
    });
    res.json(
      totals
        .map((t) => ({
          studentId: t.studentId,
          name: `${t.Student.firstName} ${t.Student.lastName}`,
          admissionNo: t.Student.admissionNo,
          className: t.Student.SchoolClass
            ? `${t.Student.SchoolClass.name}-${t.Student.SchoolClass.section}`
            : null,
          points: Number(t.get('points')),
          records: Number(t.get('records')),
        }))
        .sort((a, b) => a.points - b.points),
    );
  }),
);
