import { Router } from 'express';
import { Op, fn, col } from 'sequelize';
import {
  Admission,
  Attendance,
  BiometricDevice,
  BiometricPunch,
  BookIssue,
  Fee,
  Feedback,
  LeaveRequest,
  Notice,
  Payment,
  SchoolClass,
  Staff,
  StaffAttendance,
  Student,
  StudentLeave,
} from '../../models/index.js';
import { listLeaves as listStudentLeaves } from '../attendance/studentLeave.service.js';
import { liveFleet } from '../transport/tracking.service.js';
import { stageWhere } from '../admissions/applications.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { daysFromNow, today } from '../../utils/money.js';
import { eventsBetween } from '../academics/calendar.routes.js';

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (d) => d.toISOString().slice(0, 10);

/** Share of marked students present (or late) for each of the last seven days, oldest first; null where nothing was marked. */
async function attendanceTrend(now) {
  const days = Array.from({ length: 7 }, (_, i) =>
    dayKey(new Date(new Date(`${now}T00:00:00Z`).getTime() - (6 - i) * DAY_MS)),
  );
  const rows = await Attendance.findAll({
    // only students who are still enrolled count, the same set the attendance register shows
    where: { date: { [Op.gte]: days[0] } },
    attributes: ['date', 'status', [fn('COUNT', col('Attendance.id')), 'count']],
    group: ['date', 'status'],
    raw: true,
    include: [{ model: Student, attributes: [], required: true, where: { status: 'active' } }],
  });
  return days.map((date) => {
    const mine = rows.filter((r) => r.date === date);
    const total = mine.reduce((n, r) => n + Number(r.count), 0);
    const here = mine.filter((r) => r.status !== 'absent').reduce((n, r) => n + Number(r.count), 0);
    return { date, total, percent: total ? Math.round((here / total) * 1000) / 10 : null };
  });
}

/** Fees collected in each of the last six months (this one included), oldest first. */
async function collectionTrend(now) {
  const [year, month] = now.split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (5 - i), 1));
    return {
      key: dayKey(d).slice(0, 7),
      label: d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }),
    };
  });
  const start = `${months[0].key}-01`;
  const payments = await Payment.findAll({
    where: { paidOn: { [Op.gte]: start } },
    attributes: ['paidOn', 'amount'],
    raw: true,
  });
  return months.map((m) => ({
    month: m.label,
    amount:
      payments
        .filter((p) => String(p.paidOn).slice(0, 7) === m.key)
        .reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0) / 100,
  }));
}

/** Admissions (applications received) and enquiries for each of the last eight months, oldest first. */
async function enrollmentTrend(now) {
  const [year, month] = now.split('-').map(Number);
  const months = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (7 - i), 1));
    return {
      key: dayKey(d).slice(0, 7),
      label: d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }),
    };
  });
  const rows = await Admission.findAll({
    where: {
      createdAt: { [Op.gte]: new Date(`${months[0].key}-01T00:00:00Z`) },
      status: { [Op.ne]: 'draft' },
    },
    attributes: ['status', 'createdAt', 'enquiryOn'],
    raw: true,
  });
  return months.map((m) => {
    const inMonth = rows.filter((r) => dayOf(r).slice(0, 7) === m.key);
    return {
      month: m.label,
      admissions: inMonth.filter((r) => r.status !== 'enquiry').length,
      enquiries: inMonth.filter((r) => r.status === 'enquiry').length,
    };
  });
}

const iso = (v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());
/** The day an enquiry was received: its own date, or the day the record was made. */
const dayOf = (r) => String(r.enquiryOn ?? iso(r.createdAt)).slice(0, 10);

/** The latest things that happened across the school, newest first: registrations, enrolments, enquiries and attendance taken. */
async function recentActivity() {
  const [students, enrolled, enquiries, marks] = await Promise.all([
    Student.findAll({
      order: [['id', 'DESC']],
      limit: 4,
      include: [{ model: SchoolClass, attributes: ['name', 'section'], required: false }],
    }),
    Admission.findAll({
      where: { status: 'enrolled', enrolledOn: { [Op.ne]: null } },
      order: [
        ['enrolledOn', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: 4,
      include: [{ model: SchoolClass, attributes: ['name', 'section'], required: false }],
    }),
    Admission.findAll({
      where: { status: 'enquiry' },
      order: [['id', 'DESC']],
      limit: 4,
      include: [{ model: SchoolClass, attributes: ['name', 'section'], required: false }],
    }),
    Attendance.findAll({
      where: { savedAt: { [Op.ne]: null } },
      order: [['savedAt', 'DESC']],
      limit: 60,
      include: [
        {
          model: Student,
          attributes: ['classId'],
          include: [{ model: SchoolClass, attributes: ['name', 'section'], required: false }],
        },
      ],
    }),
  ]);
  const label = (c) => (c ? `${c.name} · ${c.section}` : '');
  const seen = new Set();
  const attendance = [];
  for (const m of marks) {
    const cls = m.Student?.SchoolClass;
    const key = `${m.Student?.classId}:${m.date}`;
    if (!cls || seen.has(key)) continue;
    seen.add(key);
    attendance.push({
      type: 'attendance',
      title: 'Attendance submitted',
      sub: label(cls),
      at: iso(m.savedAt),
    });
  }
  return [
    ...students.map((s) => ({
      type: 'registration',
      title: 'New student registration',
      sub: `${s.firstName} ${s.lastName}${s.SchoolClass ? ` · ${label(s.SchoolClass)}` : ''}`,
      at: iso(s.createdAt),
    })),
    ...enrolled.map((a) => ({
      type: 'admission',
      title: 'Admission completed',
      sub: `${a.applicantName}${a.SchoolClass ? ` · ${label(a.SchoolClass)}` : ''}`,
      at: `${String(a.enrolledOn).slice(0, 10)}T12:00:00.000Z`,
    })),
    ...enquiries.map((a) => ({
      type: 'enquiry',
      title: 'New enquiry received',
      sub: `${a.applicantName}${a.SchoolClass ? ` · ${label(a.SchoolClass)}` : ''}`,
      at: iso(a.createdAt),
    })),
    ...attendance.slice(0, 3),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
}

/**
 * What is waiting for this person, by role: leave to decide, grievances still open, biometric readers and buses reporting,
 * staff in today. An accountant sees none of it.
 */
async function attention(user, now) {
  if (!['admin', 'teacher'].includes(user.role)) return null;
  const admin = user.role === 'admin';
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const [
    studentLeaves,
    staffLeaves,
    grievances,
    feedbackOpen,
    devices,
    punchesToday,
    fleet,
    staffMarks,
    staffTotal,
  ] = await Promise.all([
    admin
      ? StudentLeave.count({ where: { status: 'pending' } })
      : listStudentLeaves({ status: 'pending' }, user).then((rows) => rows.filter((r) => r.canDecide).length),
    admin ? LeaveRequest.count({ where: { status: 'pending' } }) : 0,
    admin
      ? Feedback.findAll({
          where: { kind: 'grievance', status: { [Op.in]: ['open', 'in_progress'] } },
          attributes: ['level'],
          raw: true,
        })
      : [],
    admin ? Feedback.count({ where: { kind: 'feedback', status: 'open' } }) : 0,
    BiometricDevice.findAll({ where: { status: 'active' }, attributes: ['lastSeenAt'], raw: true }),
    BiometricPunch.count({ where: { punchedAt: { [Op.gte]: startOfDay } } }),
    liveFleet(),
    admin
      ? StaffAttendance.findAll({
          where: { date: now },
          attributes: ['status', [fn('COUNT', col('id')), 'count']],
          group: ['status'],
          raw: true,
        })
      : [],
    admin ? Staff.count({ where: { status: 'active' } }) : 0,
  ]);
  const staffToday = { present: 0, late: 0, absent: 0, leave: 0 };
  staffMarks.forEach((r) => {
    staffToday[r.status] = Number(r.count);
  });

  return {
    studentLeaves,
    staffLeaves,
    grievances: grievances.length,
    grievancesAtPrincipal: grievances.filter((g) => g.level === 3).length,
    feedbackOpen,
    devices: {
      total: devices.length,
      online: devices.filter((d) => d.lastSeenAt && new Date(d.lastSeenAt) > tenMinutesAgo).length,
      punchesToday,
    },
    buses: { total: fleet.length, live: fleet.filter((b) => b.live).length },
    staffToday: admin
      ? {
          ...staffToday,
          total: staffTotal,
          marked: staffToday.present + staffToday.late + staffToday.absent + staffToday.leave,
        }
      : null,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = today();
    const monthStart = `${now.slice(0, 8)}01`;

    const [
      students,
      classes,
      staff,
      billed,
      paid,
      pendingAdmissions,
      overdueFees,
      collected,
      marked,
      overdueBooks,
      notices,
    ] = await Promise.all([
      Student.count({ where: { status: 'active' } }),
      SchoolClass.count(),
      Staff.count({ where: { status: 'active' } }),
      Fee.sum('amount'),
      Fee.sum('paidAmount'),
      Admission.count({ where: { status: { [Op.in]: ['enquiry', 'applied', 'waitlisted', 'approved'] } } }),
      Fee.count({
        where: { dueDate: { [Op.lt]: now }, [Op.and]: [Fee.sequelize.literal('paid_amount < amount')] },
      }),
      Payment.sum('amount', { where: { paidOn: { [Op.gte]: monthStart } } }),
      Attendance.findAll({
        where: { date: now },
        attributes: ['status', [fn('COUNT', col('Attendance.id')), 'count']],
        group: ['status'],
        raw: true,
        include: [{ model: Student, attributes: [], required: true, where: { status: 'active' } }],
      }),
      BookIssue.count({ where: { returnedOn: null, dueOn: { [Op.lt]: now } } }),
      Notice.findAll({ order: [['id', 'DESC']], limit: 5 }),
    ]);

    const today_ = { present: 0, absent: 0, late: 0 };
    marked.forEach((r) => {
      today_[r.status] = Number(r.count);
    });

    const upcomingEvents = (await eventsBetween(now, daysFromNow(30))).slice(0, 5);

    const admin = req.user.role === 'admin';
    const month = new Date(`${monthStart}T00:00:00`);
    const [
      addedThisMonth,
      enquiriesThisMonth,
      needFollowUp,
      underReview,
      toReview,
      unmarkedClasses,
      activity,
    ] = await Promise.all([
      Student.count({ where: { createdAt: { [Op.gte]: month } } }),
      Admission.count({ where: { status: 'enquiry', enquiryOn: { [Op.gte]: monthStart } } }),
      Admission.count({
        where: {
          status: { [Op.in]: ['enquiry', 'applied', 'waitlisted', 'approved'] },
          followUpOn: { [Op.lte]: now },
        },
      }),
      Admission.count({ where: stageWhere('review') }),
      admin
        ? Admission.findAll({
            where: { [Op.or]: [stageWhere('review'), stageWhere('assessment')] },
            order: [['id', 'DESC']],
            limit: 3,
            include: [{ model: SchoolClass, attributes: ['name', 'section'], required: false }],
          })
        : [],
      // classes with active students where nobody has been marked today
      (async () => {
        const all = await Student.findAll({
          where: { status: 'active', classId: { [Op.ne]: null } },
          attributes: ['id', 'classId'],
          raw: true,
        });
        const doneIds = new Set(
          (await Attendance.findAll({ where: { date: now }, attributes: ['studentId'], raw: true })).map(
            (a) => a.studentId,
          ),
        );
        const open = new Map();
        for (const st of all) if (!doneIds.has(st.id)) open.set(st.classId, (open.get(st.classId) ?? 0) + 1);
        const names = open.size
          ? await SchoolClass.findAll({
              where: { id: [...open.keys()] },
              attributes: ['id', 'name', 'section'],
            })
          : [];
        return names.map((c) => `${c.name} · ${c.section}`).sort();
      })(),
      admin ? recentActivity() : [],
    ]);

    res.json({
      attention: await attention(req.user, now),
      enrollmentTrend: await enrollmentTrend(now),
      studentsAddedThisMonth: addedThisMonth,
      enquiriesThisMonth,
      needFollowUp,
      underReview,
      toReview: toReview.map((a) => ({
        id: a.id,
        name: a.applicantName,
        grade: a.SchoolClass ? `${a.SchoolClass.name}-${a.SchoolClass.section}` : null,
        submitted: dayOf(a),
        stage: a.testDate || a.interviewDate ? 'assessment' : 'review',
      })),
      unmarkedClasses,
      recentActivity: activity,
      attendanceTrend: await attendanceTrend(now),
      collectionTrend: await collectionTrend(now),
      upcomingEvents,
      students,
      classes,
      staff,
      feesDue: (billed || 0) - (paid || 0),
      overdueFees,
      collectedThisMonth: collected || 0,
      pendingAdmissions,
      overdueBooks,
      attendanceToday: today_,
      notices,
    });
  }),
);

export default router;
