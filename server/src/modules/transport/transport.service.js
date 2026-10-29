import { Op } from 'sequelize';
import {
  Student,
  StudentTransport,
  TransportAttendance,
  TransportRoute,
  TransportStop,
  Vehicle,
  VehicleMaintenance,
  sequelize,
} from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { daysFromNow, today } from '../../utils/money.js';
import { billStudents } from '../finance/fees.service.js';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const EXPIRY_WARNING_DAYS = 30;

const inDays = (days) => daysFromNow(days);

/** How many students already ride routes that use this vehicle, optionally ignoring one student. */
async function seatsTaken(vehicleId, { exceptStudentId } = {}, transaction) {
  const routes = await TransportRoute.findAll({ where: { vehicleId }, attributes: ['id'], transaction });
  if (!routes.length) return 0;
  return StudentTransport.count({
    where: {
      routeId: routes.map((r) => r.id),
      ...(exceptStudentId && { studentId: { [Op.ne]: exceptStudentId } }),
    },
    transaction,
  });
}

export async function listVehicles() {
  const vehicles = await Vehicle.findAll({ order: [['regNo', 'ASC']] });
  const rows = [];
  for (const v of vehicles) {
    rows.push({ ...v.toJSON(), seatsTaken: await seatsTaken(v.id) });
  }
  return rows;
}

export async function listRoutes() {
  const routes = await TransportRoute.findAll({
    include: [
      { model: Vehicle, attributes: ['regNo'] },
      { model: TransportStop, attributes: ['id'] },
      { model: StudentTransport, attributes: ['id'] },
    ],
    order: [['name', 'ASC']],
  });
  return routes.map((r) => ({
    id: r.id,
    name: r.name,
    vehicleId: r.vehicleId,
    monthlyFee: r.monthlyFee,
    vehicleRegNo: r.Vehicle?.regNo ?? null,
    stopCount: r.TransportStops.length,
    studentCount: r.StudentTransports.length,
  }));
}

export async function listStops(routeId) {
  const stops = await TransportStop.findAll({
    where: routeId ? { routeId } : {},
    include: [{ model: TransportRoute, attributes: ['name'] }],
    order: [
      ['routeId', 'ASC'],
      ['sequence', 'ASC'],
    ],
  });
  return stops.map((s) => ({ ...s.toJSON(), TransportRoute: undefined, routeName: s.TransportRoute.name }));
}

/** A stop or route still used by students cannot be deleted; they would silently lose their transport. */
export async function deleteStop(id) {
  const stop = await TransportStop.findByPk(id);
  if (!stop) throw notFound('Stop not found');
  if (await StudentTransport.count({ where: { stopId: id } }))
    throw conflict('Students are assigned to this stop');
  await stop.destroy();
}

export async function deleteRoute(id) {
  const route = await TransportRoute.findByPk(id);
  if (!route) throw notFound('Route not found');
  if (await StudentTransport.count({ where: { routeId: id } }))
    throw conflict('Students are assigned to this route');
  await route.destroy();
}

export async function listAssignments({ routeId } = {}) {
  const rows = await StudentTransport.findAll({
    where: routeId ? { routeId } : {},
    include: [
      { model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] },
      { model: TransportRoute, attributes: ['name', 'monthlyFee'] },
      { model: TransportStop, attributes: ['name', 'pickupTime'] },
    ],
    order: [
      ['routeId', 'ASC'],
      ['stopId', 'ASC'],
    ],
  });
  return rows.map((a) => ({
    studentId: a.studentId,
    studentName: `${a.Student.firstName} ${a.Student.lastName}`,
    admissionNo: a.Student.admissionNo,
    routeId: a.routeId,
    routeName: a.TransportRoute.name,
    monthlyFee: a.TransportRoute.monthlyFee,
    stopId: a.stopId,
    stopName: a.TransportStop.name,
    pickupTime: a.TransportStop.pickupTime,
    startDate: a.startDate,
    tripType: a.tripType,
    authorizedPickupName: a.authorizedPickupName,
    authorizedPickupPhone: a.authorizedPickupPhone,
    remarks: a.remarks,
  }));
}

const TRIP_TYPES = ['both', 'pickup', 'drop'];

/** Who may collect the child and which trips they use; checked when given. */
function ridingDetails(body) {
  const tripType = body.tripType || 'both';
  if (!TRIP_TYPES.includes(tripType)) throw badRequest('Trip type must be both, pickup or drop');
  const clean = (v, max, label) => {
    const t = v === undefined || v === null ? '' : String(v).trim();
    if (t.length > max) throw badRequest(`${label} must be ${max} characters or fewer`);
    return t || null;
  };
  const phone = clean(body.authorizedPickupPhone, 20, 'Pickup person phone');
  if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) throw badRequest('Pickup person phone is invalid');
  return {
    tripType,
    authorizedPickupName: clean(body.authorizedPickupName, 100, 'Pickup person name'),
    authorizedPickupPhone: phone,
    remarks: clean(body.remarks, 255, 'Remarks'),
  };
}

/**
 * Puts a student on a route and stop (or moves them). The stop must belong to the route, and a
 * route's vehicle cannot carry more students than its capacity across all routes it serves.
 */
export async function assignStudent(body) {
  const { studentId, routeId, stopId, startDate } = body;
  if (!studentId || !routeId || !stopId) throw badRequest('Student, route and stop are required');
  const details = ridingDetails(body);

  return sequelize.transaction(async (transaction) => {
    const student = await Student.findByPk(studentId, { transaction });
    if (!student) throw notFound('Student not found');
    if (student.status !== 'active') throw conflict('Only active students can use transport');

    const route = await TransportRoute.findByPk(routeId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!route) throw notFound('Route not found');
    const stop = await TransportStop.findByPk(stopId, { transaction });
    if (!stop || stop.routeId !== route.id) throw badRequest('That stop is not on the chosen route');

    if (route.vehicleId) {
      const vehicle = await Vehicle.findByPk(route.vehicleId, { transaction, lock: transaction.LOCK.UPDATE });
      if ((await seatsTaken(vehicle.id, { exceptStudentId: student.id }, transaction)) >= vehicle.capacity) {
        throw conflict(`Vehicle ${vehicle.regNo} is full (${vehicle.capacity} seats)`);
      }
    }

    await StudentTransport.upsert(
      { studentId, routeId, stopId, startDate: startDate || null, ...details },
      { transaction },
    );
  });
}

export async function unassignStudent(studentId) {
  if (!(await StudentTransport.destroy({ where: { studentId } })))
    throw notFound('Student is not on transport');
}

/**
 * Bills every assigned student their route's monthly fee for `month` ("YYYY-MM") through the normal
 * fee flow, so it shows up in Fees & payments, receipts and reports. Running it twice never double-bills.
 */
export async function generateTransportFees({ month, dueDate }) {
  if (!MONTH.test(month ?? '')) throw badRequest('month must be YYYY-MM');
  const title = `Transport ${month}`;

  const routes = await TransportRoute.findAll({ where: { monthlyFee: { [Op.gt]: 0 } } });
  let created = 0;
  let skipped = 0;
  await sequelize.transaction(async (transaction) => {
    for (const route of routes) {
      const riders = await StudentTransport.findAll({
        where: { routeId: route.id },
        include: [{ model: Student, attributes: [], where: { status: 'active' } }],
        transaction,
      });
      if (!riders.length) continue;
      const result = await billStudents(
        riders.map((r) => r.studentId),
        { title, amount: route.monthlyFee, dueDate },
        transaction,
      );
      created += result.created;
      skipped += result.skipped;
    }
  });
  return { title, created, skipped };
}

/** Riders on a route with their boarding status for one trip. */
export async function getRoster(routeId, date, trip) {
  const riders = await StudentTransport.findAll({
    where: { routeId },
    include: [
      { model: Student, attributes: ['firstName', 'lastName', 'admissionNo'], where: { status: 'active' } },
      { model: TransportStop, attributes: ['name', 'sequence'] },
    ],
  });
  const marks = await TransportAttendance.findAll({
    where: { date, trip, studentId: riders.map((r) => r.studentId) },
  });
  const byStudent = new Map(marks.map((m) => [m.studentId, m.status]));
  return riders
    .sort((a, b) => a.TransportStop.sequence - b.TransportStop.sequence)
    .map((r) => ({
      studentId: r.studentId,
      name: `${r.Student.firstName} ${r.Student.lastName}`,
      admissionNo: r.Student.admissionNo,
      stopName: r.TransportStop.name,
      status: byStudent.get(r.studentId) ?? null,
    }));
}

export async function saveAttendance({ date, trip, records = [] }) {
  if (!date || !['morning', 'evening'].includes(trip))
    throw badRequest('date and trip (morning|evening) are required');
  if (records.some((r) => !['boarded', 'absent'].includes(r.status)))
    throw badRequest('Status must be boarded or absent');
  await sequelize.transaction(async (transaction) => {
    for (const { studentId, status } of records) {
      await TransportAttendance.upsert({ studentId, date, trip, status }, { transaction });
    }
  });
}

export async function listMaintenance() {
  const rows = await VehicleMaintenance.findAll({
    include: [{ model: Vehicle, attributes: ['regNo'] }],
    order: [
      ['serviceDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return rows.map((m) => ({ ...m.toJSON(), Vehicle: undefined, vehicleRegNo: m.Vehicle.regNo }));
}

/** Fleet overview: seat use, running costs, and anything that expires or falls due soon. */
export async function summary() {
  const soon = inDays(EXPIRY_WARNING_DAYS);
  const [vehicles, routes, maintenance, ridersTotal, dueSoon] = await Promise.all([
    listVehicles(),
    listRoutes(),
    VehicleMaintenance.sum('cost'),
    StudentTransport.count(),
    VehicleMaintenance.findAll({
      where: { nextDue: { [Op.lte]: soon } },
      include: [{ model: Vehicle, attributes: ['regNo'] }],
      order: [['nextDue', 'ASC']],
    }),
  ]);

  return {
    riders: ridersTotal,
    vehicles: vehicles.map((v) => ({
      id: v.id,
      regNo: v.regNo,
      capacity: v.capacity,
      seatsTaken: v.seatsTaken,
      status: v.status,
      insuranceExpiry: v.insuranceExpiry,
      insuranceExpiring: Boolean(v.insuranceExpiry && v.insuranceExpiry <= soon),
    })),
    routes,
    maintenanceCost: maintenance || 0,
    maintenanceDue: dueSoon.map((m) => ({
      vehicleRegNo: m.Vehicle.regNo,
      description: m.description,
      nextDue: m.nextDue,
      overdue: m.nextDue < today(),
    })),
  };
}
