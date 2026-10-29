import { Router } from 'express';
import { Department, Designation, Staff } from '../../models/index.js';
import { requireRole, writeRoles } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import { badRequest } from '../../utils/httpError.js';
import { saveStaffMonthly, staffMonthly } from '../attendance/monthly.service.js';
import {
  applyLeave,
  cancelLeave,
  decideLeave,
  getRoster,
  hrSummary,
  leaveBalance,
  listLeaves,
  saveAttendance,
} from './hr.service.js';

const router = Router();
const admin = requireRole('admin');

// Departments and designations feed the staff form, so every staff role can read them.
router.use(
  '/departments',
  writeRoles('admin'),
  crudRouter(Department, {
    fields: ['name', 'headStaffId'],
    list: async () => {
      const [departments, staff] = await Promise.all([
        Department.findAll({ order: [['name', 'ASC']] }),
        Staff.findAll({ attributes: ['id', 'firstName', 'lastName'] }),
      ]);
      const names = new Map(staff.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));
      return departments.map((d) => ({
        id: d.id,
        name: d.name,
        headStaffId: d.headStaffId,
        headName: names.get(d.headStaffId) ?? null,
      }));
    },
  }),
);
router.use(
  '/designations',
  writeRoles('admin'),
  crudRouter(Designation, {
    fields: ['name'],
    list: () => Designation.findAll({ order: [['name', 'ASC']] }),
  }),
);

// Staff attendance
router.get(
  '/attendance',
  admin,
  asyncHandler(async (req, res) => {
    if (!req.query.date) throw badRequest('date is required');
    res.json(await getRoster(req.query.date));
  }),
);
router.get(
  '/attendance/monthly',
  admin,
  asyncHandler(async (req, res) => res.json(await staffMonthly(req.query.month, req.query.category || null))),
);
router.post(
  '/attendance/monthly',
  admin,
  asyncHandler(async (req, res) => res.json(await saveStaffMonthly(req.body))),
);
router.post(
  '/attendance',
  admin,
  asyncHandler(async (req, res) => {
    await saveAttendance(req.body);
    res.json({ ok: true });
  }),
);

// Leave
// Leave is read and decided by admins and by department heads (for their own department, where the leave type says so)
const deciders = requireRole('admin', 'teacher');
router.get(
  '/leaves',
  deciders,
  asyncHandler(async (req, res) => res.json(await listLeaves(req.query, req.user))),
);
router.get(
  '/leave-balance/:staffId',
  admin,
  asyncHandler(async (req, res) => {
    res.json(await leaveBalance(req.params.staffId, req.query.year || undefined));
  }),
);
router.post(
  '/leaves',
  admin,
  asyncHandler(async (req, res) => res.status(201).json(await applyLeave(req.body))),
);
router.post(
  '/leaves/:id/approve',
  deciders,
  asyncHandler(async (req, res) => {
    await decideLeave(req.params.id, 'approved', req.body, req.user);
    res.json({ ok: true });
  }),
);
router.post(
  '/leaves/:id/reject',
  deciders,
  asyncHandler(async (req, res) => {
    await decideLeave(req.params.id, 'rejected', req.body, req.user);
    res.json({ ok: true });
  }),
);
router.post(
  '/leaves/:id/cancel',
  admin,
  asyncHandler(async (req, res) => {
    await cancelLeave(req.params.id);
    res.json({ ok: true });
  }),
);

// GET /api/hr/reports?month=YYYY-MM
router.get(
  '/reports',
  admin,
  asyncHandler(async (req, res) => {
    res.json(await hrSummary(req.query.month || new Date().toISOString().slice(0, 7)));
  }),
);

export default router;
