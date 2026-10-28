import { STAFF_DETAIL_COLUMNS } from '../modules/hr/staffFields.js';
import { seedMasters } from '../modules/settings/masters.js';
import { PARENT_COLUMNS } from '../modules/portal/parentFields.js';
import { ADMISSION_DETAIL_COLUMNS_FOR, DETAIL_COLUMNS } from '../modules/academics/studentFields.js';
import { ENQUIRY_FIELDS, STUDENT_EXTRA_KEYS } from '../modules/admissions/enquiryFields.js';
import { saveExtras } from '../modules/admissions/recordExtras.js';
import { AUDIT_COLUMNS } from '../models/auditSoftDelete.js';
import bcrypt from 'bcryptjs';
import { Sequelize } from 'sequelize';
import { LeaveType, LmsCourse, LmsEnrollment, LmsLesson, LmsSubmission, Setting, Student, sequelize, User } from '../models/index.js';
import { migrateLegacyLmsFiles } from '../modules/academics/lmsFiles.service.js';
import { env } from './env.js';
import { ensureForeignKeys } from './integrity.js';

/** The target database may not exist yet, so connect without one to create it. */
async function ensureDatabase() {
  const admin = new Sequelize('', process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
  });
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  } finally {
    await admin.close();
  }
}

async function seedAdmin() {
  if (await User.count()) return;
  await User.create({
    name: 'Admin',
    email: env.adminEmail(),
    passwordHash: await bcrypt.hash(env.adminPassword(), 10),
    role: 'admin',
  });
  console.log(`Seeded the initial administrator account (${env.adminEmail()}).`);
}

/**
 * sync() never alters existing tables, so a role added after the users table was created has to be
 * added by hand. Widening an ENUM to a superset is safe to repeat.
 */
async function ensureUserRoles() {
  await sequelize.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('admin','teacher','accountant','parent','student') NOT NULL DEFAULT 'admin'",
  );
}

async function ensureAdmissionStatuses() {
  await sequelize.query(
    "ALTER TABLE admissions MODIFY COLUMN status ENUM('draft','enquiry','applied','waitlisted','approved','rejected','enrolled') NOT NULL DEFAULT 'enquiry'",
  );
}

/** Columns added to a model after its table already existed; sync() will not add them. */
const ADDED_COLUMNS = [
  { table: 'lms_progress', column: 'viewed_at', definition: 'DATETIME NULL' },
  { table: 'lms_progress', column: 'view_count', definition: 'INT NOT NULL DEFAULT 0' },
  { table: 'lms_quizzes', column: 'due_on', definition: 'DATE NULL' },
  { table: 'lms_lessons', column: 'attachment_data', definition: 'LONGTEXT NULL' },
  { table: 'lms_lessons', column: 'module_id', definition: 'INT NULL' },
  { table: 'lms_quiz_attempts', column: 'review_status', definition: "VARCHAR(20) NOT NULL DEFAULT 'reviewed'" },
  { table: 'lms_quiz_attempts', column: 'feedback', definition: 'VARCHAR(1000) NULL' },
  { table: 'lms_quiz_attempts', column: 'question_scores', definition: 'JSON NULL' },
  { table: 'lms_lessons', column: 'attachment_key', definition: 'VARCHAR(64) NULL' },
  { table: 'lms_lessons', column: 'attachment_name', definition: 'VARCHAR(255) NULL' },
  { table: 'lms_lessons', column: 'attachment_mime', definition: 'VARCHAR(80) NULL' },
  { table: 'lms_lessons', column: 'attachment_size', definition: 'INT NULL' },
  { table: 'lms_submissions', column: 'attachment_data', definition: 'LONGTEXT NULL' },
  { table: 'lms_submissions', column: 'attachment_key', definition: 'VARCHAR(64) NULL' },
  { table: 'lms_submissions', column: 'attachment_name', definition: 'VARCHAR(255) NULL' },
  { table: 'lms_submissions', column: 'attachment_mime', definition: 'VARCHAR(80) NULL' },
  { table: 'lms_submissions', column: 'attachment_size', definition: 'INT NULL' },
  { table: 'student_files', column: 'data', definition: 'LONGTEXT NULL' },
  { table: 'staff_files', column: 'data', definition: 'LONGTEXT NULL' },
  { table: 'class_subjects', column: 'practical_share', definition: 'INT NULL' },
  { table: 'leave_requests', column: 'leave_type_id', definition: 'INT NULL' },
  { table: 'departments', column: 'head_staff_id', definition: 'INT NULL' },
  { table: 'attendance', column: 'out_time', definition: 'VARCHAR(5) NULL' },
  { table: 'feedback', column: 'level', definition: 'INT NOT NULL DEFAULT 2' },
  { table: 'feedback', column: 'last_action_on', definition: 'DATETIME NULL' },
  { table: 'leave_requests', column: 'day_part', definition: "VARCHAR(12) NOT NULL DEFAULT 'full'" },
  { table: 'leave_requests', column: 'from_time', definition: 'VARCHAR(5) NULL' },
  { table: 'leave_requests', column: 'to_time', definition: 'VARCHAR(5) NULL' },
  { table: 'student_leaves', column: 'day_part', definition: "VARCHAR(12) NOT NULL DEFAULT 'full'" },
  { table: 'student_leaves', column: 'from_time', definition: 'VARCHAR(5) NULL' },
  { table: 'student_leaves', column: 'to_time', definition: 'VARCHAR(5) NULL' },
  { table: 'student_leaves', column: 'leave_type_id', definition: 'INT NULL' },
  { table: 'marks', column: 'practical_marks', definition: 'DECIMAL(6,2) NULL' },
  { table: 'class_subjects', column: 'component', definition: "VARCHAR(20) NOT NULL DEFAULT 'theory'" },
  { table: 'class_subjects', column: 'is_elective', definition: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'class_subjects', column: 'elective_group', definition: 'VARCHAR(50) NULL' },
  { table: 'class_subjects', column: 'periods_per_week', definition: 'INT NULL' },
  { table: 'master_items', column: 'required', definition: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'application_documents', column: 'title', definition: 'VARCHAR(100) NULL' },
  { table: 'admissions', column: 'choices', definition: 'TEXT NULL' },
  { table: 'admissions', column: 'referred_by', definition: 'VARCHAR(100) NULL' },
  { table: 'admissions', column: 'consent_at', definition: 'DATETIME NULL' },
  { table: 'attendance', column: 'arrival_time', definition: 'VARCHAR(5) NULL' },
  { table: 'attendance', column: 'note', definition: 'VARCHAR(120) NULL' },
  { table: 'attendance', column: 'saved_at', definition: 'DATETIME NULL' },
  { table: 'classes', column: 'room', definition: 'VARCHAR(20) NULL' },
  { table: 'students', column: 'registration_status', definition: "VARCHAR(20) NOT NULL DEFAULT 'complete'" },
  { table: 'admissions', column: 'enquiry_on', definition: 'DATE NULL' },
  { table: 'admissions', column: 'deleted_at', definition: 'DATETIME NULL' },
  { table: 'admissions', column: 'deleted_by_name', definition: 'VARCHAR(100) NULL' },
  { table: 'admissions', column: 'academic_year', definition: 'VARCHAR(30) NULL' },
  { table: 'admissions', column: 'assigned_to_id', definition: 'INT NULL' },
  { table: 'admissions', column: 'preferred_contact', definition: 'VARCHAR(20) NULL' },
  { table: 'admissions', column: 'follow_up_type', definition: 'VARCHAR(20) NULL' },
  { table: 'admissions', column: 'follow_up_note', definition: 'VARCHAR(200) NULL' },
  { table: 'admissions', column: 'follow_up_on', definition: 'DATE NULL' },
  { table: 'admissions', column: 'visit_on', definition: 'DATE NULL' },
  { table: 'admissions', column: 'last_contacted_on', definition: 'DATE NULL' },
  { table: 'admissions', column: 'enrolled_on', definition: 'DATE NULL' },
  { table: 'classes', column: 'class_teacher_id', definition: 'INT NULL' },
  { table: 'users', column: 'staff_id', definition: 'INT NULL' },
  { table: 'hostel_allocations', column: 'bed_no', definition: 'VARCHAR(20) NULL' },
  { table: 'hostel_allocations', column: 'meal_plan', definition: 'VARCHAR(20) NULL' },
  { table: 'hostel_allocations', column: 'local_guardian_name', definition: 'VARCHAR(100) NULL' },
  { table: 'hostel_allocations', column: 'local_guardian_phone', definition: 'VARCHAR(20) NULL' },
  { table: 'hostel_allocations', column: 'local_guardian_relation', definition: 'VARCHAR(40) NULL' },
  { table: 'hostel_allocations', column: 'security_deposit', definition: 'DECIMAL(10,2) NULL' },
  { table: 'hostel_allocations', column: 'consent_received', definition: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'hostel_allocations', column: 'remarks', definition: 'VARCHAR(255) NULL' },
  { table: 'student_transport', column: 'trip_type', definition: "VARCHAR(10) NOT NULL DEFAULT 'both'" },
  { table: 'student_transport', column: 'authorized_pickup_name', definition: 'VARCHAR(100) NULL' },
  { table: 'student_transport', column: 'authorized_pickup_phone', definition: 'VARCHAR(20) NULL' },
  { table: 'student_transport', column: 'remarks', definition: 'VARCHAR(255) NULL' },
  ...DETAIL_COLUMNS,
  ...PARENT_COLUMNS,
  ...ADMISSION_DETAIL_COLUMNS_FOR(DETAIL_COLUMNS),
  ...STAFF_DETAIL_COLUMNS,
  { table: 'admissions', column: 'source', definition: "VARCHAR(20) NOT NULL DEFAULT 'office'" },
  { table: 'admissions', column: 'test_date', definition: 'DATE NULL' },
  { table: 'admissions', column: 'test_marks', definition: 'DECIMAL(6,2) NULL' },
  { table: 'admissions', column: 'test_max_marks', definition: 'DECIMAL(6,2) NULL' },
  { table: 'admissions', column: 'interview_date', definition: 'DATE NULL' },
  { table: 'admissions', column: 'interview_time', definition: 'VARCHAR(5) NULL' },
  { table: 'admissions', column: 'interview_panel', definition: 'VARCHAR(100) NULL' },
  { table: 'admissions', column: 'interview_result', definition: "ENUM('pending','recommended','not_recommended') NULL" },
  { table: 'admissions', column: 'offer_expiry', definition: 'DATE NULL' },
  { table: 'timetable_slots', column: 'room_id', definition: 'INT NULL' },
  { table: 'classes', column: 'branch_id', definition: 'INT NULL' },
  { table: 'users', column: 'role_id', definition: 'INT NULL' },
  { table: 'document_requests', column: 'requested_by_role', definition: 'VARCHAR(10) NULL' },
  { table: 'document_requests', column: 'decided_by_name', definition: 'VARCHAR(100) NULL' },
  { table: 'document_requests', column: 'decided_on', definition: 'DATETIME NULL' },
  { table: 'student_leaves', column: 'requested_by_role', definition: 'VARCHAR(10) NULL' },
  { table: 'student_leaves', column: 'decided_by_name', definition: 'VARCHAR(100) NULL' },
  { table: 'student_leaves', column: 'decided_on', definition: 'DATETIME NULL' },
  { table: 'users', column: 'must_change_password', definition: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'books', column: 'category_id', definition: 'INT NULL' },
  { table: 'staff', column: 'department_id', definition: 'INT NULL' },
  { table: 'payslips', column: 'paid_by_name', definition: 'VARCHAR(100) NULL' },
  { table: 'exams', column: 'exam_group_id', definition: 'INT NULL' },
  { table: 'exams', column: 'weight', definition: 'INT NOT NULL DEFAULT 100' },
];

/**
 * The detailed particulars used to be columns on admissions and students; MySQL cannot hold that many long columns in one row, so they
 * live in record_extras now. Anything still in the old columns is moved across, then the columns are dropped. Safe to repeat.
 */
async function moveExtrasToSideTable() {
  const queryInterface = sequelize.getQueryInterface();
  const snake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  const kinds = {
    json: new Set(ENQUIRY_FIELDS.filter((f) => f.type === 'json').map((f) => f.key)),
    bool: new Set(ENQUIRY_FIELDS.filter((f) => f.type === 'bool').map((f) => f.key)),
  };
  for (const [table, entity, keys] of [['admissions', 'admission', ENQUIRY_FIELDS.map((f) => f.key)], ['students', 'student', [...STUDENT_EXTRA_KEYS, 'source', 'referredBy']]]) {
    const existing = await queryInterface.describeTable(table);
    const present = keys.filter((k) => existing[snake(k)] && !(table === 'admissions' && ['source', 'referredBy'].includes(k)));
    if (!present.length) continue;
    const [rows] = await sequelize.query(`SELECT id, ${present.map((k) => `\`${snake(k)}\` AS \`${k}\``).join(', ')} FROM \`${table}\` WHERE ${present.map((k) => `\`${snake(k)}\` IS NOT NULL`).join(' OR ')}`);
    for (const { id, ...values } of rows) {
      const clean = {};
      for (const [k, v] of Object.entries(values)) {
        if (v === null || v === '') continue;
        clean[k] = kinds.bool.has(k) ? Boolean(v) : kinds.json.has(k) ? JSON.parse(v) : v;
      }
      await saveExtras(entity, id, clean);
    }
    for (const k of present) await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${snake(k)}\``);
  }
}

async function ensureColumns() {
  const queryInterface = sequelize.getQueryInterface();
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const existing = await queryInterface.describeTable(table);
    if (!existing[column]) await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
  await sequelize.query('ALTER TABLE lms_progress MODIFY COLUMN completed_at DATETIME NULL');
  await sequelize.query('ALTER TABLE lms_quiz_attempts MODIFY COLUMN score DECIMAL(8,2) NOT NULL');
  await sequelize.query('ALTER TABLE lms_quiz_attempts MODIFY COLUMN max_score DECIMAL(8,2) NOT NULL');
  await sequelize.query('UPDATE lms_progress SET viewed_at = completed_at, view_count = 1 WHERE completed_at IS NOT NULL AND viewed_at IS NULL');
  const movedLmsFiles = await migrateLegacyLmsFiles([LmsLesson, LmsSubmission]);
  if (movedLmsFiles) console.log(`Moved ${movedLmsFiles} LMS file(s) into ${process.env.LMS_STORAGE_DIR || 'uploads/lms'}.`);
  const courses = await LmsCourse.findAll({ attributes: ['id', 'classId'] });
  for (const course of courses) {
    const students = await Student.findAll({ where: { classId: course.classId, status: 'active' }, attributes: ['id'], raw: true });
    if (students.length) await LmsEnrollment.bulkCreate(students.map((student) => ({ courseId: course.id, studentId: student.id, active: true })), { ignoreDuplicates: true });
  }
  // the audit and soft-delete columns on every table, old ones included
  for (const model of Object.values(sequelize.models)) {
    const existing = await queryInterface.describeTable(model.tableName);
    for (const [column, definition] of Object.entries(AUDIT_COLUMNS)) {
      if (!existing[column]) await sequelize.query(`ALTER TABLE \`${model.tableName}\` ADD COLUMN \`${column}\` ${definition}`);
    }
  }
  await moveExtrasToSideTable();
  // Enquiries that predate the enquiry date take the day they were entered. Safe to repeat.
  // An applicant marked enrolled whose student no longer exists goes back to holding an offer. Safe to repeat.
  await sequelize.query("UPDATE admissions SET status = 'approved', student_id = NULL, enrolled_on = NULL WHERE status = 'enrolled' AND (student_id IS NULL OR student_id NOT IN (SELECT id FROM students))");
  await sequelize.query('UPDATE admissions SET enquiry_on = DATE(created_at) WHERE enquiry_on IS NULL');
}

/**
 * Adds database foreign keys that older tables lack. Orphaned rows block a constraint, so those are only reported;
 * removing them is a decision for `npm run db:orphans -- --delete`.
 */
async function enforceRelationships() {
  const { added, blocked } = await ensureForeignKeys();
  if (added.length) console.log(`Added ${added.length} missing foreign key(s).`);
  if (blocked.length) {
    console.warn(`WARNING: ${blocked.length} relationship(s) are not enforced because of orphaned rows: ${blocked.map((b) => `${b.child}.${b.column}`).join(', ')}. Run "npm run db:orphans" to review them.`);
  }
}

/**
 * Leave types replaced the fixed casual / sick / earned / unpaid list. Widen the old ENUM column, create the starting
 * types (using any yearly allowances already set under Settings) the first time, and link existing requests to them.
 */
async function ensureLeaveTypes() {
  await sequelize.query('ALTER TABLE leave_requests MODIFY COLUMN type VARCHAR(60) NOT NULL');
  // half days and timely leave need fractions
  await sequelize.query('ALTER TABLE leave_requests MODIFY COLUMN days DECIMAL(4,1) NOT NULL');
  await sequelize.query('ALTER TABLE student_leaves MODIFY COLUMN days DECIMAL(4,1) NOT NULL');
  await sequelize.query("ALTER TABLE leave_types MODIFY COLUMN approver ENUM('admin','class_teacher','department_head') NOT NULL DEFAULT 'admin'");
  if (!(await LeaveType.count())) {
    // the allowances used to be settings; keep whatever the school had saved
    const saved = await Setting.findAll({ where: { key: ['leave.casualDays', 'leave.sickDays', 'leave.earnedDays'] } });
    const v = Object.fromEntries(saved.map((r) => [r.key, JSON.parse(r.value)]));
    await LeaveType.bulkCreate([
      { name: 'Casual', appliesTo: 'staff', yearlyDays: v['leave.casualDays'] ?? 12 },
      { name: 'Sick', appliesTo: 'both', yearlyDays: null, approver: 'class_teacher' },
      { name: 'Earned', appliesTo: 'staff', yearlyDays: v['leave.earnedDays'] ?? 15 },
      { name: 'Unpaid', appliesTo: 'staff', yearlyDays: null, paid: false },
      { name: 'Family function', appliesTo: 'student', yearlyDays: null, approver: 'class_teacher' },
    ]);
    const sick = await LeaveType.findOne({ where: { name: 'Sick' } });
    if (v['leave.sickDays'] !== undefined) await sick.update({ yearlyDays: v['leave.sickDays'] });
  }
  await sequelize.query('UPDATE leave_requests lr JOIN leave_types lt ON LOWER(lt.name) = LOWER(lr.type) SET lr.leave_type_id = lt.id WHERE lr.leave_type_id IS NULL');
}

/** Creates missing tables (never alters existing ones) and seeds the first admin. */
/** Student and staff uploads used to live in the upload folder, which a database backup does not cover. Copy them into their rows. */
async function ensureFilesInDatabase() {
  const { moveFilesToDatabase } = await import('../modules/files/files.service.js');
  const { StudentFile, StaffFile } = await import('../models/index.js');
  const { moved, missing } = await moveFilesToDatabase([StudentFile, StaffFile]);
  if (moved || missing) console.log(`Files moved into the database: ${moved}${missing ? `; ${missing} could not be found on disk` : ''}`);
}

/** The mobile app's menu lives in the database; add any default tile or page the table does not have yet. */
async function ensureAppMenuItems() {
  const { ensureAppMenu } = await import('../modules/appmenu/appmenu.service.js');
  const added = await ensureAppMenu();
  if (added) console.log(`App menu: added ${added} item(s)`);
}

export async function migrateDatabase() {
  await ensureDatabase();
  await sequelize.sync();
  await ensureUserRoles();
  await ensureAdmissionStatuses();
  await ensureColumns();
  await ensureFilesInDatabase();
  await ensureAppMenuItems();
  await ensureLeaveTypes();
  await enforceRelationships();
  await seedAdmin();
  await seedMasters();
}
