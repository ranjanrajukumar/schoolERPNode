import {
  AcademicYear, Department, DocumentRequest, Fee, Photo, SchoolClass, Staff, Student, User, sequelize,
} from '../../models/index.js';
import { DOCUMENT_TYPES } from '../../models/documentRequest.model.js';
import { notifyUsers } from '../push/push.service.js';
import { familyUserIds } from '../attendance/studentLeave.service.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';
import { customBody } from './templates.service.js';
import { schoolProfile } from '../settings/settings.service.js';

const PREFIX = { bonafide: 'BON', transfer: 'TC', character: 'CHR', fee: 'FEE' };
export const TYPE_LABEL = {
  bonafide: 'Bonafide certificate',
  transfer: 'Transfer certificate',
  character: 'Character certificate',
  fee: 'Fee certificate',
};


const include = [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] }];

function shape(request) {
  return {
    id: request.id,
    studentId: request.studentId,
    type: request.type,
    typeLabel: TYPE_LABEL[request.type],
    purpose: request.purpose,
    status: request.status,
    certificateNo: request.certificateNo,
    issuedOn: request.issuedOn,
    remarks: request.remarks,
    createdAt: request.createdAt,
    appliedBy: request.requestedByRole ?? null,
    decidedByName: request.decidedByName ?? null,
    decidedOn: request.decidedOn ?? null,
    studentName: request.Student ? `${request.Student.firstName} ${request.Student.lastName}` : null,
    admissionNo: request.Student?.admissionNo ?? null,
  };
}

export async function listRequests({ status, type, studentId } = {}) {
  const rows = await DocumentRequest.findAll({
    where: { ...(status && { status }), ...(type && { type }), ...(studentId && { studentId }) },
    include,
    order: [['id', 'DESC']],
  });
  return rows.map(shape);
}

export async function createRequest({ studentId, type, purpose }, requestedBy, requestedByRole = 'staff') {
  if (!DOCUMENT_TYPES.includes(type)) throw badRequest(`Type must be one of ${DOCUMENT_TYPES.join(', ')}`);
  if (!(await Student.findByPk(studentId))) throw notFound('Student not found');
  // One open request per student and certificate type is enough; a duplicate is almost always a double click.
  if (await DocumentRequest.findOne({ where: { studentId, type, status: 'requested' } })) {
    throw conflict('There is already an open request for this certificate');
  }
  const student = await Student.findByPk(studentId, { attributes: ['firstName', 'lastName'] });
  const request = await DocumentRequest.create({ studentId, type, purpose: purpose || null, requestedBy, requestedByRole });
  // the office is told a request is waiting
  const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] });
  await notifyUsers(admins.map((u) => u.id), { title: 'Certificate requested', body: `${student.firstName} ${student.lastName}: ${TYPE_LABEL[type]}${purpose ? ` (${purpose})` : ''}`, url: '/documents' });
  return request.id;
}

async function currentYear(transaction) {
  return (await AcademicYear.findOne({ where: { isCurrent: true }, transaction }))?.name ?? null;
}

async function feePosition(studentId, transaction) {
  const fees = await Fee.findAll({ where: { studentId }, transaction });
  const billed = fees.reduce((sum, f) => sum + toCents(f.amount), 0);
  const paid = fees.reduce((sum, f) => sum + toCents(f.paidAmount), 0);
  return { billed: fromCents(billed), paid: fromCents(paid), outstanding: fromCents(billed - paid), outstandingCents: billed - paid };
}

/** The facts printed on a certificate, frozen at issue time so a reprint never changes. */
async function buildSnapshot(request, student, input, transaction) {
  const base = {
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNo: student.admissionNo,
    dob: student.dob,
    gender: student.gender,
    guardianName: student.guardianName,
    className: student.SchoolClass ? `${student.SchoolClass.name}-${student.SchoolClass.section}` : null,
    academicYear: await currentYear(transaction),
    purpose: request.purpose,
  };

  const templateBody = await customBody(request.type, transaction);
  const withWording = (facts) => (templateBody ? { ...facts, templateBody } : facts);

  if (request.type === 'character') return withWording({ ...base, conduct: input.conduct?.trim() || 'Good' });

  if (request.type === 'fee') {
    const { billed, paid, outstanding } = await feePosition(student.id, transaction);
    return withWording({ ...base, feesBilled: billed, feesPaid: paid, feesOutstanding: outstanding });
  }

  if (request.type === 'transfer') {
    const { outstandingCents, outstanding } = await feePosition(student.id, transaction);
    if (outstandingCents > 0 && !input.override) {
      throw conflict(`The student still owes ${outstanding}. Clear the dues, or issue with the override option.`);
    }
    return withWording({
      ...base,
      conduct: input.conduct?.trim() || 'Good',
      leavingDate: input.leavingDate || today(),
      leavingReason: input.leavingReason?.trim() || request.purpose || 'Parent’s request',
      duesCleared: outstandingCents <= 0,
    });
  }

  return withWording(base);
}

/**
 * Issues a request: allocates the certificate number, freezes the snapshot and records who decided.
 * A transfer certificate also marks the student inactive, since they have left the school.
 */
export async function issue(id, input, decider) {
  const result = await sequelize.transaction(async (transaction) => {
    const request = await DocumentRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw notFound('Request not found');
    if (request.status !== 'requested') throw conflict(`This request is already ${request.status}`);

    const student = await Student.findByPk(request.studentId, { include: [SchoolClass], transaction });
    const snapshot = await buildSnapshot(request, student, input, transaction);

    await request.update({
      status: 'issued',
      issuedOn: today(),
      remarks: input.remarks || null,
      snapshot: JSON.stringify(snapshot),
      decidedBy: decider.id,
      decidedByName: decider.name,
      decidedOn: new Date(),
      certificateNo: `TMP-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`,
    }, { transaction });
    await request.update({ certificateNo: `${PREFIX[request.type]}-${new Date().getFullYear()}-${String(request.id).padStart(5, '0')}` }, { transaction });

    if (request.type === 'transfer') await student.update({ status: 'inactive' }, { transaction });
    return { certificateNo: request.certificateNo, studentId: request.studentId, type: request.type, requestedBy: request.requestedBy };
  });
  await tellFamily(result, 'Certificate issued', `${TYPE_LABEL[result.type]} (no. ${result.certificateNo}) is ready. You can view and print it from Certificates & Documents.`, decider);
  return { certificateNo: result.certificateNo };
}

/** Tells the student, the parents and whoever asked what became of a request. Never throws. */
async function tellFamily({ studentId, requestedBy }, title, body) {
  const student = await Student.findByPk(studentId, { attributes: ['firstName', 'lastName'] });
  await notifyUsers([...(await familyUserIds(studentId)), requestedBy], { title, body: `${student.firstName} ${student.lastName}: ${body}`, url: '/portal?tab=Documents' });
}

export async function reject(id, { remarks }, decider) {
  const request = await DocumentRequest.findByPk(id);
  if (!request) throw notFound('Request not found');
  if (request.status !== 'requested') throw conflict(`This request is already ${request.status}`);
  if (!String(remarks ?? '').trim()) throw badRequest('Give a reason for rejecting');
  await request.update({ status: 'rejected', remarks: remarks.trim(), decidedBy: decider.id, decidedByName: decider.name, decidedOn: new Date() });
  await tellFamily(request, 'Certificate request not approved', `${TYPE_LABEL[request.type]} was not approved: ${remarks.trim()}`);
}

export async function remove(id) {
  const request = await DocumentRequest.findByPk(id);
  if (!request) throw notFound('Request not found');
  if (request.status === 'issued') throw conflict('An issued certificate is part of the register and cannot be deleted');
  await request.destroy();
}

/** Everything needed to print an issued certificate. */
export async function getPrintable(id, { studentId } = {}) {
  const request = await DocumentRequest.findByPk(id);
  if (!request || (studentId && request.studentId !== Number(studentId))) throw notFound('Certificate not found');
  if (request.status !== 'issued') throw conflict('This certificate has not been issued yet');
  const profile = await schoolProfile();
  return {
    school: profile.name,
    schoolInfo: profile,
    type: request.type,
    title: TYPE_LABEL[request.type],
    certificateNo: request.certificateNo,
    issuedOn: request.issuedOn,
    remarks: request.remarks,
    details: JSON.parse(request.snapshot),
  };
}

/** Student ID cards for a class (or all active students). */
export async function idCards({ classId, studentId } = {}) {
  const students = await Student.findAll({
    where: { status: 'active', ...(classId && { classId }), ...(studentId && { id: studentId }) },
    include: [SchoolClass],
    order: [['classId', 'ASC'], ['firstName', 'ASC']],
  });
  const year = await currentYear();
  const withPhoto = new Set((await Photo.findAll({ where: { entity: 'student', entityId: students.map((s) => s.id) }, attributes: ['entityId'] })).map((p) => p.entityId));
  const profile = await schoolProfile();
  return {
    school: profile.name,
    academicYear: year,
    cards: students.map((s) => ({
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNo: s.admissionNo,
      rollNo: s.rollNo,
      className: s.SchoolClass ? `${s.SchoolClass.name}-${s.SchoolClass.section}` : null,
      dob: s.dob,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      hasPhoto: withPhoto.has(s.id),
    })),
  };
}

/** Staff ID cards for one staff member (staffId) or every active member (optionally one department). */
export async function staffIdCards({ staffId, departmentId } = {}) {
  const rows = await Staff.findAll({
    where: { status: 'active', ...(staffId && { id: staffId }), ...(departmentId && { departmentId }) },
    include: [Department], order: [['firstName', 'ASC']],
  });
  const withPhoto = new Set((await Photo.findAll({ where: { entity: 'staff', entityId: rows.map((s) => s.id) }, attributes: ['entityId'] })).map((p) => p.entityId));
  const profile = await schoolProfile();
  return {
    school: profile.name,
    academicYear: await currentYear(),
    cards: rows.map((s) => ({
      staffId: s.id, name: `${s.firstName} ${s.lastName}`, staffNo: s.staffNo, designation: s.designation, departmentName: s.Department?.name ?? null,
      phone: s.phone, email: s.email, joinDate: s.joinDate, hasPhoto: withPhoto.has(s.id),
    })),
  };
}
