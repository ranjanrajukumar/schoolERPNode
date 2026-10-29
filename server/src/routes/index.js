import { Router } from 'express';
import { requireAuth, requireRole, writeRoles } from '../middleware/authMiddleware.js';
import { auditTrail } from '../middleware/auditMiddleware.js';
import auditRoutes from '../modules/platform/audit.routes.js';
import authRoutes from '../modules/platform/auth.routes.js';
import dashboardRoutes from '../modules/platform/dashboard.routes.js';
import usersRoutes from '../modules/platform/users.routes.js';
import classesRoutes from '../modules/academics/classes.routes.js';
import myClassRoutes from '../modules/academics/myClass.routes.js';
import studentsRoutes from '../modules/academics/students.routes.js';
import attendanceRoutes from '../modules/academics/attendance.routes.js';
import academicYearsRoutes from '../modules/academics/academicYears.routes.js';
import subjectsRoutes from '../modules/academics/subjects.routes.js';
import classSubjectsRoutes from '../modules/academics/classSubjects.routes.js';
import timetableRoutes from '../modules/academics/timetable.routes.js';
import promotionRoutes from '../modules/academics/promotion.routes.js';
import admissionsRoutes from '../modules/admissions/admissions.routes.js';
import staffRoutes from '../modules/hr/staff.routes.js';
import hrRoutes from '../modules/hr/hr.routes.js';
import payrollRoutes from '../modules/hr/payroll.routes.js';
import feesRoutes from '../modules/finance/fees.routes.js';
import feeStructuresRoutes from '../modules/finance/feeStructures.routes.js';
import bookkeepingRoutes from '../modules/finance/bookkeeping.routes.js';
import examsRoutes from '../modules/exams/exams.routes.js';
import activitiesRoutes from '../modules/activities/activities.routes.js';
import settingsRoutes from '../modules/settings/settings.routes.js';
import examExtrasRoutes from '../modules/exams/examExtras.routes.js';
import libraryRoutes from '../modules/library/library.routes.js';
import noticesRoutes from '../modules/communication/notices.routes.js';
import reportsRoutes from '../modules/reports/reports.routes.js';
import transportRoutes, { trackerRouter } from '../modules/transport/transport.routes.js';
import biometricRoutes, { deviceRouter } from '../modules/biometric/biometric.routes.js';
import feedbackRoutes from '../modules/communication/feedback.routes.js';
import leaveTypeRoutes from '../modules/leave/leaveTypes.routes.js';
import progressRoutes from '../modules/progress/progress.routes.js';
import { healthRouter, behaviorRouter } from '../modules/students/studentLife.routes.js';
import { profileRouter, alumniRouter } from '../modules/students/profile.routes.js';
import { leaveRouter, periodRouter, alertRouter } from '../modules/attendance/attendanceExtras.routes.js';
import calendarRoutes from '../modules/academics/calendar.routes.js';
import homeworkRoutes from '../modules/academics/homework.routes.js';
import onlineClassesRoutes from '../modules/academics/onlineClasses.routes.js';
import syllabusRoutes from '../modules/academics/syllabus.routes.js';
import materialsRoutes from '../modules/academics/materials.routes.js';
import documentsRoutes from '../modules/documents/documents.routes.js';
import parentsRoutes from '../modules/portal/parents.routes.js';
import studentAccountsRoutes from '../modules/portal/studentAccounts.routes.js';
import portalRoutes from '../modules/portal/portal.routes.js';
import photoRoutes from '../modules/photos/photos.routes.js';
import filesRoutes from '../modules/files/files.routes.js';
import messagingRoutes from '../modules/messaging/messaging.routes.js';
import publicAdmissionRoutes from '../modules/admissions/public.routes.js';
import publicSchoolRoutes from '../modules/settings/publicSchool.routes.js';
import feeGroupRoutes from '../modules/finance/feeGroups.routes.js';
import recruitmentRoutes from '../modules/hr/recruitment.routes.js';
import reviewRoutes from '../modules/hr/reviews.routes.js';
import staffFileRoutes from '../modules/hr/staffFiles.js';
import schedulingRoutes from '../modules/academics/scheduling.routes.js';
import loginActivityRoutes from '../modules/platform/loginActivity.js';
import rolesRoutes from '../modules/platform/roles.routes.js';
import userGroupRoutes from '../modules/platform/userGroups.routes.js';
import branchRoutes from '../modules/settings/branches.routes.js';
import integrationRoutes from '../modules/settings/integrations.routes.js';
import dataRoutes from '../modules/settings/data.routes.js';
import supportRoutes from '../modules/platform/support.routes.js';
import pushRoutes from '../modules/push/push.routes.js';
import masterRoutes from '../modules/settings/masters.js';
import lookupRoutes from '../modules/lookup/lookup.routes.js';
import setupRoutes from '../modules/settings/setup.routes.js';
import safetyRoutes from '../modules/safety/safety.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import inventoryRequestRoutes from '../modules/inventory/requests.routes.js';
import hostelRoutes from '../modules/hostel/hostel.routes.js';
import appMenuRoutes from '../modules/appmenu/appmenu.routes.js';
import globalSyncRoutes from '../modules/globalauth/globalSync.routes.js';
import lmsRoutes from '../modules/academics/lms.routes.js';
import lmsTagsRoutes from '../modules/academics/lmsTags.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));
router.use('/auth', authRoutes);
router.use('/public', publicAdmissionRoutes); // the website enquiry form; the only unauthenticated writes
router.use('/public', publicSchoolRoutes); // the school's name, contact details and logo, for the login page, header, footer and printouts

router.use('/device', deviceRouter, trackerRouter); // card readers and bus GPS units; each carries its own key instead of a user token

// Everything below requires a signed-in user. Reads are open to every role unless noted;
// writes are limited to the roles that own the process.
router.use(requireAuth);
router.use(auditTrail);
router.use('/audit', requireRole('admin'), auditRoutes);

router.use('/push', pushRoutes); // every signed-in user manages their own device; sending is admin only (inside)
router.use('/app-menu', appMenuRoutes); // the mobile app's menu: every role reads it, only an admin edits it (inside)

// Parents and students get the portal and nothing else: every staff-facing route below is closed to them.
router.use('/portal', requireRole('parent', 'student'), portalRoutes);
router.use((req, res, next) =>
  ['parent', 'student'].includes(req.user.role) ? res.status(403).json({ error: 'Forbidden' }) : next(),
);

router.use('/student-accounts', requireRole('admin'), studentAccountsRoutes);
router.use('/parents', requireRole('admin'), parentsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', requireRole('admin'), usersRoutes);
router.use('/global-sync', requireRole('admin'), globalSyncRoutes); // report this school's logins to the global registry

router.use('/my-class', requireRole('admin', 'teacher'), myClassRoutes);
router.use('/classes', writeRoles('admin'), classesRoutes);
router.use('/students', writeRoles('admin'), studentsRoutes);
router.use('/attendance', writeRoles('admin', 'teacher'), attendanceRoutes);
router.use('/academic-years', writeRoles('admin'), academicYearsRoutes);
router.use('/subjects', writeRoles('admin'), subjectsRoutes);
router.use('/class-subjects', writeRoles('admin'), classSubjectsRoutes);
router.use('/timetable', writeRoles('admin'), timetableRoutes);
router.use('/promotion', requireRole('admin'), promotionRoutes);
router.use('/staff', writeRoles('admin'), staffRoutes);
router.use('/student-health', requireRole('admin', 'teacher'), healthRouter);
router.use('/behavior', requireRole('admin', 'teacher'), behaviorRouter);
router.use('/student-profile', requireRole('admin', 'teacher'), profileRouter);
router.use('/alumni', requireRole('admin', 'teacher'), alumniRouter);
router.use('/student-leaves', requireRole('admin', 'teacher'), leaveRouter);
router.use('/period-attendance', requireRole('admin', 'teacher'), periodRouter);
router.use('/feedback', feedbackRoutes); // any staff login sends; only an admin answers (inside)
router.use('/leave-types', leaveTypeRoutes); // roles are set inside
router.use('/biometric', biometricRoutes); // roles are set inside
router.use('/progress-card', requireRole('admin', 'teacher'), progressRoutes); // only admins change the areas (inside)
router.use('/absence-alerts', requireRole('admin', 'teacher'), alertRouter);
router.use('/calendar', writeRoles('admin'), calendarRoutes);
router.use('/homework', writeRoles('admin', 'teacher'), homeworkRoutes);
router.use('/online-classes', writeRoles('admin', 'teacher'), onlineClassesRoutes);
router.use('/syllabus', writeRoles('admin', 'teacher'), syllabusRoutes);
router.use('/study-materials', writeRoles('admin', 'teacher'), materialsRoutes);
router.use('/lms-tags', writeRoles('admin'), lmsTagsRoutes);
router.use('/lms', writeRoles('admin', 'teacher'), lmsRoutes);
router.use('/documents', requireRole('admin'), documentsRoutes);
router.use('/transport', transportRoutes); // roles are set per route inside
router.use('/photos', photoRoutes); // who may change a photo is set per owner inside
router.use('/student-files', requireRole('admin', 'teacher'), filesRoutes);
router.use('/messaging', messagingRoutes); // roles are set per route inside
router.use('/fee-groups', requireRole('admin', 'accountant'), feeGroupRoutes);
router.use('/recruitment', requireRole('admin'), recruitmentRoutes);
router.use('/performance-reviews', requireRole('admin'), reviewRoutes);
router.use('/staff-files', requireRole('admin'), staffFileRoutes);
router.use('/scheduling', requireRole('admin'), schedulingRoutes);
router.use('/login-activity', requireRole('admin'), loginActivityRoutes);
router.use('/roles', requireRole('admin'), rolesRoutes);
router.use('/user-groups', requireRole('admin'), userGroupRoutes);
router.use('/branches', branchRoutes); // reads open to staff, writes admin only (inside)
router.use('/integrations', requireRole('admin'), integrationRoutes);
router.use('/data', requireRole('admin'), dataRoutes);
router.use('/support', requireRole('admin', 'teacher', 'accountant'), supportRoutes);
router.use('/masters', masterRoutes); // reads open to staff (forms need the options), writes admin only (inside)
router.use('/lookup', lookupRoutes); // type-ahead search for pickers; read-only, every staff login
router.use('/setup', requireRole('admin'), setupRoutes);
router.use('/safety', requireRole('admin'), safetyRoutes);
router.use('/inventory', requireRole('admin'), inventoryRoutes);
router.use('/inventory-requests', requireRole('admin', 'teacher'), inventoryRequestRoutes);
router.use('/hostel', hostelRoutes); // roles are set per route inside
router.use('/hr', hrRoutes); // roles are set per route inside
router.use('/payroll', requireRole('admin', 'accountant'), payrollRoutes);
router.use('/admissions', requireRole('admin'), admissionsRoutes);
router.use('/notices', writeRoles('admin'), noticesRoutes);
router.use('/library', writeRoles('admin', 'teacher'), libraryRoutes);
router.use('/activities', activitiesRoutes); // roles are set per route inside
router.use('/settings', settingsRoutes); // roles are set per route inside
router.use('/exams', examExtrasRoutes); // fixed paths (grading, groups, merit, revaluations) must come first
router.use('/exams', examsRoutes); // roles are set per route inside

router.use('/fees', requireRole('admin', 'accountant'), feesRoutes);
router.use('/fee-structures', requireRole('admin', 'accountant'), feeStructuresRoutes);
router.use('/accounts', requireRole('admin', 'accountant'), bookkeepingRoutes);
router.use('/reports', reportsRoutes);

export default router;
