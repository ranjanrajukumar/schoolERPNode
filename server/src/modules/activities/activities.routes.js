import { Router } from 'express';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  billParticipants, createActivity, deleteActivity, getParticipants, listActivities, markAttendance, register,
  setConsent, setResult, setStatus, summary, updateActivity, withdraw,
} from './activities.service.js';

const router = Router();
const organisers = requireRole('admin', 'teacher');

// Reads are open to every staff role; the routes below that change data name their roles.
router.get('/', asyncHandler(async (req, res) => res.json(await listActivities(req.query))));

// GET /api/activities/summary?from=&to=  (declared before /:id)
router.get('/summary', asyncHandler(async (req, res) => res.json(await summary(req.query))));

router.post('/', organisers, asyncHandler(async (req, res) => res.status(201).json({ id: await createActivity(req.body, req.user.id) })));

router.put('/:id', organisers, asyncHandler(async (req, res) => {
  await updateActivity(req.params.id, req.body);
  res.json({ ok: true });
}));

router.post('/:id/status', organisers, asyncHandler(async (req, res) => {
  await setStatus(req.params.id, req.body.status);
  res.json({ ok: true });
}));

router.delete('/:id', organisers, asyncHandler(async (req, res) => {
  await deleteActivity(req.params.id);
  res.json({ ok: true });
}));

router.get('/:id/participants', asyncHandler(async (req, res) => res.json(await getParticipants(req.params.id))));

// POST /api/activities/:id/participants { studentIds: [] } or { classId }
router.post('/:id/participants', organisers, asyncHandler(async (req, res) => res.status(201).json(await register(req.params.id, req.body))));

router.delete('/:id/participants/:studentId', organisers, asyncHandler(async (req, res) => {
  await withdraw(req.params.id, req.params.studentId);
  res.json({ ok: true });
}));

// POST /api/activities/:id/attendance { records: [{ studentId, status }] }
router.post('/:id/attendance', organisers, asyncHandler(async (req, res) => {
  res.json({ saved: await markAttendance(req.params.id, req.body.records) });
}));

router.put('/:id/participants/:studentId/result', organisers, asyncHandler(async (req, res) => {
  await setResult(req.params.id, req.params.studentId, req.body);
  res.json({ ok: true });
}));

router.put('/:id/participants/:studentId/consent', organisers, asyncHandler(async (req, res) => {
  await setConsent(req.params.id, req.params.studentId, req.body.consent);
  res.json({ ok: true });
}));

// POST /api/activities/:id/bill -> bills the activity fee to everyone who is going
router.post('/:id/bill', requireRole('admin', 'accountant'), asyncHandler(async (req, res) => res.json(await billParticipants(req.params.id))));

export default router;
