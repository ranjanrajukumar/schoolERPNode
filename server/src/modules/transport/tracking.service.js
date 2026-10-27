import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { TransportRoute, Vehicle, VehicleLocation, VehicleTracker } from '../../models/index.js';
import { badRequest, notFound } from '../../utils/httpError.js';

const newKey = () => crypto.randomBytes(24).toString('hex');
const LIVE_MINUTES = 5; // a bus that has not reported for longer than this is shown as offline
const KEEP_DAYS = 7;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

const isLive = (at) => Date.now() - new Date(at).getTime() < LIVE_MINUTES * 60 * 1000;

/** The vehicle whose GPS unit owns this key, or null. */
export async function vehicleForKey(key) {
  if (!key || key.length !== 48) return null;
  const tracker = await VehicleTracker.findOne({ where: { apiKey: key }, include: [{ model: Vehicle, where: { status: 'active' } }] });
  return tracker && crypto.timingSafeEqual(Buffer.from(tracker.apiKey), Buffer.from(key)) ? tracker.Vehicle : null;
}

/** Stores one position: { latitude, longitude, speed?, time? }. */
export async function recordLocation(vehicle, body) {
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const speed = body?.speed === undefined || body.speed === '' ? null : Number(body.speed);
  const at = body?.time ? new Date(body.time) : new Date();
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw badRequest('latitude must be between -90 and 90');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw badRequest('longitude must be between -180 and 180');
  if (speed !== null && (!Number.isFinite(speed) || speed < 0 || speed > 300)) throw badRequest('speed must be km/h between 0 and 300');
  if (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + CLOCK_SKEW_MS) throw badRequest('time is invalid or in the future');

  await VehicleLocation.create({ vehicleId: vehicle.id, latitude, longitude, speed, recordedAt: at });
  await VehicleLocation.destroy({ where: { vehicleId: vehicle.id, recordedAt: { [Op.lt]: new Date(Date.now() - KEEP_DAYS * 86400000) } } });
}

const shape = (v, last, routes) => ({
  vehicleId: v.id,
  regNo: v.regNo,
  model: v.model,
  routes: routes.map((r) => r.name),
  hasTracker: Boolean(v.VehicleTracker),
  position: last && { latitude: Number(last.latitude), longitude: Number(last.longitude), speed: last.speed === null ? null : Number(last.speed), recordedAt: last.recordedAt },
  live: Boolean(last) && isLive(last.recordedAt),
});

/** Every active vehicle with its last known position. */
export async function liveFleet() {
  const [vehicles, routes] = await Promise.all([
    Vehicle.findAll({ where: { status: 'active' }, include: [{ model: VehicleTracker, attributes: ['id'], required: false }], order: [['regNo', 'ASC']] }),
    TransportRoute.findAll({ attributes: ['name', 'vehicleId'] }),
  ]);
  const rows = [];
  for (const v of vehicles) {
    const last = await VehicleLocation.findOne({ where: { vehicleId: v.id }, order: [['recordedAt', 'DESC']] });
    rows.push(shape(v, last, routes.filter((r) => r.vehicleId === v.id)));
  }
  return rows;
}

/** The last position of the bus a route uses, or null when it has no vehicle or no GPS yet. */
export async function routeBus(routeName) {
  const route = await TransportRoute.findOne({ where: { name: routeName }, attributes: ['vehicleId'] });
  if (!route?.vehicleId) return null;
  const [vehicle, last] = await Promise.all([Vehicle.findByPk(route.vehicleId), VehicleLocation.findOne({ where: { vehicleId: route.vehicleId }, order: [['recordedAt', 'DESC']] })]);
  return last ? { regNo: vehicle.regNo, ...shape(vehicle, last, []).position, live: isLive(last.recordedAt) } : null;
}

/** Where a bus has been, oldest first. */
export async function trail(vehicleId, hours = 2) {
  const since = new Date(Date.now() - Math.min(Math.max(Number(hours) || 2, 1), 24) * 3600000);
  const rows = await VehicleLocation.findAll({ where: { vehicleId, recordedAt: { [Op.gte]: since } }, order: [['recordedAt', 'ASC']], limit: 1000 });
  return rows.map((r) => ({ latitude: Number(r.latitude), longitude: Number(r.longitude), speed: r.speed === null ? null : Number(r.speed), recordedAt: r.recordedAt }));
}

/** Creates the GPS key for a vehicle, or replaces it (the old unit stops working at once). */
export async function issueTrackerKey(vehicleId) {
  if (!(await Vehicle.findByPk(vehicleId))) throw notFound('Vehicle not found');
  const apiKey = newKey();
  const existing = await VehicleTracker.findOne({ where: { vehicleId } });
  if (existing) await existing.update({ apiKey });
  else await VehicleTracker.create({ vehicleId, apiKey });
  return { apiKey };
}

export async function trackerKeys() {
  const rows = await VehicleTracker.findAll({ attributes: ['vehicleId', 'apiKey'] });
  return Object.fromEntries(rows.map((r) => [r.vehicleId, r.apiKey]));
}
