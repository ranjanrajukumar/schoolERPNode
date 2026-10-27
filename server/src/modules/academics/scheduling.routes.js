import { Router } from 'express';
import { Room } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import {
  assignSubstitute, createBooking, deleteBooking, deleteRoom, freeTeachers, listRooms, listSubstitutions, neededCover, removeSubstitution,
  roomSchedule, timetableReport,
} from './scheduling.service.js';

// Mounted behind requireRole('admin'): rooms, cover and timetable reports belong to the school office.
const router = Router();

router.delete('/rooms/:id', asyncHandler(async (req, res) => { await deleteRoom(req.params.id); res.json({ ok: true }); }));
router.get('/rooms/:id/schedule', asyncHandler(async (req, res) => res.json(await roomSchedule(req.params.id))));
router.use('/rooms', crudRouter(Room, { fields: ['name', 'kind', 'capacity'], list: listRooms }));

router.post('/bookings', asyncHandler(async (req, res) => res.status(201).json({ id: await createBooking(req.body, req.user.name) })));
router.delete('/bookings/:id', asyncHandler(async (req, res) => { await deleteBooking(req.params.id); res.json({ ok: true }); }));

// GET /api/scheduling/substitutions/needed?date=  periods of teachers on approved leave that day
router.get('/substitutions/needed', asyncHandler(async (req, res) => res.json(await neededCover(req.query.date))));
// GET /api/scheduling/substitutions/free?date=&period=  teachers who can cover
router.get('/substitutions/free', asyncHandler(async (req, res) => res.json(await freeTeachers(req.query.date, req.query.period))));
router.get('/substitutions', asyncHandler(async (req, res) => res.json(await listSubstitutions(req.query))));
router.post('/substitutions', asyncHandler(async (req, res) => res.status(201).json({ id: await assignSubstitute(req.body, req.user.name) })));
router.delete('/substitutions/:id', asyncHandler(async (req, res) => { await removeSubstitution(req.params.id); res.json({ ok: true }); }));

router.get('/report', asyncHandler(async (_req, res) => res.json(await timetableReport())));

export default router;
