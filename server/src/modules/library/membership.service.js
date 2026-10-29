import { BookIssue, LibraryMembership, Student } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';
import { nextNumber } from '../../utils/numbering.js';
import { getSetting } from '../settings/settings.service.js';

const student = [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo', 'status'] }];

async function nextCardNo() {
  return nextNumber({ model: LibraryMembership, field: 'cardNo', formula: await getSetting('numbering.library') });
}

/** Library cards with what each holder has out now and has been fined, expired cards flagged. */
export async function listMemberships() {
  const [cards, issues] = await Promise.all([
    LibraryMembership.findAll({ include: student, order: [['cardNo', 'ASC']] }),
    BookIssue.findAll({ attributes: ['studentId', 'dueOn', 'returnedOn', 'fine'] }),
  ]);
  return cards.map((c) => {
    const mine = issues.filter((i) => i.studentId === c.studentId);
    const out = mine.filter((i) => !i.returnedOn);
    return {
      id: c.id, studentId: c.studentId, cardNo: c.cardNo, studentName: `${c.Student.firstName} ${c.Student.lastName}`, admissionNo: c.Student.admissionNo,
      studentStatus: c.Student.status, memberSince: c.memberSince, validUntil: c.validUntil, maxBooks: c.maxBooks, status: c.status, notes: c.notes,
      expired: Boolean(c.validUntil && c.validUntil < today()), onLoan: out.length, overdue: out.filter((i) => i.dueOn < today()).length,
      borrowed: mine.length, fines: fromCents(mine.reduce((sum, i) => sum + toCents(i.fine), 0)),
    };
  });
}

function checkFields({ memberSince, validUntil, maxBooks, status }) {
  if (memberSince && Number.isNaN(new Date(memberSince).getTime())) throw badRequest('Member since is not a valid date');
  if (validUntil && Number.isNaN(new Date(validUntil).getTime())) throw badRequest('Valid until is not a valid date');
  if (validUntil && memberSince && validUntil < memberSince) throw badRequest('The card cannot expire before it starts');
  if (maxBooks !== undefined && maxBooks !== '' && !(Number.isInteger(Number(maxBooks)) && Number(maxBooks) >= 1 && Number(maxBooks) <= 50)) throw badRequest('Book limit must be a whole number from 1 to 50');
  if (status && !['active', 'suspended'].includes(status)) throw badRequest('Status is invalid');
}

export async function createMembership(body) {
  checkFields(body);
  const holder = await Student.findByPk(body.studentId);
  if (!holder) throw notFound('Student not found');
  if (holder.status !== 'active') throw conflict('Only active students can have a library card');
  if (await LibraryMembership.findOne({ where: { studentId: holder.id } })) throw conflict('This student already has a library card');
  const limit = body.maxBooks === undefined || body.maxBooks === '' ? await getSetting('library.defaultMaxBooks') : Number(body.maxBooks);
  return (await LibraryMembership.create({
    studentId: holder.id, cardNo: await nextCardNo(), memberSince: body.memberSince || today(), validUntil: body.validUntil || null,
    maxBooks: limit, status: body.status || 'active', notes: body.notes ? String(body.notes).slice(0, 255) : null,
  })).id;
}

export async function updateMembership(id, body) {
  checkFields(body);
  const card = await LibraryMembership.findByPk(id);
  if (!card) throw notFound('Library card not found');
  await card.update({
    ...(body.memberSince && { memberSince: body.memberSince }),
    ...(body.validUntil !== undefined && { validUntil: body.validUntil || null }),
    ...(body.maxBooks !== undefined && body.maxBooks !== '' && { maxBooks: Number(body.maxBooks) }),
    ...(body.status && { status: body.status }),
    ...(body.notes !== undefined && { notes: body.notes ? String(body.notes).slice(0, 255) : null }),
  });
}

export async function deleteMembership(id) {
  const card = await LibraryMembership.findByPk(id);
  if (!card) throw notFound('Library card not found');
  if (await BookIssue.count({ where: { studentId: card.studentId, returnedOn: null } })) throw conflict('This student still has books out; get them back first');
  await card.destroy();
}

/**
 * Called inside the issue transaction. A student with a card must hold an active, unexpired one and be under its limit;
 * one without a card is allowed unless Settings → Library requires membership.
 */
export async function checkMembership(studentId, transaction) {
  const card = await LibraryMembership.findOne({ where: { studentId }, transaction });
  if (!card) {
    if (await getSetting('library.requireMembership')) throw conflict('This student needs a library card before borrowing');
    return;
  }
  if (card.status !== 'active') throw conflict(`Library card ${card.cardNo} is suspended`);
  if (card.validUntil && card.validUntil < today()) throw conflict(`Library card ${card.cardNo} expired on ${card.validUntil}`);
  const out = await BookIssue.count({ where: { studentId, returnedOn: null }, transaction });
  if (out >= card.maxBooks) throw conflict(`Library card ${card.cardNo} allows ${card.maxBooks} book(s) at a time and ${out} are already out`);
}
