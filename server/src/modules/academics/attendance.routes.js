import { Router } from 'express';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { saveStudentMonthly, studentMonthly } from '../attendance/monthly.service.js';
import { getRoster, listCorrections, saveRecords } from './attendance.service.js';
import { assertTeacherMayView } from './teacherScope.js';

const router = Router();

/**
 * @openapi
 * /attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: Active students and their mark for one day
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: classId
 *         schema: { type: integer }
 *     responses:
 *       200: { description: The day's roster }
 *       400: { description: date is required }
 *   post:
 *     tags: [Attendance]
 *     summary: Save a day's attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date]
 *             properties:
 *               date: { type: string, format: date }
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     studentId: { type: integer }
 *                     status: { type: string }
 *               reason: { type: string }
 *     responses:
 *       200: { description: Saved }
 *       400: { description: date is required }
 */
// GET /api/attendance?date=YYYY-MM-DD&classId=1 -> active students with their status for that day
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { date, classId } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });
    await assertTeacherMayView(req.user, classId, { date });
    res.json(await getRoster(date, classId || null));
  }),
);

/**
 * @openapi
 * /attendance/monthly:
 *   get:
 *     tags: [Attendance]
 *     summary: Every student's mark for each day of a month, with totals
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string, example: "2026-10" }
 *       - in: query
 *         name: classId
 *         schema: { type: integer }
 *     responses:
 *       200: { description: The monthly register }
 *   post:
 *     tags: [Attendance]
 *     summary: Save edits made on the monthly register
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               month: { type: string, example: "2026-10" }
 *               changes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     date: { type: string, format: date }
 *                     status: { type: string }
 *               reason: { type: string }
 *     responses:
 *       200: { description: Saved }
 */
// GET /api/attendance/monthly?month=2026-10&classId= -> each student's mark for every day of the month, with totals
router.get(
  '/monthly',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    await assertTeacherMayView(req.user, req.query.classId, { month: req.query.month });
    res.json(await studentMonthly(req.query.month, req.query.classId || null));
  }),
);

// POST /api/attendance/monthly { month, changes: [{ id, date, status }], reason? } -> saves edits made on the monthly register
router.post(
  '/monthly',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => res.json(await saveStudentMonthly(req.body, req.user))),
);

/**
 * @openapi
 * /attendance/corrections:
 *   get:
 *     tags: [Attendance]
 *     summary: Attendance records changed after the original mark, for a student or date range
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema: { type: integer }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: The matching corrections }
 */
// GET /api/attendance/corrections?studentId=&from=&to=
router.get(
  '/corrections',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => res.json(await listCorrections(req.query))),
);

// POST /api/attendance { date, records: [{studentId, status}], reason? }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { date, records = [], reason } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });
    res.json({ ok: true, ...(await saveRecords(date, records, { reason, user: req.user })) });
  }),
);

export default router;
