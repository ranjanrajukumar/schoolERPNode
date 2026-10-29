import { Op } from 'sequelize';
import { Attendance, SchoolClass, Student, StudentLeave } from '../../models/index.js';
import { today } from '../../utils/money.js';

/** The classes a staff member is class teacher of (none when the login is not linked to staff). */
export async function classesOf(staffId) {
  if (!staffId) return [];
  const rows = await SchoolClass.findAll({
    where: { classTeacherId: staffId },
    attributes: ['id', 'name', 'section'],
    order: [
      ['name', 'ASC'],
      ['section', 'ASC'],
    ],
  });
  return rows.map((c) => ({ id: c.id, name: c.name, section: c.section }));
}

/** One class at a glance for its class teacher: roll, today's attendance, and leave waiting for a decision. */
export async function myClass(classId) {
  const date = today();
  const [cls, students] = await Promise.all([
    SchoolClass.findByPk(classId, { attributes: ['id', 'name', 'section', 'room'] }),
    Student.findAll({
      where: { classId, status: 'active' },
      attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'guardianName', 'guardianPhone'],
      order: [
        ['firstName', 'ASC'],
        ['lastName', 'ASC'],
      ],
      raw: true,
    }),
  ]);
  if (!cls) return null;
  const ids = students.map((s) => s.id);
  const [marks, leaves] = ids.length
    ? await Promise.all([
        Attendance.findAll({
          where: { date, studentId: ids },
          attributes: ['studentId', 'status'],
          raw: true,
        }),
        StudentLeave.findAll({
          where: { studentId: ids, status: { [Op.in]: ['pending', 'approved'] }, toDate: { [Op.gte]: date } },
          attributes: ['studentId', 'status', 'fromDate', 'toDate'],
          raw: true,
        }),
      ])
    : [[], []];
  const mark = new Map(marks.map((m) => [m.studentId, m.status]));
  const leave = new Map();
  for (const l of leaves) if (!leave.has(l.studentId) || l.status === 'approved') leave.set(l.studentId, l);

  const roll = students.map((s) => {
    const l = leave.get(s.id);
    const onLeave = l?.status === 'approved' && String(l.fromDate).slice(0, 10) <= date;
    return {
      id: s.id,
      admissionNo: s.admissionNo,
      name: `${s.firstName} ${s.lastName}`,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      today: mark.get(s.id) ?? null,
      leave: l
        ? onLeave
          ? 'on leave'
          : l.status === 'pending'
            ? 'leave requested'
            : 'leave upcoming'
        : null,
    };
  });
  const count = (k) => roll.filter((r) => r.today === k).length;
  return {
    id: cls.id,
    name: cls.name,
    section: cls.section,
    room: cls.room ?? null,
    date,
    students: roll,
    totals: {
      students: roll.length,
      present: count('present'),
      absent: count('absent'),
      late: count('late'),
      notMarked: roll.filter((r) => !r.today).length,
      pendingLeaves: leaves.filter((l) => l.status === 'pending').length,
    },
  };
}
