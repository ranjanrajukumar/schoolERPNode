import { Router } from 'express';
import { Hostel, HostelRoom } from '../../models/index.js';
import { requireRole, writeRoles } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import { badRequest } from '../../utils/httpError.js';
import {
  allocateStudent, checkInVisitor, checkOutVisitor, deleteHostel, deleteMeal, deleteRoom, generateHostelFees,
  getRoster, listAllocations, listHostels, listMeals, listRooms, listVisitors, saveAttendance, saveMeal, summary,
  vacateStudent,
} from './hostel.service.js';

const router = Router();
const admin = writeRoles('admin');

// Reads are open to every staff role; changes belong to the admin unless noted per route.
router.delete('/hostels/:id', admin, asyncHandler(async (req, res) => { await deleteHostel(req.params.id); res.json({ ok: true }); }));
router.use('/hostels', admin, crudRouter(Hostel, {
  fields: ['name', 'type', 'wardenName', 'wardenPhone', 'address'], list: listHostels,
}));

router.delete('/rooms/:id', admin, asyncHandler(async (req, res) => { await deleteRoom(req.params.id); res.json({ ok: true }); }));
router.use('/rooms', admin, crudRouter(HostelRoom, {
  fields: ['hostelId', 'roomNo', 'capacity', 'monthlyFee'], list: () => listRooms(),
}));

// Room allocation
router.get('/allocations', asyncHandler(async (req, res) => res.json(await listAllocations(req.query))));
router.post('/allocations', admin, asyncHandler(async (req, res) => {
  await allocateStudent(req.body);
  res.status(201).json({ ok: true });
}));
router.delete('/allocations/:studentId', admin, asyncHandler(async (req, res) => {
  await vacateStudent(req.params.studentId);
  res.json({ ok: true });
}));

// Night roll call: admins and teachers (wardens) can mark it
router.get('/attendance', asyncHandler(async (req, res) => {
  const { hostelId, date } = req.query;
  if (!hostelId || !date) throw badRequest('hostelId and date are required');
  res.json(await getRoster(hostelId, date));
}));
router.post('/attendance', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => {
  await saveAttendance(req.body);
  res.json({ ok: true });
}));

// Mess menu
router.get('/meals', asyncHandler(async (req, res) => res.json(await listMeals(req.query.hostelId))));
router.post('/meals', admin, asyncHandler(async (req, res) => { await saveMeal(req.body); res.status(201).json({ ok: true }); }));
router.delete('/meals/:id', admin, asyncHandler(async (req, res) => { await deleteMeal(req.params.id); res.json({ ok: true }); }));

// Visitor log: front-desk staff (admin, teacher) check people in and out
router.get('/visitors', asyncHandler(async (req, res) => res.json(await listVisitors({ open: req.query.open === '1' }))));
router.post('/visitors', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => {
  await checkInVisitor(req.body);
  res.status(201).json({ ok: true });
}));
router.post('/visitors/:id/checkout', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => {
  await checkOutVisitor(req.params.id);
  res.json({ ok: true });
}));

// POST /api/hostel/fees/generate { month: "2026-10", dueDate? } bills every boarder via the normal fee flow
router.post('/fees/generate', requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
  res.json(await generateHostelFees(req.body));
}));

router.get('/summary', asyncHandler(async (_req, res) => res.json(await summary())));

export default router;
