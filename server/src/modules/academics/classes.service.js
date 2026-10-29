import { fn, col } from 'sequelize';
import {
  Activity,
  ClassSubject,
  FeeStructure,
  HostelAllocation,
  SchoolClass,
  Staff,
  Student,
  StudentTransport,
  Subject,
  TimetableSlot,
  TransportRoute,
} from '../../models/index.js';
import { Op } from 'sequelize';
import { classSubjectMap } from './subjectMap.service.js';
import { badRequest } from '../../utils/httpError.js';

const CLASS_FIELDS = ['name', 'section', 'room', 'branchId', 'classTeacherId'];
const NUMERIC = ['branchId', 'classTeacherId'];

const pick = (body) =>
  Object.fromEntries(
    CLASS_FIELDS.filter((f) => body[f] !== undefined).map((f) => [
      f,
      NUMERIC.includes(f)
        ? body[f] === '' || body[f] === null
          ? null
          : Number(body[f])
        : f === 'room' && !String(body[f] ?? '').trim()
          ? null
          : String(body[f]).trim(),
    ]),
  );

/** Classes ordered by name then section, each with its number of students. */
export async function listClasses() {
  const rows = await SchoolClass.findAll({
    attributes: { include: [[fn('COUNT', col('Students.id')), 'studentCount']] },
    include: [{ model: Student, attributes: [], required: false }],
    group: ['SchoolClass.id'],
    order: [
      ['name', 'ASC'],
      ['section', 'ASC'],
    ],
    raw: true,
  });
  const teachers = new Map(
    (await Staff.findAll({ attributes: ['id', 'firstName', 'lastName'] })).map((s) => [
      s.id,
      `${s.firstName} ${s.lastName}`,
    ]),
  );
  return rows.map((r) => ({
    ...r,
    studentCount: Number(r.studentCount),
    classTeacherName: r.classTeacherId ? (teachers.get(r.classTeacherId) ?? null) : null,
  }));
}

export const getClass = (id) => SchoolClass.findByPk(id);

/** A class teacher must be a real, active staff member. */
async function checkTeacher(data) {
  if (data.classTeacherId == null) return;
  const teacher = await Staff.findByPk(data.classTeacherId);
  if (!teacher) throw badRequest('Class teacher not found');
  if (teacher.status !== 'active') throw badRequest('The class teacher must be an active staff member');
}

export async function createClass(body) {
  const data = pick(body);
  await checkTeacher(data);
  return (await SchoolClass.create(data)).id;
}

/** Returns false when the class does not exist. */
export async function updateClass(id, body) {
  const cls = await SchoolClass.findByPk(id);
  if (!cls) return false;
  const data = pick(body);
  await checkTeacher(data);
  await cls.update(data);
  return true;
}

/** Returns 'deleted', 'missing' or 'in-use' (students still belong to the class). */
export async function deleteClass(id) {
  const cls = await SchoolClass.findByPk(id);
  if (!cls) return 'missing';
  if (await Student.count({ where: { classId: id } })) return 'in-use';
  await cls.destroy();
  return 'deleted';
}

/** Which stage of school a class belongs to, read from its name: Kindergarten and Grades 1-5 are Primary, 6-8 Middle school, 9 and up Secondary. */
function gradeBand(name) {
  if (/kinder|nursery|pre-?k|lkg|ukg/i.test(name)) return 'Primary';
  const n = Number(/\d+/.exec(name)?.[0]);
  if (!Number.isFinite(n)) return 'Other';
  return n <= 5 ? 'Primary' : n <= 8 ? 'Middle school' : 'Secondary';
}

/**
 * The Academics overview: tiles and one row per class with its class teacher, students, subjects, room and grade band.
 * Timetable completion = subjects that appear on a class's timetable out of the subjects assigned to that class.
 */
export async function academicsOverview() {
  const [classes, links, slots, staff, subjectCount] = await Promise.all([
    listClasses(),
    ClassSubject.findAll({ attributes: ['classId', 'subjectId', 'staffId'] }),
    TimetableSlot.findAll({ attributes: ['classId', 'subjectId'] }),
    Staff.findAll({ where: { status: 'active' }, attributes: ['id', 'designation'] }),
    Subject.count(),
  ]);
  const subjectsOf = new Map();
  for (const l of links) subjectsOf.set(l.classId, (subjectsOf.get(l.classId) ?? new Set()).add(l.subjectId));
  const scheduled = new Map();
  for (const s of slots) scheduled.set(s.classId, (scheduled.get(s.classId) ?? new Set()).add(s.subjectId));
  let assigned = 0;
  let placed = 0;
  for (const [classId, set] of subjectsOf) {
    assigned += set.size;
    placed += [...set].filter((id) => scheduled.get(classId)?.has(id)).length;
  }
  const teaching = new Set(staff.filter((s) => /teach/i.test(s.designation ?? '')).map((s) => s.id));
  const active = new Set(staff.map((s) => s.id));
  for (const l of links) if (l.staffId && active.has(l.staffId)) teaching.add(l.staffId);
  for (const cl of classes)
    if (cl.classTeacherId && active.has(cl.classTeacherId)) teaching.add(cl.classTeacherId);
  const rows = classes.map((cl) => ({
    id: cl.id,
    name: cl.name,
    section: cl.section,
    room: cl.room ?? null,
    classTeacherId: cl.classTeacherId,
    teacher: cl.classTeacherName,
    students: cl.studentCount,
    subjects: subjectsOf.get(cl.id)?.size ?? 0,
    band: gradeBand(cl.name),
  }));
  const bands = { all: rows.length, primary: 0, middle: 0, secondary: 0 };
  for (const r of rows) {
    if (r.band === 'Primary') bands.primary += 1;
    else if (r.band === 'Middle school') bands.middle += 1;
    else if (r.band === 'Secondary') bands.secondary += 1;
  }
  return {
    summary: {
      classes: rows.length,
      subjects: subjectCount,
      teachingStaff: teaching.size,
      timetableCompletion: assigned ? Math.round((placed / assigned) * 100) : null,
    },
    bands,
    rows,
  };
}

/**
 * One class on a page: who teaches it, the subject map (core and elective, theory and practical), the fee items its students are
 * billed, the activities open to it, and how many of its students ride a bus or sleep in the hostel. Everything is read from the
 * same records the rest of the school uses, so this is the class as the school actually runs it.
 */
export async function classMap(id) {
  const cls = await SchoolClass.findByPk(id);
  if (!cls) return null;
  const subjects = await classSubjectMap(id);
  const students = await Student.findAll({
    where: { classId: id, status: 'active' },
    attributes: ['id'],
    raw: true,
  });
  const ids = students.map((s) => s.id);
  const [teacher, fees, activities, rides, boarders, slots] = await Promise.all([
    cls.classTeacherId ? Staff.findByPk(cls.classTeacherId, { attributes: ['firstName', 'lastName'] }) : null,
    FeeStructure.findAll({ where: { classId: id }, order: [['id', 'ASC']] }),
    Activity.findAll({
      where: { status: { [Op.in]: ['planned', 'open'] }, [Op.or]: [{ classId: null }, { classId: id }] },
      order: [['startDate', 'ASC']],
      limit: 20,
    }),
    ids.length
      ? StudentTransport.findAll({ where: { studentId: ids }, attributes: ['routeId'], raw: true })
      : [],
    ids.length ? HostelAllocation.count({ where: { studentId: ids } }) : 0,
    TimetableSlot.count({ where: { classId: id } }),
  ]);
  const routeCount = new Map();
  for (const r of rides) routeCount.set(r.routeId, (routeCount.get(r.routeId) ?? 0) + 1);
  const routes = routeCount.size
    ? await TransportRoute.findAll({ where: { id: [...routeCount.keys()] }, attributes: ['id', 'name'] })
    : [];
  const required = subjects.subjects.reduce((n, s) => n + (s.periodsPerWeek ?? 0), 0);
  return {
    id: cls.id,
    name: cls.name,
    section: cls.section,
    className: subjects.className,
    room: cls.room ?? null,
    teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
    students: ids.length,
    subjects: subjects.subjects,
    fees: {
      items: fees.map((f) => ({ id: f.id, title: f.title, amount: f.amount, dueDate: f.dueDate })),
      total: fees.reduce((n, f) => n + Math.round(Number(f.amount) * 100), 0) / 100,
    },
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      startDate: a.startDate,
      status: a.status,
      forThisClassOnly: Boolean(a.classId),
      fee: a.fee,
    })),
    transport: {
      riders: rides.length,
      routes: routes.map((r) => ({ id: r.id, name: r.name, riders: routeCount.get(r.id) })),
    },
    hostel: { boarders },
    timetable: { periodsPlanned: required, periodsPlaced: slots },
  };
}
