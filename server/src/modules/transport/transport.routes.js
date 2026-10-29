import { Router } from 'express';
import {
  TransportRoute,
  TransportStaff,
  TransportStop,
  Vehicle,
  VehicleMaintenance,
} from '../../models/index.js';
import { requireRole, writeRoles } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import {
  assignStudent,
  deleteRoute,
  deleteStop,
  generateTransportFees,
  getRoster,
  listAssignments,
  listMaintenance,
  listRoutes,
  listStops,
  listVehicles,
  saveAttendance,
  summary,
  unassignStudent,
} from './transport.service.js';
import { badRequest } from '../../utils/httpError.js';
import {
  issueTrackerKey,
  liveFleet,
  recordLocation,
  trackerKeys,
  trail,
  vehicleForKey,
} from './tracking.service.js';

const router = Router();
const admin = writeRoles('admin');

// Reads are open to every staff role; changes belong to the admin unless noted per route.
router.use(
  '/vehicles',
  admin,
  crudRouter(Vehicle, {
    fields: ['regNo', 'model', 'capacity', 'insuranceExpiry', 'status'],
    list: listVehicles,
  }),
);

router.use(
  '/staff',
  admin,
  crudRouter(TransportStaff, {
    fields: ['name', 'role', 'phone', 'licenseNo', 'licenseExpiry', 'vehicleId'],
    list: async () => {
      const rows = await TransportStaff.findAll({
        include: [{ model: Vehicle, attributes: ['regNo'] }],
        order: [['name', 'ASC']],
      });
      return rows.map((s) => ({ ...s.toJSON(), Vehicle: undefined, vehicleRegNo: s.Vehicle?.regNo ?? null }));
    },
  }),
);

const routeCrud = crudRouter(TransportRoute, {
  fields: ['name', 'vehicleId', 'monthlyFee'],
  list: listRoutes,
});
router.delete(
  '/routes/:id',
  admin,
  asyncHandler(async (req, res) => {
    await deleteRoute(req.params.id);
    res.json({ ok: true });
  }),
);
router.use('/routes', admin, routeCrud);

const stopCrud = crudRouter(TransportStop, {
  fields: ['routeId', 'name', 'sequence', 'pickupTime'],
  list: () => listStops(),
});
router.delete(
  '/stops/:id',
  admin,
  asyncHandler(async (req, res) => {
    await deleteStop(req.params.id);
    res.json({ ok: true });
  }),
);
router.use('/stops', admin, stopCrud);

router.use(
  '/maintenance',
  admin,
  crudRouter(VehicleMaintenance, {
    fields: ['vehicleId', 'serviceDate', 'description', 'cost', 'nextDue'],
    list: listMaintenance,
  }),
);

// Student route assignment
router.get(
  '/assignments',
  asyncHandler(async (req, res) => res.json(await listAssignments(req.query))),
);
router.post(
  '/assignments',
  admin,
  asyncHandler(async (req, res) => {
    await assignStudent(req.body);
    res.status(201).json({ ok: true });
  }),
);
router.delete(
  '/assignments/:studentId',
  admin,
  asyncHandler(async (req, res) => {
    await unassignStudent(req.params.studentId);
    res.json({ ok: true });
  }),
);

// Boarding attendance: admins and teachers (e.g. the bus attendant's supervisor) can mark it
router.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const { routeId, date, trip } = req.query;
    if (!routeId || !date || !trip) throw badRequest('routeId, date and trip are required');
    res.json(await getRoster(routeId, date, trip));
  }),
);
router.post(
  '/attendance',
  requireRole('admin', 'teacher'),
  asyncHandler(async (req, res) => {
    await saveAttendance(req.body);
    res.json({ ok: true });
  }),
);

// POST /api/transport/fees/generate { month: "2026-10", dueDate? } bills every rider via the normal fee flow
router.post(
  '/fees/generate',
  requireRole('admin', 'accountant'),
  asyncHandler(async (req, res) => {
    res.json(await generateTransportFees(req.body));
  }),
);

router.get(
  '/summary',
  asyncHandler(async (_req, res) => res.json(await summary())),
);

// Live GPS: positions are read by every staff role; GPS keys are shown and replaced by the admin only
router.get(
  '/tracking',
  asyncHandler(async (_req, res) => res.json(await liveFleet())),
);
// a key is all a GPS unit needs to report a position, so only a built-in admin (not a custom role built on admin) may read or replace one
const builtInAdmin = (req, res, next) =>
  req.user.role === 'admin' && !req.user.customRole ? next() : res.status(403).json({ error: 'Forbidden' });
router.get(
  '/tracking/keys',
  builtInAdmin,
  asyncHandler(async (_req, res) => res.json(await trackerKeys())),
);
router.get(
  '/tracking/:vehicleId/trail',
  asyncHandler(async (req, res) => res.json(await trail(req.params.vehicleId, req.query.hours))),
);
router.post(
  '/tracking/:vehicleId/key',
  builtInAdmin,
  asyncHandler(async (req, res) => res.json(await issueTrackerKey(req.params.vehicleId))),
);

/**
 * The endpoint the bus's GPS unit calls, mounted before sign-in (see routes/index.js): it carries a vehicle key, not a user token.
 * POST /api/device/location  x-tracker-key: <key>  { latitude, longitude, speed?, time? }
 */
export const trackerRouter = Router();
trackerRouter.post(
  '/location',
  asyncHandler(async (req, res) => {
    const vehicle = await vehicleForKey(String(req.headers['x-tracker-key'] ?? ''));
    if (!vehicle) return res.status(401).json({ error: 'Unknown tracker key' });
    await recordLocation(vehicle, req.body);
    res.json({ ok: true });
  }),
);

export default router;
