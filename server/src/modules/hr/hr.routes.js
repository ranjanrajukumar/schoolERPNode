import { Router } from 'express';
import { Department, Designation, Staff, StaffAttendance } from '../../models/index.js';
import { requireRole, writeRoles } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import { Op } from 'sequelize';
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
const staffOnly = requireRole('admin', 'teacher');

// A teacher or admin who is also a staff member reaches their own record through the account's staff link.
const ownStaffId = (req) => {
  if (!req.user.staffId)
    throw badRequest('This login is not linked to a staff record. Ask the school office.');
  return req.user.staffId;
};

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
// GET /api/hr/attendance/mine?month=YYYY-MM -> the signed-in staff member's own marks for the month
router.get(
  '/attendance/mine',
  staffOnly,
  asyncHandler(async (req, res) => {
    const month = /^d{4}-d{2}$/.test(req.query.month ?? '')
      ? req.query.month
      : new Date().toISOString().slice(0, 7);
    const rows = await StaffAttendance.findAll({
      where: { staffId: ownStaffId(req), date: { [Op.between]: [`${month}-01`, `${month}-31`] } },
      order: [['date', 'DESC']],
    });
    res.json(rows.map((r) => ({ id: r.id, date: r.date, status: r.status })));
  }),
);
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
// The signed-in staff member's own leave requests and balance
router.get(
  '/leaves/mine',
  staffOnly,
  asyncHandler(async (req, res) => res.json(await listLeaves({ staffId: ownStaffId(req) }))),
);
router.get(
  '/leave-balance/mine',
  staffOnly,
  asyncHandler(async (req, res) => res.json(await leaveBalance(ownStaffId(req)))),
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
  staffOnly,
  asyncHandler(async (req, res) => {
    // a teacher can only apply for themselves; the leave type's rules decide approval
    const body = req.user.role === 'admin' ? req.body : { ...req.body, staffId: ownStaffId(req) };
    res.status(201).json(await applyLeave(body));
  }),
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
