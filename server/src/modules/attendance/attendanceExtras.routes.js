import { Router } from 'express';
import { Op } from 'sequelize';
import {
  AbsenceAlert,
  Attendance,
  PeriodAttendance,
  SchoolClass,
  Student,
  Subject,
  TimetableSlot,
  sequelize,
} from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';
import { studentsOnLeave } from '../academics/attendance.service.js';
import { sendAbsenceAlert } from '../messaging/messaging.service.js';
import { autoAbsenceStatus, runAbsenceAlerts } from './autoAbsence.service.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { applyLeave, cancelLeave, decideLeave, listLeaves } from './studentLeave.service.js';

/* ---------- Student leave ---------- */

export const leaveRouter = Router();

leaveRouter.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listLeaves(req.query, req.user))),
);
leaveRouter.post(
  '/',
  asyncHandler(async (req, res) =>
    res.status(201).json({ id: await applyLeave(req.body, req.user.id, 'staff') }),
  ),
);
leaveRouter.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    await decideLeave(req.params.id, 'approved', req.body, req.user);
    res.json({ ok: true });
  }),
);
leaveRouter.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    await decideLeave(req.params.id, 'rejected', req.body, req.user);
    res.json({ ok: true });
  }),
);
leaveRouter.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    await cancelLeave(req.params.id);
    res.json({ ok: true });
  }),
);

/* ---------- Period attendance ---------- */

export const periodRouter = Router();

const dayOfWeek = (date) => ((new Date(`${date}T00:00:00`).getDay() + 6) % 7) + 1; // 1 = Monday

// GET /api/period-attendance?classId=&date=&period= -> roster; the subject comes from the timetable when it has one
periodRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { classId, date, period } = req.query;
    if (!classId || !date || !period) throw badRequest('classId, date and period are required');

    const [students, marks, slot, onLeave] = await Promise.all([
      Student.findAll({ where: { classId, status: 'active' }, order: [['firstName', 'ASC']] }),
      PeriodAttendance.findAll({ where: { classId, date, period } }),
      TimetableSlot.findOne({
        where: { classId, day: dayOfWeek(date), period },
        include: [{ model: Subject, attributes: ['name'] }],
      }),
      studentsOnLeave(date),
    ]);
    const byStudent = new Map(marks.map((m) => [m.studentId, m.status]));
    res.json({
      subjectId: slot?.subjectId ?? null,
      subjectName: slot?.Subject?.name ?? null,
      students: students.map((s) => ({
        studentId: s.id,
        admissionNo: s.admissionNo,
        name: `${s.firstName} ${s.lastName}`,
        status: byStudent.get(s.id) ?? null,
        onApprovedLeave: onLeave.has(s.id),
      })),
    });
  }),
);

// POST /api/period-attendance { classId, date, period, subjectId?, records: [{ studentId, status }] }
periodRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { classId, date, period, subjectId, records = [] } = req.body;
    if (!classId || !date || !period) throw badRequest('classId, date and period are required');
    if (!(await SchoolClass.findByPk(classId))) throw notFound('Class not found');

    const members = new Set(
      (await Student.findAll({ where: { classId }, attributes: ['id'] })).map((s) => s.id),
    );
    if (records.some((r) => !members.has(Number(r.studentId))))
      throw badRequest('Every student must belong to the chosen class');

    await sequelize.transaction(async (transaction) => {
      for (const { studentId, status } of records) {
        await PeriodAttendance.upsert(
          { studentId, classId, date, period, subjectId: subjectId || null, status },
          { transaction },
        );
      }
    });
    res.json({ saved: records.length });
  }),
);

// GET /api/period-attendance/summary?classId=&from=&to= -> periods missed per student, worst first
periodRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { classId, from, to } = req.query;
    if (!classId || !from || !to) throw badRequest('classId, from and to are required');
    const students = await Student.findAll({
      where: { classId, status: 'active' },
      include: [
        {
          model: PeriodAttendance,
          required: false,
          where: { date: { [Op.between]: [from, to] } },
          attributes: ['status'],
        },
      ],
    });
    res.json(
      students
        .map((s) => {
          const absent = s.PeriodAttendances.filter((p) => p.status === 'absent').length;
          const total = s.PeriodAttendances.length;
          return {
            studentId: s.id,
            admissionNo: s.admissionNo,
            name: `${s.firstName} ${s.lastName}`,
            periods: total,
            absent,
            late: s.PeriodAttendances.filter((p) => p.status === 'late').length,
            percentage: total ? Math.round(((total - absent) / total) * 1000) / 10 : null,
          };
        })
        .sort((a, b) => b.absent - a.absent),
    );
  }),
);

/* ---------- Parent absence alerts ---------- */

export const alertRouter = Router();
const METHODS = ['call', 'sms', 'whatsapp', 'in_person', 'portal'];

// GET /api/absence-alerts/auto -> whether automatic alerts are on, from when, and whether they also text the guardian
alertRouter.get(
  '/auto',
  asyncHandler(async (_req, res) => res.json(await autoAbsenceStatus())),
);
// POST /api/absence-alerts/auto/run -> send today's alerts now (admin), ignoring the switch and the cut-off time
alertRouter.post(
  '/auto/run',
  requireRole('admin'),
  asyncHandler(async (_req, res) => res.json(await runAbsenceAlerts({ force: true }))),
);

// GET /api/absence-alerts?date=&classId= -> students marked absent, with guardian contact and whether anyone was told
alertRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const date = req.query.date || today();
    const { classId } = req.query;
    const [absent, onLeave] = await Promise.all([
      Attendance.findAll({
        where: { date, status: 'absent' },
        include: [
          {
            model: Student,
            where: { status: 'active', ...(classId && { classId }) },
            include: [SchoolClass],
          },
        ],
      }),
      studentsOnLeave(date),
    ]);
    const alerts = await AbsenceAlert.findAll({
      where: { date, studentId: absent.map((a) => a.studentId) },
      order: [['id', 'DESC']],
    });
    const byStudent = new Map();
    alerts.forEach((a) => byStudent.set(a.studentId, [...(byStudent.get(a.studentId) ?? []), a]));

    res.json(
      absent.map((a) => ({
        studentId: a.studentId,
        admissionNo: a.Student.admissionNo,
        name: `${a.Student.firstName} ${a.Student.lastName}`,
        className: a.Student.SchoolClass
          ? `${a.Student.SchoolClass.name}-${a.Student.SchoolClass.section}`
          : null,
        guardianName: a.Student.guardianName,
        guardianPhone: a.Student.guardianPhone,
        onApprovedLeave: onLeave.has(a.studentId),
        notified: (byStudent.get(a.studentId) ?? []).map((n) => ({
          method: n.method,
          note: n.note,
          by: n.notifiedByName,
          at: n.createdAt,
        })),
      })),
    );
  }),
);

// POST /api/absence-alerts/send { studentId, date } texts the guardian; only a delivered SMS is logged as "informed"
alertRouter.post(
  '/send',
  asyncHandler(async (req, res) => {
    res.status(201).json(await sendAbsenceAlert(req.body, req.user));
  }),
);

// POST /api/absence-alerts { studentId, date, method, note? } logs that the guardian was told
alertRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { studentId, date, method, note } = req.body;
    if (!METHODS.includes(method)) throw badRequest(`Method must be one of ${METHODS.join(', ')}`);
    const mark = await Attendance.findOne({ where: { studentId, date: date || today(), status: 'absent' } });
    if (!mark) throw badRequest('That student is not marked absent on this date');
    const row = await AbsenceAlert.create({
      studentId,
      date: date || today(),
      method,
      note: note || null,
      notifiedBy: req.user.id,
      notifiedByName: req.user.name,
    });
    res.status(201).json({ id: row.id });
  }),
);
