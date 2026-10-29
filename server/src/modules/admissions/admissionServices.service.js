import {
  Activity,
  ClassSubject,
  FeeGroup,
  FeeGroupItem,
  FeeStructure,
  Hostel,
  HostelRoom,
  Subject,
  TransportRoute,
  TransportStop,
} from '../../models/index.js';
import { fromCents, toCents } from '../../utils/money.js';
import { listFees } from '../finance/fees.service.js';
import { parseChoices } from './admissionChoices.service.js';

/**
 * What the school will bill when this applicant is enrolled, worked out from the grade and the family's choices:
 * the class fee structure, the chosen fee group, and the monthly transport and hostel fees. Nothing is stored.
 * `oneTime` items are billed at enrolment; `monthly` ones are billed by the monthly transport and hostel runs.
 */
export async function feePreview(classId, choices) {
  const c = choices ?? {};
  const items = [];
  if (classId) {
    for (const f of await FeeStructure.findAll({ where: { classId }, order: [['id', 'ASC']] }))
      items.push({
        source: 'Class fees',
        title: f.title,
        amount: Number(f.amount),
        dueDate: f.dueDate,
        monthly: false,
      });
  }
  if (c.feeGroupId) {
    for (const i of await FeeGroupItem.findAll({ where: { groupId: c.feeGroupId }, order: [['id', 'ASC']] }))
      items.push({
        source: 'Fee group',
        title: i.title,
        amount: Number(i.amount),
        dueDate: i.dueDate,
        monthly: false,
      });
  }
  if (c.transportRouteId) {
    const route = await TransportRoute.findByPk(c.transportRouteId);
    if (route && Number(route.monthlyFee) > 0)
      items.push({
        source: 'Transport',
        title: `${route.name} (per month)`,
        amount: Number(route.monthlyFee),
        dueDate: null,
        monthly: true,
      });
  }
  if (c.hostelRoomId) {
    const room = await HostelRoom.findByPk(c.hostelRoomId);
    if (room && Number(room.monthlyFee) > 0)
      items.push({
        source: 'Hostel',
        title: `Room ${room.roomNo} (per month)`,
        amount: Number(room.monthlyFee),
        dueDate: null,
        monthly: true,
      });
  }
  const sum = (list) => fromCents(list.reduce((n, i) => n + toCents(i.amount), 0));
  return {
    items,
    oneTime: sum(items.filter((i) => !i.monthly)),
    monthly: sum(items.filter((i) => i.monthly)),
  };
}

/** The family's choices as names a person can read, plus what they cost; for an enrolled applicant, the student's actual fees too. */
export async function describeServices(admission) {
  const c = parseChoices(admission.choices) ?? {};
  const electives = c.electiveIds?.length
    ? (await ClassSubject.findAll({ where: { id: c.electiveIds }, include: [Subject] })).map(
        (r) => r.Subject.name,
      )
    : [];
  const activities = c.activityIds?.length
    ? (await Activity.findAll({ where: { id: c.activityIds }, attributes: ['title'] })).map((a) => a.title)
    : [];
  let transport = null;
  if (c.transportRouteId) {
    const [route, stop] = await Promise.all([
      TransportRoute.findByPk(c.transportRouteId),
      c.transportStopId ? TransportStop.findByPk(c.transportStopId) : null,
    ]);
    transport = route
      ? { route: route.name, stop: stop?.name ?? null, monthlyFee: Number(route.monthlyFee) }
      : null;
  }
  let hostel = null;
  if (c.hostelRoomId) {
    const room = await HostelRoom.findByPk(c.hostelRoomId, {
      include: [{ model: Hostel, attributes: ['name'] }],
    });
    hostel = room
      ? { hostel: room.Hostel.name, room: room.roomNo, monthlyFee: Number(room.monthlyFee) }
      : { requested: true };
  } else if (c.needsHostel) hostel = { requested: true };
  const group = c.feeGroupId ? await FeeGroup.findByPk(c.feeGroupId, { attributes: ['name'] }) : null;

  const fees = admission.studentId ? await listFees({ studentId: admission.studentId }) : null;
  return {
    electives,
    activities,
    transport,
    hostel,
    feeGroup: group?.name ?? null,
    feePreview: await feePreview(admission.classId, c),
    studentFees: fees && {
      total: fromCents(fees.reduce((n, f) => n + toCents(f.amount), 0)),
      paid: fromCents(fees.reduce((n, f) => n + toCents(f.paidAmount), 0)),
      balance: fromCents(fees.reduce((n, f) => n + toCents(f.balance), 0)),
      items: fees.map((f) => ({
        id: f.id,
        title: f.title,
        amount: f.amount,
        paid: f.paidAmount,
        balance: f.balance,
        dueDate: f.dueDate,
        status: f.status,
      })),
    },
  };
}
