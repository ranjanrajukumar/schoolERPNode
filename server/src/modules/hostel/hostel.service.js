import { Op } from 'sequelize';
import {
  Hostel, HostelAllocation, HostelAttendance, HostelMeal, HostelRoom, HostelVisitor, Student, sequelize,
} from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';
import { billStudents } from '../finance/fees.service.js';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];
const ATTENDANCE = ['present', 'absent', 'leave'];

const studentName = (s) => `${s.firstName} ${s.lastName}`;

/** Beds in use per room id. */
async function occupancyByRoom() {
  const counts = await HostelAllocation.findAll({
    attributes: ['roomId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']], group: ['roomId'], raw: true,
  });
  return new Map(counts.map((c) => [c.roomId, Number(c.n)]));
}

export async function listHostels() {
  const [hostels, occupied] = await Promise.all([
    Hostel.findAll({ include: [{ model: HostelRoom, attributes: ['id', 'capacity'] }], order: [['name', 'ASC']] }),
    occupancyByRoom(),
  ]);
  return hostels.map((h) => {
    const { HostelRooms: rooms, ...rest } = h.toJSON();
    return {
      ...rest,
      roomCount: rooms.length,
      capacity: rooms.reduce((sum, r) => sum + r.capacity, 0),
      occupied: rooms.reduce((sum, r) => sum + (occupied.get(r.id) ?? 0), 0),
    };
  });
}

/** A hostel that still has rooms cannot be deleted; its rooms and boarders would vanish with it. */
export async function deleteHostel(id) {
  const hostel = await Hostel.findByPk(id);
  if (!hostel) throw notFound('Hostel not found');
  if (await HostelRoom.count({ where: { hostelId: id } })) throw conflict("Delete this hostel's rooms first");
  await hostel.destroy();
}

export async function listRooms({ hostelId } = {}) {
  const [rooms, occupied] = await Promise.all([
    HostelRoom.findAll({
      where: hostelId ? { hostelId } : {},
      include: [{ model: Hostel, attributes: ['name'] }],
      order: [['hostelId', 'ASC'], ['roomNo', 'ASC']],
    }),
    occupancyByRoom(),
  ]);
  return rooms.map((r) => ({
    ...r.toJSON(), Hostel: undefined, hostelName: r.Hostel.name, occupied: occupied.get(r.id) ?? 0,
  }));
}

export async function deleteRoom(id) {
  const room = await HostelRoom.findByPk(id);
  if (!room) throw notFound('Room not found');
  if (await HostelAllocation.count({ where: { roomId: id } })) throw conflict('Students are allocated to this room');
  await room.destroy();
}

export async function listAllocations({ hostelId } = {}) {
  const rows = await HostelAllocation.findAll({
    include: [
      { model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] },
      { model: HostelRoom, required: true, where: hostelId ? { hostelId } : {}, include: [{ model: Hostel, attributes: ['name'] }] },
    ],
    order: [['roomId', 'ASC'], ['id', 'ASC']],
  });
  return rows.map((a) => ({
    studentId: a.studentId,
    studentName: studentName(a.Student),
    admissionNo: a.Student.admissionNo,
    roomId: a.roomId,
    roomNo: a.HostelRoom.roomNo,
    hostelId: a.HostelRoom.hostelId,
    hostelName: a.HostelRoom.Hostel.name,
    monthlyFee: a.HostelRoom.monthlyFee,
    startDate: a.startDate,
    bedNo: a.bedNo,
    mealPlan: a.mealPlan,
    localGuardianName: a.localGuardianName,
    localGuardianPhone: a.localGuardianPhone,
    localGuardianRelation: a.localGuardianRelation,
    securityDeposit: a.securityDeposit,
    consentReceived: a.consentReceived,
    remarks: a.remarks,
  }));
}

const MEAL_PLANS = ['veg', 'non_veg', 'jain', 'other'];
const PHONE = /^[0-9+\-\s()]{7,20}$/;
const text = (v, max, label) => {
  const t = v === undefined || v === null ? '' : String(v).trim();
  if (t.length > max) throw badRequest(`${label} must be ${max} characters or fewer`);
  return t || null;
};

/** The boarding details recorded with a bed; everything is optional but checked when given. */
function boardingDetails(body) {
  const phone = text(body.localGuardianPhone, 20, 'Local guardian phone');
  if (phone && !PHONE.test(phone)) throw badRequest('Local guardian phone is invalid');
  const mealPlan = text(body.mealPlan, 20, 'Meal plan');
  if (mealPlan && !MEAL_PLANS.includes(mealPlan)) throw badRequest('Meal plan is invalid');
  const deposit = body.securityDeposit === undefined || body.securityDeposit === '' || body.securityDeposit === null ? null : Number(body.securityDeposit);
  if (deposit !== null && !(deposit >= 0)) throw badRequest('Security deposit must be zero or more');
  return {
    bedNo: text(body.bedNo, 20, 'Bed number'), mealPlan, localGuardianName: text(body.localGuardianName, 100, 'Local guardian name'), localGuardianPhone: phone,
    localGuardianRelation: text(body.localGuardianRelation, 40, 'Local guardian relation'), securityDeposit: deposit,
    consentReceived: body.consentReceived === true || body.consentReceived === 'true', remarks: text(body.remarks, 255, 'Remarks'),
  };
}

/**
 * Puts a student in a room (or moves them). The room's capacity is enforced under a row lock,
 * and a boys'/girls' hostel only takes students of the matching gender.
 */
export async function allocateStudent(body) {
  const { studentId, roomId, startDate } = body;
  if (!studentId || !roomId) throw badRequest('Student and room are required');
  const details = boardingDetails(body);

  return sequelize.transaction(async (transaction) => {
    const student = await Student.findByPk(studentId, { transaction });
    if (!student) throw notFound('Student not found');
    if (student.status !== 'active') throw conflict('Only active students can live in the hostel');

    const room = await HostelRoom.findByPk(roomId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!room) throw notFound('Room not found');
    const hostel = await Hostel.findByPk(room.hostelId, { transaction });
    const required = { boys: 'male', girls: 'female' }[hostel.type];
    if (required && student.gender !== required) throw conflict(`${hostel.name} only takes ${required} students`);

    const taken = await HostelAllocation.count({
      where: { roomId, studentId: { [Op.ne]: student.id } }, transaction,
    });
    if (taken >= room.capacity) throw conflict(`Room ${room.roomNo} is full (${room.capacity} beds)`);

    if (details.bedNo && await HostelAllocation.findOne({ where: { roomId, bedNo: details.bedNo, studentId: { [Op.ne]: student.id } }, transaction })) {
      throw conflict(`Bed ${details.bedNo} in room ${room.roomNo} is already taken`);
    }
    await HostelAllocation.upsert({ studentId, roomId, startDate: startDate || null, ...details }, { transaction });
  });
}

export async function vacateStudent(studentId) {
  if (!(await HostelAllocation.destroy({ where: { studentId } }))) throw notFound('Student is not in the hostel');
}

/** Bills each boarder their room's monthly fee through the normal fee flow; never double-bills. */
export async function generateHostelFees({ month, dueDate }) {
  if (!MONTH.test(month ?? '')) throw badRequest('month must be YYYY-MM');
  const title = `Hostel ${month}`;

  const rooms = await HostelRoom.findAll({ where: { monthlyFee: { [Op.gt]: 0 } } });
  let created = 0;
  let skipped = 0;
  await sequelize.transaction(async (transaction) => {
    for (const room of rooms) {
      const boarders = await HostelAllocation.findAll({
        where: { roomId: room.id },
        include: [{ model: Student, attributes: [], where: { status: 'active' } }],
        transaction,
      });
      if (!boarders.length) continue;
      const result = await billStudents(boarders.map((b) => b.studentId), { title, amount: room.monthlyFee, dueDate }, transaction);
      created += result.created;
      skipped += result.skipped;
    }
  });
  return { title, created, skipped };
}

/** Everyone living in a hostel with their mark for one date (null = not marked yet). */
export async function getRoster(hostelId, date) {
  const boarders = await HostelAllocation.findAll({
    include: [
      { model: Student, attributes: ['firstName', 'lastName', 'admissionNo'], where: { status: 'active' } },
      { model: HostelRoom, attributes: ['roomNo'], where: { hostelId } },
    ],
  });
  const marks = await HostelAttendance.findAll({ where: { date, studentId: boarders.map((b) => b.studentId) } });
  const byStudent = new Map(marks.map((m) => [m.studentId, m.status]));
  return boarders
    .sort((a, b) => a.HostelRoom.roomNo.localeCompare(b.HostelRoom.roomNo, undefined, { numeric: true }))
    .map((b) => ({
      studentId: b.studentId,
      name: studentName(b.Student),
      admissionNo: b.Student.admissionNo,
      roomNo: b.HostelRoom.roomNo,
      status: byStudent.get(b.studentId) ?? null,
    }));
}

export async function saveAttendance({ date, records = [] }) {
  if (!date) throw badRequest('date is required');
  if (records.some((r) => !ATTENDANCE.includes(r.status))) throw badRequest('Status must be present, absent or leave');
  await sequelize.transaction(async (transaction) => {
    for (const { studentId, status } of records) {
      await HostelAttendance.upsert({ studentId, date, status }, { transaction });
    }
  });
}

export async function listMeals(hostelId) {
  const rows = await HostelMeal.findAll({ where: hostelId ? { hostelId } : {}, order: [['hostelId', 'ASC']] });
  return rows.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal));
}

/** One menu entry per hostel, day and meal; saving again replaces it. */
export async function saveMeal({ hostelId, day, meal, items }) {
  if (!hostelId || !DAYS.includes(day) || !MEALS.includes(meal) || !String(items ?? '').trim()) {
    throw badRequest('Hostel, day, meal and items are required');
  }
  if (!(await Hostel.findByPk(hostelId))) throw notFound('Hostel not found');
  await HostelMeal.upsert({ hostelId, day, meal, items: String(items).trim() });
}

export async function deleteMeal(id) {
  if (!(await HostelMeal.destroy({ where: { id } }))) throw notFound('Menu entry not found');
}

export async function listVisitors({ open } = {}) {
  const rows = await HostelVisitor.findAll({
    where: open ? { checkOut: null } : {},
    include: [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] }],
    order: [['checkIn', 'DESC']],
    limit: 200,
  });
  return rows.map((v) => ({
    ...v.toJSON(), Student: undefined, studentName: studentName(v.Student), admissionNo: v.Student.admissionNo,
  }));
}

export async function checkInVisitor({ studentId, visitorName, relation, phone, purpose }) {
  if (!studentId || !String(visitorName ?? '').trim()) throw badRequest('Student and visitor name are required');
  if (!(await HostelAllocation.findOne({ where: { studentId } }))) throw conflict('That student does not live in the hostel');
  await HostelVisitor.create({
    studentId, visitorName: String(visitorName).trim(), relation: relation || null, phone: phone || null,
    purpose: purpose || null, checkIn: new Date(),
  });
}

export async function checkOutVisitor(id) {
  const visitor = await HostelVisitor.findByPk(id);
  if (!visitor) throw notFound('Visit not found');
  if (visitor.checkOut) throw conflict('Visitor already checked out');
  await visitor.update({ checkOut: new Date() });
}

/** Occupancy per hostel, monthly rent roll, and today's attendance and visitors. */
export async function summary() {
  const [hostels, rooms, boarders, visitorsInside, marks] = await Promise.all([
    listHostels(),
    listRooms(),
    listAllocations(),
    HostelVisitor.count({ where: { checkOut: null } }),
    HostelAttendance.findAll({ where: { date: today() }, attributes: ['status'], raw: true }),
  ]);
  const count = (status) => marks.filter((m) => m.status === status).length;

  return {
    boarders: boarders.length,
    hostels,
    fullRooms: rooms.filter((r) => r.occupied >= r.capacity).length,
    emptyRooms: rooms.filter((r) => r.occupied === 0).length,
    monthlyIncome: boarders.reduce((sum, b) => sum + Number(b.monthlyFee), 0).toFixed(2),
    visitorsInside,
    today: { present: count('present'), absent: count('absent'), leave: count('leave') },
  };
}
