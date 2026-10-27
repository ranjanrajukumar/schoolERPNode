import { Activity, ClassSubject, FeeGroup, FeeGroupItem, Hostel, HostelRoom, Subject, TransportRoute, TransportStop } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';
import { register as registerForActivity } from '../activities/activities.service.js';
import { billStudents } from '../finance/fees.service.js';
import { setStudentElectives } from '../academics/subjectMap.service.js';
import { assignStudent } from '../transport/transport.service.js';
import { allocateStudent } from '../hostel/hostel.service.js';

/**
 * What a family asks for at registration besides the class itself: electives, activities, transport, a hostel bed and a fee
 * group. They are kept on the admissions record and become real the moment the applicant is enrolled.
 */
const ids = (list) => [...new Set((Array.isArray(list) ? list : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];

/** Checks the choices against the class applied for and returns the clean copy that is stored. */
export async function cleanChoices(input, classId) {
  const c = input ?? {};
  const out = { electiveIds: ids(c.electiveIds), activityIds: ids(c.activityIds), transportRouteId: null, transportStopId: null, needsHostel: c.needsHostel === true, hostelRoomId: null, feeGroupId: null };

  if (out.electiveIds.length) {
    if (!classId) throw badRequest('Choose the grade applied for before choosing electives');
    const rows = await ClassSubject.findAll({ where: { id: out.electiveIds }, include: [Subject] });
    if (rows.length !== out.electiveIds.length) throw badRequest('One of the chosen electives does not exist');
    const seen = new Map();
    for (const r of rows) {
      if (r.classId !== Number(classId)) throw badRequest(`${r.Subject.name} is not taught in the grade applied for`);
      if (!r.isElective) throw badRequest(`${r.Subject.name} is a core subject: every student takes it`);
      const group = r.electiveGroup ?? `subject:${r.id}`;
      if (seen.has(group)) throw badRequest(`Choose only one of ${seen.get(group)} and ${r.Subject.name}: they are in the same elective group`);
      seen.set(group, r.Subject.name);
    }
  }
  if (out.activityIds.length) {
    const rows = await Activity.findAll({ where: { id: out.activityIds } });
    if (rows.length !== out.activityIds.length) throw badRequest('One of the chosen activities does not exist');
    for (const a of rows) {
      if (!['planned', 'open'].includes(a.status)) throw badRequest(`"${a.title}" is not taking registrations (${a.status})`);
      if (a.classId && classId && a.classId !== Number(classId)) throw badRequest(`"${a.title}" is only for another class`);
    }
  }
  const routeId = Number(c.transportRouteId) || null;
  const stopId = Number(c.transportStopId) || null;
  if (routeId || stopId) {
    if (!routeId || !stopId) throw badRequest('Choose both the transport route and the stop');
    if (!(await TransportRoute.findByPk(routeId))) throw badRequest('That transport route does not exist');
    const stop = await TransportStop.findByPk(stopId);
    if (!stop || stop.routeId !== routeId) throw badRequest('That stop is not on the chosen route');
    out.transportRouteId = routeId; out.transportStopId = stopId;
  }
  if (Number(c.hostelRoomId)) {
    const room = await HostelRoom.findByPk(Number(c.hostelRoomId));
    if (!room) throw badRequest('That hostel room does not exist');
    out.hostelRoomId = room.id; out.needsHostel = true; // choosing a room means the family wants a bed
  }
  if (c.feeGroupId) {
    if (!(await FeeGroup.findByPk(Number(c.feeGroupId)))) throw badRequest('That fee group does not exist');
    out.feeGroupId = Number(c.feeGroupId);
  }
  return out;
}

export const parseChoices = (stored) => {
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
};

/**
 * Turns the choices into records for the new student: electives, activity registrations, the transport route, and the fee
 * group's items billed to the student. A hostel bed needs a room, so it is left as a task. Each item is tried on its own, so
 * one that cannot be done (a full bus, a closed activity) never undoes the enrolment: it is reported back instead.
 * Returns what the school still has to do or look at.
 */
export async function applyChoices(admission, student) {
  const c = parseChoices(admission.choices);
  const todo = [];
  if (!c) return todo;
  const attempt = async (what, fn) => { try { await fn(); } catch (err) { todo.push(`${what}: ${err.message}`); } };

  if (c.electiveIds?.length) await attempt('Electives', () => setStudentElectives(student.id, c.electiveIds));
  for (const activityId of c.activityIds ?? []) {
    const activity = await Activity.findByPk(activityId, { attributes: ['title'] });
    await attempt(`Activity ${activity?.title ?? activityId}`, () => registerForActivity(activityId, { studentIds: [student.id] }));
  }
  if (c.transportRouteId) await attempt('Transport', () => assignStudent({ studentId: student.id, routeId: c.transportRouteId, stopId: c.transportStopId, startDate: today() }));
  if (c.feeGroupId) {
    await attempt('Fee group', async () => {
      const items = await FeeGroupItem.findAll({ where: { groupId: c.feeGroupId } });
      for (const item of items) await billStudents([student.id], item);
    });
  }
  if (c.hostelRoomId) await attempt('Hostel', () => allocateStudent({ studentId: student.id, roomId: c.hostelRoomId, startDate: today() }));
  else if (c.needsHostel) todo.push('Hostel: the family asked for a hostel bed. Allocate a room under Hostel → Room allocation.');
  return todo;
}
