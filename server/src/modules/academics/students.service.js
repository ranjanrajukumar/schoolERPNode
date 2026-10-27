import { Op } from 'sequelize';
import { photoIds } from '../../utils/photoFlags.js';
import { Admission, DocumentRequest, FeeStructure, Staff, Student, SchoolClass, StudentAccount, User, sequelize } from '../../models/index.js';
import { billStudents } from '../finance/fees.service.js';
import { badRequest, conflict } from '../../utils/httpError.js';
import { DETAIL_KEYS } from './studentFields.js';
import { STUDENT_EXTRA_KEYS, cleanEnquiryExtras } from '../admissions/enquiryFields.js';
import { loadExtras, saveExtras } from '../admissions/recordExtras.js';
import { removeStoredFiles, storedNames } from '../files/files.service.js';
import { pruneElectives } from './subjectMap.service.js';

export const STUDENT_FIELDS = [
  'admissionNo', 'firstName', 'lastName', 'dob', 'gender',
  'guardianName', 'guardianPhone', 'classId', 'status', 'registrationStatus', ...DETAIL_KEYS,
];

const MAX_PAGE_SIZE = 100;

const include = [{ model: SchoolClass, attributes: ['name', 'section'], include: [{ model: Staff, as: 'ClassTeacher', attributes: ['firstName', 'lastName', 'phone'], required: false }] }];

/** Flattens the joined class onto the student as a "Class-Section" label. */
function shape(student) {
  const { SchoolClass: cls, ...rest } = student.toJSON();
  const day = (v) => (v instanceof Date ? v.toISOString() : String(v ?? '')).slice(0, 10);
  const registrationDate = day(rest.admissionDate) || day(rest.createdAt);
  return {
    ...rest, className: cls ? `${cls.name}-${cls.section}` : null,
    classTeacherName: cls?.ClassTeacher ? `${cls.ClassTeacher.firstName} ${cls.ClassTeacher.lastName}` : null, classTeacherPhone: cls?.ClassTeacher?.phone ?? null,
    studentId: `STU-${registrationDate.slice(0, 4) || new Date().getFullYear()}-${String(rest.id).padStart(4, '0')}`, registrationId: `REG-${registrationDate.slice(0, 4) || new Date().getFullYear()}-${String(rest.id).padStart(4, '0')}`, registrationDate,
  };
}

const SOURCES = ['online', 'office', 'phone', 'referral', 'social', 'other'];

/** The personal, parent, contact, address, qualification and official details the registration form sends, checked and cleaned. */
function extrasOf(body) {
  const { data, error } = cleanEnquiryExtras(body);
  if (error) throw badRequest(error);
  const out = Object.fromEntries(Object.entries(data).filter(([k]) => STUDENT_EXTRA_KEYS.includes(k)));
  if (body.source !== undefined) {
    const source = String(body.source ?? '').trim();
    if (source && !SOURCES.includes(source)) throw badRequest('Source is invalid');
    out.source = source || null;
  }
  if (body.referredBy !== undefined) {
    const referredBy = String(body.referredBy ?? '').trim();
    if (referredBy.length > 100) throw badRequest('Referenced by must be 100 characters or fewer');
    out.referredBy = referredBy || null;
  }
  return out;
}

/** Blank form values become NULL so optional columns are cleared rather than stored as ''. */
function pick(body) {
  const data = Object.fromEntries(
    STUDENT_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]),
  );
  if (!data.registrationStatus) delete data.registrationStatus; // never blank: the column has a default
  return data;
}

/**
 * Lists students, newest first. Filters: q (name/admission no/guardian phone), classId, status.
 * Without `page` the full list is returned as an array (used by dropdowns in other modules);
 * with `page` the result is { rows, total, page, pageSize }.
 */
export async function listStudents({ q, classId, status, registrationStatus, grade, section, page, pageSize } = {}) {
  const where = {};
  if (grade) where['$SchoolClass.name$'] = grade;
  if (section) where['$SchoolClass.section$'] = section;
  if (registrationStatus) where.registrationStatus = registrationStatus;
  if (classId) where.classId = classId;
  if (status) where.status = status;
  if (q) {
    const like = `%${q}%`;
    where[Op.or] = [
      { admissionNo: { [Op.like]: like } },
      { firstName: { [Op.like]: like } },
      { lastName: { [Op.like]: like } },
      { guardianPhone: { [Op.like]: like } },
      { fatherPhone: { [Op.like]: like } },
      { motherPhone: { [Op.like]: like } },
      { rollNo: { [Op.like]: like } },
      { guardianName: { [Op.like]: like } }, { fatherName: { [Op.like]: like } }, { motherName: { [Op.like]: like } },
      ...(/^stu-?\d{4}-?(\d+)$/i.test(q.trim()) ? [{ id: Number(/(\d+)$/.exec(q.trim())[1]) }] : []),
      ...(/^reg-?\d{4}-?(\d+)$/i.test(q.trim()) ? [{ id: Number(/(\d+)$/.exec(q.trim())[1]) }] : []),
    ];
  }

  if (!page) {
    const all = await Student.findAll({ where, include, order: [['id', 'DESC']] });
    const withPhoto = await photoIds('student', all.map((s) => s.id));
    return all.map((s) => ({ ...shape(s), hasPhoto: withPhoto.has(s.id) }));
  }

  const size = Math.min(Math.max(Number(pageSize) || 10, 1), MAX_PAGE_SIZE);
  const current = Math.max(Number(page) || 1, 1);
  const { rows, count } = await Student.findAndCountAll({
    where, include, order: [['id', 'DESC']], limit: size, offset: (current - 1) * size,
  });
  const withPhoto = await photoIds('student', rows.map((s) => s.id));
  return { rows: rows.map((s) => ({ ...shape(s), hasPhoto: withPhoto.has(s.id) })), total: count, page: current, pageSize: size };
}

export async function getStudent(id) {
  const student = await Student.findByPk(id, { include });
  return student ? { ...shape(student), ...(await loadExtras('student', student.id)) } : null;
}

/** Next admission number for the year, e.g. ADM-2026-0007, from the latest student id. */
export async function nextAdmissionNo(transaction) {
  let n = ((await Student.max('id', { transaction })) || 0) + 1;
  // Skip numbers already taken (typed by hand, or left by deleted students) so the generated one is always free.
  for (;;) {
    const candidate = `ADM-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
    if (!(await Student.findOne({ where: { admissionNo: candidate }, attributes: ['id'], transaction }))) return candidate;
    n += 1;
  }
}

/** A student with the same name and date of birth is almost always a double entry. */
export async function findDuplicate({ firstName, lastName, dob }) {
  if (!dob || !firstName || !lastName) return null;
  return Student.findOne({ where: { firstName: String(firstName).trim(), lastName: String(lastName).trim(), dob }, attributes: ['id', 'admissionNo'] });
}

/**
 * Registers a student. With `billFees` the class's fee structure is billed in the same transaction, so a student is
 * never left registered but half billed. Returns { id, admissionNo, feesBilled }.
 */
export async function createStudent(body, { allowDuplicate = false, billFees = false } = {}) {
  if (!allowDuplicate) {
    const twin = await findDuplicate(body);
    if (twin) throw conflict(`A student with the same name and date of birth already exists (${twin.admissionNo}). Save again to register them anyway.`);
  }
  return sequelize.transaction(async (transaction) => {
    const extras = extrasOf(body);
    const data = pick(body);
    if (!data.admissionNo) data.admissionNo = await nextAdmissionNo(transaction);
    const student = await Student.create(data, { transaction });
    await saveExtras('student', student.id, extras, transaction);
    let feesBilled = 0;
    if (billFees && student.classId) {
      const items = await FeeStructure.findAll({ where: { classId: student.classId }, transaction });
      for (const item of items) await billStudents([student.id], item, transaction);
      feesBilled = items.length;
    }
    return { id: student.id, admissionNo: student.admissionNo, feesBilled };
  });
}

/** Returns false when the student does not exist. */
export async function updateStudent(id, body) {
  const student = await Student.findByPk(id);
  if (!student) return false;
  const before = student.classId;
  const extras = extrasOf(body);
  await student.update(pick(body));
  await saveExtras('student', student.id, extras);
  if (student.classId !== before) await pruneElectives([student.id]);
  return true;
}

export async function deleteStudent(id) {
  if (await DocumentRequest.count({ where: { studentId: id } })) throw conflict('This student has certificate requests on record. Mark the student inactive instead of deleting.');
  const stored = await storedNames(id);
  const login = await StudentAccount.findOne({ where: { studentId: id } });
  const deleted = (await Student.destroy({ where: { id } })) > 0;
  if (deleted) {
    await removeStoredFiles(stored);
    // an applicant who was enrolled as this student goes back to holding an offer, so nothing points at a student that is gone
    await Admission.update({ status: 'approved', studentId: null, enrolledOn: null }, { where: { studentId: id, status: 'enrolled' } });
  }
  if (login) await User.destroy({ where: { id: login.userId } });
  return deleted;
}

/** Tiles for the Registrations page: how many registrations are complete and how many still need review. */
export async function registrationSummary() {
  const [total, complete] = await Promise.all([Student.count(), Student.count({ where: { registrationStatus: 'complete' } })]);
  return { total, complete, pending: total - complete };
}

/** Tiles and tabs for the Students page. Pending enrollment = applicants who have an offer but are not yet students. */
export async function studentSummary() {
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const [total, active, addedThisMonth, pendingEnrollment, classes] = await Promise.all([
    Student.count(), Student.count({ where: { status: 'active' } }), Student.count({ where: { createdAt: { [Op.gte]: month } } }),
    Admission.count({ where: { status: 'approved' } }), SchoolClass.count(),
  ]);
  return { total, active, inactive: total - active, addedThisMonth, pendingEnrollment, classes };
}
