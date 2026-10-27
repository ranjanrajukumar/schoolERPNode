import { Op } from 'sequelize';
import { Hostel, HostelAllocation, HostelAttendance, HostelMeal, HostelRoom, HostelVisitor } from '../../models/index.js';
import { daysFromNow, today } from '../../utils/money.js';

/** What a student and their parents may see of the hostel: where the student lives, the mess menu, the night roll call, and visitors. Read only. */
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

const allocationOf = (studentId) => HostelAllocation.findOne({
  where: { studentId },
  include: [{ model: HostelRoom, required: true, include: [{ model: Hostel, required: true }] }],
});

/** The student's hostel, room and bed with the warden's contact; `{ allocated: false }` for a day scholar. */
export async function hostelOf(studentId) {
  const a = await allocationOf(studentId);
  if (!a) return { allocated: false };
  const room = a.HostelRoom;
  const h = room.Hostel;
  return {
    allocated: true,
    hostel: h.name, hostelType: h.type, wardenName: h.wardenName, wardenPhone: h.wardenPhone, address: h.address,
    room: room.roomNo, bedNo: a.bedNo, mealPlan: a.mealPlan, startDate: a.startDate, monthlyFee: room.monthlyFee, securityDeposit: a.securityDeposit,
    localGuardianName: a.localGuardianName, localGuardianPhone: a.localGuardianPhone, localGuardianRelation: a.localGuardianRelation, consentReceived: a.consentReceived,
  };
}

/** The weekly mess menu of the student's hostel, in day and meal order. */
export async function mealsOf(studentId) {
  const a = await allocationOf(studentId);
  if (!a) return [];
  const rows = await HostelMeal.findAll({ where: { hostelId: a.HostelRoom.hostelId } });
  return rows
    .map((m) => ({ id: m.id, day: m.day, meal: m.meal, items: m.items }))
    .sort((x, y) => DAYS.indexOf(x.day) - DAYS.indexOf(y.day) || MEALS.indexOf(x.meal) - MEALS.indexOf(y.meal));
}

/** The night roll call for the last month (or the dates given), newest first. */
export async function attendanceOf(studentId, from, to) {
  const rows = await HostelAttendance.findAll({
    where: { studentId, date: { [Op.between]: [from || daysFromNow(-30), to || today()] } },
    attributes: ['date', 'status'],
    order: [['date', 'DESC']],
  });
  return rows.map((r) => ({ date: r.date, status: r.status }));
}

/** People who came to see the student, the latest twenty. */
export async function visitorsOf(studentId) {
  const rows = await HostelVisitor.findAll({ where: { studentId }, order: [['checkIn', 'DESC']], limit: 20 });
  return rows.map((v) => ({ id: v.id, visitorName: v.visitorName, relation: v.relation, purpose: v.purpose, checkIn: v.checkIn, checkOut: v.checkOut }));
}
