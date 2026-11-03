import { Op } from 'sequelize';
import {
  ClassSubject,
  SchoolClass,
  Staff,
  Student,
  Substitution,
  TimetableSlot,
  User,
} from '../../models/index.js';
import { forbidden } from '../../utils/httpError.js';

/**
 * The classes a teacher belongs to: the ones they are class teacher of, teach a subject in (Class subjects), or have a
 * timetable period in. A substitute also gets the class of the period they cover, on that date only.
 * The teacher's staff record is the one with the same email as their login, as for marks entry.
 * Returns null for anyone who is not a teacher (no restriction), and an empty set for a teacher with no staff record.
 *
 * `when` narrows which substitutions count: { date: 'YYYY-MM-DD' } for one day, { month: 'YYYY-MM' } for a month.
 */
export async function teacherClassIds(user, when = {}) {
  if (user?.role !== 'teacher') return null;
  const login = await User.findByPk(user.id, { attributes: ['email'] });
  const staff = await Staff.findAll({
    where: { email: login?.email ?? '', status: 'active' },
    attributes: ['id'],
  });
  const ids = new Set();
  if (!staff.length) return ids;
  const staffIds = staff.map((s) => s.id);

  const [asClassTeacher, bySubject, byTimetable] = await Promise.all([
    SchoolClass.findAll({ where: { classTeacherId: staffIds }, attributes: ['id'] }),
    ClassSubject.findAll({ where: { staffId: staffIds }, attributes: ['classId'] }),
    TimetableSlot.findAll({ where: { staffId: staffIds }, attributes: ['classId'] }),
  ]);
  for (const c of asClassTeacher) ids.add(c.id);
  for (const c of [...bySubject, ...byTimetable]) ids.add(c.classId);

  const range = when.date
    ? { [Op.eq]: when.date }
    : when.month
      ? { [Op.between]: [`${when.month}-01`, `${when.month}-31`] }
      : null;
  if (range) {
    const covers = await Substitution.findAll({
      where: { substituteId: staffIds, date: range },
      attributes: ['slotId'],
    });
    if (covers.length) {
      const slots = await TimetableSlot.findAll({
        where: { id: covers.map((c) => c.slotId) },
        attributes: ['classId'],
      });
      for (const s of slots) ids.add(s.classId);
    }
  }
  return ids;
}

/** A teacher may only look at one of their own classes. Anyone else is unrestricted. */
export async function assertTeacherMayView(user, classId, when) {
  const mine = await teacherClassIds(user, when);
  if (mine === null) return;
  if (!classId) throw forbidden('Choose one of your classes');
  if (!mine.has(Number(classId))) throw forbidden('You can only open attendance for your own classes');
}

/** A teacher may only mark students of their own classes (or classes they cover that day). */
export async function assertTeacherMayMark(user, date, studentIds) {
  const mine = await teacherClassIds(user, { date });
  if (mine === null) return;
  const rows = await Student.findAll({ where: { id: studentIds }, attributes: ['id', 'classId'] });
  if (rows.some((s) => !mine.has(s.classId)))
    throw forbidden(
      'You can only mark attendance for your own classes. For a class you are covering, ask the office to record the substitution first',
    );
}
