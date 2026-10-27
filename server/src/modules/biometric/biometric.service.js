import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { Attendance, BiometricDevice, BiometricPunch, Student, sequelize } from '../../models/index.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { localDate } from '../../utils/money.js';

const newKey = () => crypto.randomBytes(24).toString('hex');
const localTime = (d) => d.toTimeString().slice(0, 5);
const MAX_BATCH = 500;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const ONLINE_MINUTES = 10;
const MIN_STAY_MINUTES = 5; // a second punch this soon after the first is a double tap, not an exit
const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** The active device that owns this key, or null. */
export async function deviceForKey(key) {
  if (!key || key.length !== 48) return null;
  const device = await BiometricDevice.findOne({ where: { apiKey: key, status: 'active' } });
  return device && crypto.timingSafeEqual(Buffer.from(device.apiKey), Buffer.from(key)) ? device : null;
}

/**
 * Stores punches sent by a device and marks the matched students present for the day of the punch.
 * The first punch of the day is the arrival time. A student already marked absent is corrected to present,
 * because a punch is physical evidence; any other existing mark is left alone.
 */
export async function recordPunches(device, input) {
  const list = Array.isArray(input) ? input : [input];
  if (!list.length || list.length > MAX_BATCH) throw badRequest(`Send between 1 and ${MAX_BATCH} punches`);

  const now = Date.now();
  const punches = list.map((p) => {
    const enrollId = String(p?.enrollId ?? '').trim();
    const at = p?.time ? new Date(p.time) : new Date(now);
    if (!enrollId || enrollId.length > 40) throw badRequest('Every punch needs an enrollId');
    if (Number.isNaN(at.getTime())) throw badRequest(`Invalid time for ${enrollId}`);
    if (at.getTime() > now + CLOCK_SKEW_MS) throw badRequest(`Time for ${enrollId} is in the future`);
    return { enrollId, at };
  });

  const students = await Student.findAll({ where: { admissionNo: [...new Set(punches.map((p) => p.enrollId))], status: 'active' }, attributes: ['id', 'admissionNo'] });
  const byAdmission = new Map(students.map((s) => [s.admissionNo, s.id]));

  let stored = 0;
  let marked = 0;
  await sequelize.transaction(async (transaction) => {
    for (const { enrollId, at } of punches.sort((a, b) => a.at - b.at)) {
      const studentId = byAdmission.get(enrollId) ?? null;
      const [, created] = await BiometricPunch.findOrCreate({ where: { deviceId: device.id, enrollId, punchedAt: at }, defaults: { studentId }, transaction });
      if (!created) continue; // a device that resends a punch changes nothing
      stored += 1;
      if (!studentId) continue;
      const date = localDate(at);
      const existing = await Attendance.findOne({ where: { studentId, date }, transaction });
      const mark = { status: 'present', arrivalTime: localTime(at), note: `Biometric · ${device.name}`, savedAt: new Date() };
      if (!existing) {
        await Attendance.create({ studentId, date, ...mark }, { transaction });
        marked += 1;
      } else if (existing.status === 'absent') {
        await existing.update({ ...mark, outTime: null }, { transaction });
        marked += 1;
      } else if (existing.arrivalTime && minutes(localTime(at)) - minutes(existing.arrivalTime) >= MIN_STAY_MINUTES && localTime(at) > (existing.outTime ?? '')) {
        await existing.update({ outTime: localTime(at) }, { transaction }); // a later punch the same day: going home
      }
    }
    await device.update({ lastSeenAt: new Date() }, { transaction });
  });
  return { received: list.length, stored, marked, unmatched: punches.filter((p) => !byAdmission.has(p.enrollId)).length };
}

export async function listDevices({ withKeys = false } = {}) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const devices = await BiometricDevice.findAll({ order: [['name', 'ASC']] });
  const counts = await BiometricPunch.findAll({ where: { punchedAt: { [Op.gte]: since } }, attributes: ['deviceId', [sequelize.fn('COUNT', '*'), 'n']], group: ['deviceId'], raw: true });
  const today = new Map(counts.map((c) => [c.deviceId, Number(c.n)]));
  return devices.map((d) => ({
    id: d.id,
    name: d.name,
    serialNo: d.serialNo,
    location: d.location,
    status: d.status,
    lastSeenAt: d.lastSeenAt,
    online: Boolean(d.lastSeenAt) && Date.now() - new Date(d.lastSeenAt).getTime() < ONLINE_MINUTES * 60 * 1000,
    punchesToday: today.get(d.id) ?? 0,
    ...(withKeys && { apiKey: d.apiKey }),
  }));
}

export async function createDevice({ name, serialNo, location }) {
  if (!name?.trim() || !serialNo?.trim()) throw badRequest('Name and serial number are required');
  const row = await BiometricDevice.create({ name: name.trim(), serialNo: serialNo.trim(), location: location?.trim() || null, apiKey: newKey() });
  return { id: row.id, apiKey: row.apiKey };
}

export async function updateDevice(id, { name, location, status }) {
  const device = await BiometricDevice.findByPk(id);
  if (!device) throw notFound('Device not found');
  if (status && !['active', 'inactive'].includes(status)) throw badRequest('Status must be active or inactive');
  await device.update({ ...(name?.trim() && { name: name.trim() }), ...(location !== undefined && { location: location?.trim() || null }), ...(status && { status }) });
}

export async function rotateKey(id) {
  const device = await BiometricDevice.findByPk(id);
  if (!device) throw notFound('Device not found');
  await device.update({ apiKey: newKey() });
  return { apiKey: device.apiKey };
}

export async function deleteDevice(id) {
  await BiometricDevice.destroy({ where: { id } });
}

/** Punches of one day, newest first, with the student they matched. */
export async function listPunches(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) throw badRequest('date is required');
  const from = new Date(`${date}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  const rows = await BiometricPunch.findAll({
    where: { punchedAt: { [Op.gte]: from, [Op.lt]: to } },
    include: [{ model: BiometricDevice, attributes: ['name'] }, { model: Student, attributes: ['firstName', 'lastName'], required: false }],
    order: [['punchedAt', 'DESC']],
    limit: 1000,
  });
  return rows.map((p) => ({
    id: p.id,
    enrollId: p.enrollId,
    punchedAt: p.punchedAt,
    device: p.BiometricDevice?.name ?? null,
    studentId: p.studentId,
    name: p.Student ? `${p.Student.firstName} ${p.Student.lastName}` : null,
  }));
}
