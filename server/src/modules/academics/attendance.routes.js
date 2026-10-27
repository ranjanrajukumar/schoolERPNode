import { Router } from 'express';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { saveStudentMonthly, studentMonthly } from '../attendance/monthly.service.js';
import { getRoster, listCorrections, saveRecords } from './attendance.service.js';

const router = Router();

// GET /api/attendance?date=YYYY-MM-DD&classId=1 -> active students with their status for that day
router.get('/', asyncHandler(async (req, res) => {
  const { date, classId } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required' });
  res.json(await getRoster(date, classId || null));
}));

// GET /api/attendance/monthly?month=2026-10&classId= -> each student's mark for every day of the month, with totals
router.get('/monthly', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => res.json(await studentMonthly(req.query.month, req.query.classId || null))));

// POST /api/attendance/monthly { month, changes: [{ id, date, status }], reason? } -> saves edits made on the monthly register
router.post('/monthly', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => res.json(await saveStudentMonthly(req.body, req.user))));

// GET /api/attendance/corrections?studentId=&from=&to=
router.get('/corrections', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => res.json(await listCorrections(req.query))));

// POST /api/attendance { date, records: [{studentId, status}], reason? }
router.post('/', asyncHandler(async (req, res) => {
  const { date, records = [], reason } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });
  res.json({ ok: true, ...(await saveRecords(date, records, { reason, user: req.user })) });
}));

export default router;
