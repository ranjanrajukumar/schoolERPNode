import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import {
  AcademicYear,
  AuditLog,
  BoardAffiliation,
  Branch,
  ClassSubject,
  Department,
  Designation,
  Exam,
  ExamGroup,
  Fee,
  FeeStructure,
  FeeType,
  BoardRule,
  Parent,
  Room,
  SchoolClass,
  Setting,
  Staff,
  StaffUnavailability,
  Student,
  Subject,
  TimetableSlot,
  User,
} from '../../models/index.js';
import { env } from '../../config/env.js';
import { getSetting } from './settings.service.js';
import { providerStatus } from '../messaging/providers.js';

const label = (c) => `${c.name}-${c.section}`;

/**
 * How ready each class is for the school to run on it. A class is "ready" when it has a class teacher, subjects with a teacher
 * each, a timetable and a fee structure. Students are shown but not required: a class can be set up before it is filled.
 */
export async function classReadiness() {
  const [classes, students, subjects, slots, fees, exams, staff] = await Promise.all([
    SchoolClass.findAll({
      order: [
        ['name', 'ASC'],
        ['section', 'ASC'],
      ],
    }),
    Student.findAll({ where: { status: 'active' }, attributes: ['classId'] }),
    ClassSubject.findAll({ attributes: ['classId', 'staffId'] }),
    TimetableSlot.findAll({ attributes: ['classId'] }),
    FeeStructure.findAll({ attributes: ['classId'] }),
    Exam.findAll({ attributes: ['classId'] }),
    Staff.findAll({ attributes: ['id', 'firstName', 'lastName'] }),
  ]);
  const teacher = new Map(staff.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));
  const count = (rows, id) => rows.filter((r) => r.classId === id).length;

  return classes.map((c) => {
    const mine = subjects.filter((s) => s.classId === c.id);
    const row = {
      id: c.id,
      name: label(c),
      classTeacher: c.classTeacherId ? (teacher.get(c.classTeacherId) ?? null) : null,
      students: count(students, c.id),
      subjects: mine.length,
      subjectsWithoutTeacher: mine.filter((s) => !s.staffId).length,
      timetablePeriods: count(slots, c.id),
      feeItems: count(fees, c.id),
      exams: count(exams, c.id),
    };
    const issues = [];
    if (!row.classTeacher) issues.push({ text: 'No class teacher', link: '/classes' });
    if (!row.subjects) issues.push({ text: 'No subjects assigned', link: '/class-subjects' });
    else if (row.subjectsWithoutTeacher)
      issues.push({
        text: `${row.subjectsWithoutTeacher} subject(s) without a teacher`,
        link: '/class-subjects',
      });
    if (!row.timetablePeriods) issues.push({ text: 'No timetable', link: '/timetable' });
    if (!row.feeItems) issues.push({ text: 'No fee structure', link: '/fee-structures' });
    return { ...row, issues, ready: issues.length === 0 };
  });
}

/**
 * The implementation checklist, in the order a school should do it, each step ticked from the school's real data.
 * Steps marked `optional` are recommended but do not hold up going live.
 */
export async function setupStatus() {
  const [
    school,
    years,
    branches,
    classes,
    subjects,
    curriculum,
    departments,
    designations,
    staff,
    users,
    feeTypes,
    grades,
    slots,
    rooms,
    students,
    parents,
    backups,
    seeded,
    readiness,
    billedFees,
    verifiedAffiliations,
    unverifiedRules,
    totalRules,
    bellRules,
    legacyBells,
    blockedPeriods,
    examGroups,
  ] = await Promise.all([
    getSetting('school.name'),
    AcademicYear.findAll(),
    Branch.count(),
    SchoolClass.count(),
    Subject.count(),
    ClassSubject.count(),
    Department.count(),
    Designation.count(),
    Staff.count({ where: { status: 'active' } }),
    User.count({ where: { role: { [Op.in]: ['teacher', 'accountant'] } } }),
    FeeType.count(),
    BoardRule.count({ where: { ruleType: 'grading', status: 'active', verified: true } }),
    TimetableSlot.count(),
    Room.count(),
    Student.count({ where: { status: 'active' } }),
    Parent.count(),
    AuditLog.count({ where: { method: 'GET', path: '/api/data/backup' } }),
    User.findOne({ where: { email: env.adminEmail() } }),
    classReadiness(),
    Fee.count(),
    BoardAffiliation.count({ where: { status: 'verified' } }),
    BoardRule.count({ where: { status: 'active', verified: false } }),
    BoardRule.count({ where: { status: 'active' } }),
    BoardRule.count({ where: { ruleType: 'bell_schedule', status: 'active' } }),
    Setting.findByPk('timetable.periods'),
    StaffUnavailability.count(),
    ExamGroup.count(),
  ]);

  const phone = await getSetting('school.phone');
  const address = await getSetting('school.address');
  const providers = providerStatus();
  const defaultPassword = Boolean(seeded) && (await bcrypt.compare(env.adminPassword(), seeded.passwordHash));
  const classesReady = readiness.filter((c) => c.ready).length;
  const currentYear = years.find((y) => y.isCurrent);
  const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

  const steps = [
    {
      phase: 'Foundation',
      key: 'profile',
      title: 'Fill in the school profile',
      why: 'Name, address and principal print on certificates, ID cards and messages.',
      link: '/school-profile',
      done: school !== 'School Name' && Boolean(phone || address),
      detail: school === 'School Name' ? 'Still the default name' : school,
    },
    {
      phase: 'Foundation',
      key: 'year',
      title: 'Create the academic year and make it current',
      why: 'Fees, exams, promotion and reports all hang off the current year.',
      link: '/academic-years',
      done: Boolean(currentYear),
      detail: currentYear
        ? `Current: ${currentYear.name}`
        : years.length
          ? 'None is marked current'
          : 'No year yet',
    },
    {
      phase: 'Foundation',
      key: 'campus',
      title: 'Add campuses',
      why: 'Only needed if the school runs on more than one site.',
      link: '/branches',
      optional: true,
      done: branches > 0,
      detail: plural(branches, 'campus', 'campuses'),
    },
    {
      phase: 'Boards',
      key: 'affiliation',
      title: 'Record the school’s board affiliation',
      why: 'Running a board in the software does not mean the school is affiliated to it. Marksheets state affiliation only when a record is verified, with its number and document.',
      link: '/board-rules',
      optional: true,
      done: verifiedAffiliations > 0,
      detail: verifiedAffiliations ? plural(verifiedAffiliations, 'verified record') : 'None verified yet',
    },
    {
      phase: 'Boards',
      key: 'boardrules',
      title: 'Check the board rules against the board’s publications',
      why: 'Subject lists, exam pattern, grading, promotion and report card start as placeholders. Edit each, record its source, then verify it.',
      link: '/board-rules',
      optional: true,
      done: totalRules > 0 && unverifiedRules === 0,
      detail: `${unverifiedRules} of ${totalRules} rules still unverified`,
    },
    {
      phase: 'Academic structure',
      importKind: 'classes',
      key: 'classes',
      title: 'Create classes and sections',
      why: 'Every student, timetable, fee and exam belongs to a class. Choose its board (CBSE or UP Board) here: subjects, exams, grades and promotion follow it.',
      link: '/classes',
      done: classes > 0,
      detail: plural(classes, 'class', 'classes'),
    },
    {
      phase: 'Academic structure',
      importKind: 'subjects',
      key: 'subjects',
      title: 'Create subjects',
      why: 'Subjects are assigned to classes and teachers, then timetabled and examined.',
      link: '/subjects',
      done: subjects > 0,
      detail: plural(subjects, 'subject'),
    },
    {
      phase: 'People',
      importKind: 'departments',
      key: 'departments',
      title: 'Add departments and designations',
      why: 'Used when registering staff and when recruiting.',
      link: '/departments',
      done: departments > 0 && designations > 0,
      detail: `${plural(departments, 'department')}, ${plural(designations, 'designation')}`,
    },
    {
      phase: 'People',
      importKind: 'staff',
      key: 'staff',
      title: 'Register staff',
      why: 'Teachers need a profile before they can be given classes and subjects.',
      link: '/staff?new=1',
      done: staff > 0,
      detail: `${staff} active`,
    },
    {
      phase: 'People',
      key: 'logins',
      title: 'Create logins for teachers and the accountant',
      why: "A teacher's login email must match their staff profile email for marks entry. Use Roles for narrower access.",
      link: '/users',
      done: users > 0,
      detail: plural(users, 'login'),
    },
    {
      phase: 'Academic structure',
      importKind: 'curriculum',
      key: 'curriculum',
      title: 'Assign subjects and teachers to each class',
      why: 'Use Apply default subjects on the Classes page to load each board’s subject list and periods per week, then name a teacher for each. This decides who may enter marks and which teacher appears in the timetable.',
      link: '/class-subjects',
      done: classes > 0 && curriculum > 0,
      detail: plural(curriculum, 'assignment'),
    },
    {
      phase: 'Academic structure',
      key: 'classteachers',
      title: 'Name a class teacher for every class',
      why: 'Parents and the office need one person to go to.',
      link: '/classes',
      done: classes > 0 && readiness.every((c) => c.classTeacher),
      detail: `${readiness.filter((c) => c.classTeacher).length} of ${classes} classes`,
    },
    {
      phase: 'Academic structure',
      key: 'bells',
      title: 'Set the bell times',
      why: 'Period lengths, breaks and lunch, for each board. Time slots on the Timetable page has a CBSE and a UP Board starting pattern.',
      link: '/timetable',
      optional: true,
      done: bellRules > 0 || Boolean(legacyBells),
      detail: bellRules || legacyBells ? 'Saved' : 'Using the built-in 8 × 40 minutes',
    },
    {
      phase: 'Academic structure',
      key: 'timetable',
      title: 'Build the class timetables',
      why: 'Auto-generate fills every class from its subjects, periods per week and teachers without clashes; then adjust by hand. Period attendance, teacher timetables and substitutions use it.',
      link: '/timetable',
      done: slots > 0,
      detail: plural(slots, 'period'),
    },
    {
      phase: 'Academic structure',
      key: 'availability',
      title: 'Mark when part-time teachers are unavailable',
      why: 'Auto-generate and manual entry keep those periods free. Do this before generating.',
      link: '/timetable',
      optional: true,
      done: blockedPeriods > 0,
      detail: blockedPeriods ? plural(blockedPeriods, 'blocked period') : 'None marked',
    },
    {
      phase: 'Academic structure',
      key: 'grades',
      title: 'Verify the grading scale',
      why: 'Results and report cards turn marks into grades with it. Each board has its own scale: check it against the board and record the source.',
      link: '/board-rules',
      done: grades > 0,
      detail: plural(grades, 'verified grading scale'),
    },
    {
      phase: 'Academic structure',
      key: 'rooms',
      title: 'List rooms and labs',
      why: 'Stops a room being used by two classes at once.',
      link: '/room-schedule',
      optional: true,
      done: rooms > 0,
      detail: plural(rooms, 'room'),
    },
    {
      phase: 'Examinations',
      key: 'exams',
      title: 'Create each class’s exams from its board’s pattern',
      why: 'Apply board exam pattern on Exam Groups creates the exams and one result group per class, with the weights. Nursery to UKG use the holistic progress card instead.',
      link: '/exam-groups',
      optional: true,
      done: examGroups > 0,
      detail: plural(examGroups, 'result group'),
    },
    {
      phase: 'Finance',
      importKind: 'feetypes',
      key: 'feetypes',
      title: 'Define fee types',
      why: 'Tuition, transport, exam fee and so on.',
      link: '/fee-types',
      done: feeTypes > 0,
      detail: plural(feeTypes, 'fee type'),
    },
    {
      phase: 'Finance',
      importKind: 'feestructure',
      key: 'feestructure',
      title: 'Set the fee structure for each class',
      why: 'New admissions and "bill the class" use it, so fees are never typed per student.',
      link: '/fee-structures',
      done: classes > 0 && readiness.every((c) => c.feeItems > 0),
      detail: `${readiness.filter((c) => c.feeItems > 0).length} of ${classes} classes have fees`,
    },
    {
      phase: 'Students and parents',
      importKind: 'students',
      key: 'students',
      title: 'Register or import students',
      why: 'Use the registration form, or Data Import for a whole school at once.',
      link: '/data-tools?kind=students',
      done: students > 0,
      detail: `${students} active`,
    },
    {
      phase: 'Students and parents',
      key: 'parents',
      title: 'Create parent portal logins',
      why: 'Parents see attendance, fees and results, and apply for leave.',
      link: '/parents',
      optional: true,
      done: parents > 0,
      detail: plural(parents, 'parent account'),
    },
    {
      phase: 'Students and parents',
      key: 'billing',
      title: 'Bill the opening fees',
      why: 'Students imported or registered without "bill fees" owe nothing yet.',
      link: '/fees',
      done: billedFees > 0 || students === 0,
      detail: plural(billedFees, 'fee item'),
    },
    {
      phase: 'Communication',
      key: 'delivery',
      title: 'Connect email or SMS',
      why: 'Until then messages are only recorded, never delivered.',
      link: '/integrations',
      optional: true,
      done: providers.email !== 'log' || providers.sms !== 'log',
      detail: `Email: ${providers.email}, SMS: ${providers.sms}`,
    },
    {
      phase: 'Go live',
      key: 'password',
      title: 'Change the default admin password',
      why: 'The seeded password is public knowledge.',
      link: '/users',
      done: !defaultPassword,
      detail: defaultPassword ? 'Still the default' : 'Changed',
    },
    {
      phase: 'Go live',
      key: 'secret',
      title: 'Set a real JWT secret in server/.env',
      why: 'Signs every login; the example value must not reach production.',
      link: '/integrations',
      done: process.env.JWT_SECRET !== 'change_me',
      detail: process.env.JWT_SECRET === 'change_me' ? 'Still the example value' : 'Set',
    },
    {
      phase: 'Go live',
      key: 'backup',
      title: 'Download a first backup',
      why: 'Proves you can recover, and is the baseline before real data goes in.',
      link: '/backup-restore',
      done: backups > 0,
      detail: backups ? `${plural(backups, 'download')} recorded` : 'None yet',
    },
  ];

  const required = steps.filter((s) => !s.optional);
  const phases = [...new Set(steps.map((s) => s.phase))];
  return {
    steps,
    phases,
    progress: { done: required.filter((s) => s.done).length, total: required.length },
    classes: { total: classes, ready: classesReady },
  };
}
