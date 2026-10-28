import {
  Admission, Book, Fee, InventoryItem, Payment, SchoolClass, Staff, Student, sequelize,
} from '../../models/index.js';
import { QueryTypes } from 'sequelize';
import { badRequest } from '../../utils/httpError.js';
import { parseCsv, toCsv } from '../../utils/csv.js';
import { DETAIL_KEYS } from '../academics/studentFields.js';
import { validateStudent } from '../academics/students.validation.js';
import { getLmsFile, restoreLmsFile } from '../academics/lmsFiles.service.js';

const MAX_IMPORT_ROWS = 2000;

/* ---------- Exports ---------- */

const col = (...keys) => keys.map((k) => (Array.isArray(k) ? { key: k[0], label: k[1] } : { key: k, label: k }));
const cls = (c) => (c ? `${c.name}-${c.section}` : '');

export const EXPORTS = {
  students: {
    label: 'Students',
    columns: col('admissionNo', 'rollNo', 'firstName', 'middleName', 'lastName', 'dob', 'gender', 'admissionDate', 'class', 'fatherName', 'fatherPhone', 'motherName', 'motherPhone', 'guardianName', 'guardianPhone', 'guardianEmail', 'email', 'phone', 'address', 'city', 'state', 'pincode', 'nationality', 'religion', 'category', 'previousSchool', 'status'),
    rows: async () => (await Student.findAll({ include: [SchoolClass], order: [['admissionNo', 'ASC']] })).map((s) => ({ ...s.toJSON(), class: cls(s.SchoolClass) })),
  },
  staff: {
    label: 'Staff',
    columns: col('staffNo', 'firstName', 'middleName', 'lastName', 'gender', 'designation', 'phone', 'email', 'joinDate', 'qualification', 'experienceYears', 'employmentType', 'status'),
    rows: async () => (await Staff.findAll({ order: [['staffNo', 'ASC']] })).map((s) => s.toJSON()),
  },
  fees: {
    label: 'Fees',
    columns: col('admissionNo', 'student', 'title', 'amount', 'paidAmount', 'balance', 'dueDate'),
    rows: async () => (await Fee.findAll({ include: [Student], order: [['id', 'ASC']] })).map((f) => ({
      ...f.toJSON(), admissionNo: f.Student.admissionNo, student: `${f.Student.firstName} ${f.Student.lastName}`,
      balance: (Math.round(Number(f.amount) * 100) - Math.round(Number(f.paidAmount) * 100)) / 100,
    })),
  },
  payments: {
    label: 'Payments',
    columns: col('receiptNo', 'paidOn', 'admissionNo', 'student', 'title', 'amount', 'method'),
    rows: async () => (await Payment.findAll({ include: [{ model: Fee, include: [Student] }], order: [['id', 'ASC']] })).map((p) => ({
      ...p.toJSON(), admissionNo: p.Fee.Student.admissionNo, student: `${p.Fee.Student.firstName} ${p.Fee.Student.lastName}`, title: p.Fee.title,
    })),
  },
  books: {
    label: 'Library books',
    columns: col('title', 'author', 'isbn', 'copies', 'available'),
    rows: async () => (await Book.findAll({ order: [['title', 'ASC']] })).map((b) => b.toJSON()),
  },
  inventory: {
    label: 'Inventory items',
    columns: col('name', 'unit', 'quantity', 'reorderLevel'),
    rows: async () => (await InventoryItem.findAll({ order: [['name', 'ASC']] })).map((i) => i.toJSON()),
  },
  admissions: {
    label: 'Admission applicants',
    columns: col('applicantName', 'dob', 'gender', 'guardianName', 'guardianPhone', 'class', 'status', 'source'),
    rows: async () => (await Admission.findAll({ include: [SchoolClass], order: [['id', 'ASC']], paranoid: false })).map((a) => ({ ...a.toJSON(), class: cls(a.SchoolClass) })),
  },
};

export const exportList = () => Object.entries(EXPORTS).map(([key, e]) => ({ key, label: e.label }));

export async function exportCsv(key) {
  const dataset = EXPORTS[key];
  if (!dataset) throw badRequest('Unknown dataset');
  return toCsv(dataset.columns, await dataset.rows());
}

/* ---------- Custom reports ---------- */

const REPORT_LIMIT = 5000;
const OPS = ['contains', 'equals', 'not_equals', 'greater', 'less', 'empty', 'not_empty'];

export const datasetColumns = () => Object.entries(EXPORTS).map(([key, e]) => ({ key, label: e.label, columns: e.columns.map((c) => c.key) }));

const numeric = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v));
function matches(value, { op, value: wanted }) {
  const text = value === null || value === undefined ? '' : String(value);
  const w = String(wanted ?? '');
  switch (op) {
    case 'contains': return text.toLowerCase().includes(w.toLowerCase());
    case 'equals': return text.toLowerCase() === w.toLowerCase();
    case 'not_equals': return text.toLowerCase() !== w.toLowerCase();
    case 'greater': return numeric(text) && numeric(w) ? Number(text) > Number(w) : text > w;
    case 'less': return numeric(text) && numeric(w) ? Number(text) < Number(w) : text !== '' && text < w;
    case 'empty': return text === '';
    case 'not_empty': return text !== '';
    default: return false;
  }
}

/** A saved-nowhere, run-on-demand report: choose a dataset, the columns to show, filters and a sort. */
export async function runReport({ dataset, columns, filters = [], sortBy, sortDir }) {
  const source = EXPORTS[dataset];
  if (!source) throw badRequest('Choose a dataset');
  const allowed = new Set(source.columns.map((c) => c.key));
  const shown = (columns?.length ? columns : source.columns.map((c) => c.key));
  if (shown.some((c) => !allowed.has(c))) throw badRequest('Unknown column');
  if (!Array.isArray(filters) || filters.length > 10) throw badRequest('Use at most 10 filters');
  for (const f of filters) {
    if (!allowed.has(f.column)) throw badRequest('Unknown filter column');
    if (!OPS.includes(f.op)) throw badRequest('Unknown filter type');
  }
  if (sortBy && !allowed.has(sortBy)) throw badRequest('Unknown sort column');

  let rows = (await source.rows()).filter((row) => filters.every((f) => matches(row[f.column], f)));
  if (sortBy) {
    const dir = sortDir === 'desc' ? -1 : 1;
    rows = rows.sort((a, b) => {
      const x = a[sortBy] ?? ''; const y = b[sortBy] ?? '';
      return (numeric(x) && numeric(y) ? Number(x) - Number(y) : String(x).localeCompare(String(y))) * dir;
    });
  }
  const total = rows.length;
  return {
    columns: shown, total, truncated: total > REPORT_LIMIT,
    rows: rows.slice(0, REPORT_LIMIT).map((r) => Object.fromEntries(shown.map((c) => [c, r[c] instanceof Date ? r[c].toISOString().slice(0, 10) : r[c] ?? '']))),
  };
}

export async function reportCsv(request) {
  const result = await runReport(request);
  return toCsv(result.columns.map((c) => ({ key: c, label: c })), result.rows);
}

/* ---------- Student import ---------- */

const HEADERS = ['admissionNo', 'firstName', 'lastName', 'dob', 'gender', 'guardianName', 'guardianPhone', 'class', 'status', ...DETAIL_KEYS];
export const IMPORT_TEMPLATE = toCsv(HEADERS.map((h) => ({ key: h, label: h })), [
  { admissionNo: 'ADM-2026-0100', firstName: 'Asha', lastName: 'Verma', dob: '2015-04-12', gender: 'female', guardianName: 'Rohit Verma', guardianPhone: '+919876543210', class: '5-A', status: 'active' },
]);

const validDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());

/**
 * Checks every row without writing anything. Returns the parsed rows with their problems, so a person can fix the
 * file and try again; commit only happens when there are no problems at all.
 */
export async function checkStudentCsv(text) {
  const table = parseCsv(text);
  if (table.length < 2) throw badRequest('The file has no student rows');
  const header = table[0].map((h) => h.trim());
  const missing = ['admissionNo', 'firstName', 'lastName'].filter((h) => !header.includes(h));
  if (missing.length) throw badRequest(`Missing column(s): ${missing.join(', ')}. Download the template for the expected layout.`);
  const unknown = header.filter((h) => h && !HEADERS.includes(h));
  if (unknown.length) throw badRequest(`Unknown column(s): ${unknown.join(', ')}`);
  if (table.length - 1 > MAX_IMPORT_ROWS) throw badRequest(`Import at most ${MAX_IMPORT_ROWS} students at a time`);

  const classes = await SchoolClass.findAll();
  const classByLabel = new Map(classes.map((c) => [cls(c).toLowerCase(), c.id]));
  const existing = new Set((await Student.findAll({ attributes: ['admissionNo'] })).map((s) => s.admissionNo.toLowerCase()));
  const seen = new Set();

  const rows = await Promise.all(table.slice(1).map(async (cells, index) => {
    const raw = Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()]));
    const problems = [];
    if (!raw.admissionNo) problems.push('Admission no is required');
    else if (raw.admissionNo.length > 30) problems.push('Admission no is too long');
    else if (existing.has(raw.admissionNo.toLowerCase())) problems.push('Admission no already exists');
    else if (seen.has(raw.admissionNo.toLowerCase())) problems.push('Admission no is repeated in this file');
    seen.add(raw.admissionNo.toLowerCase());
    if (!raw.firstName) problems.push('First name is required');
    if (!raw.lastName) problems.push('Last name is required');
    if (raw.dob && !validDate(raw.dob)) problems.push('Date of birth must look like 2015-04-12');
    else if (raw.dob && new Date(raw.dob) > new Date()) problems.push('Date of birth is in the future');
    if (raw.gender && !['male', 'female', 'other'].includes(raw.gender.toLowerCase())) problems.push('Gender must be male, female or other');
    if (raw.status && !['active', 'inactive'].includes(raw.status.toLowerCase())) problems.push('Status must be active or inactive');
    if (raw.guardianPhone && !/^[0-9+\-\s()]{7,20}$/.test(raw.guardianPhone)) problems.push('Guardian phone is invalid');
    let classId = null;
    if (raw.class) {
      classId = classByLabel.get(raw.class.toLowerCase()) ?? null;
      if (!classId) problems.push(`Class "${raw.class}" does not exist (use the form 5-A)`);
    }
    // The registration details follow the same rules as the student form.
    const details = Object.fromEntries(DETAIL_KEYS.filter((k) => header.includes(k)).map((k) => [k, raw[k] || null]));
    problems.push(...(await validateStudent(details, { partial: true })));
    return {
      line: index + 2, problems,
      student: {
        admissionNo: raw.admissionNo, firstName: raw.firstName, lastName: raw.lastName, dob: raw.dob || null, gender: raw.gender ? raw.gender.toLowerCase() : null,
        guardianName: raw.guardianName || null, guardianPhone: raw.guardianPhone || null, classId, status: raw.status ? raw.status.toLowerCase() : 'active',
        ...details,
      },
    };
  }));
  return { rows, errors: rows.filter((r) => r.problems.length).length, className: (id) => classes.find((c) => c.id === id) && cls(classes.find((c) => c.id === id)) };
}

export async function previewStudentCsv(text) {
  const { rows, errors, className } = await checkStudentCsv(text);
  return {
    total: rows.length, errors,
    rows: rows.slice(0, 200).map((r) => ({ line: r.line, problems: r.problems, ...r.student, class: className(r.student.classId) ?? '' })),
  };
}

/** Imports all rows or none. Imported students are not billed any fees: bill them from Fees or Fee Groups. */
export async function importStudentCsv(text) {
  const { rows, errors } = await checkStudentCsv(text);
  if (errors) throw badRequest(`${errors} row(s) have problems. Fix them and upload again; nothing was imported.`);
  await sequelize.transaction(async (transaction) => { await Student.bulkCreate(rows.map((r) => r.student), { transaction }); });
  return { imported: rows.length };
}

/* ---------- Backup and restore ---------- */

const FORMAT = 'school-erp-backup';
const VERSION = 2;
const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

const tables = () => Object.values(sequelize.models).map((m) => m.getTableName()).map((t) => (typeof t === 'string' ? t : t.tableName)).sort();

/** Every table's rows as plain data. Dates are written as MySQL expects them (UTC), so a restore reads them back unchanged. */
export async function createBackup() {
  const queryInterface = sequelize.getQueryInterface();
  const data = {};
  for (const table of tables()) {
    const description = await queryInterface.describeTable(table);
    const rows = await sequelize.query(`SELECT * FROM \`${table}\``, { type: QueryTypes.SELECT });
    data[table] = rows.map((row) => Object.fromEntries(Object.entries(row).map(([column, value]) => {
      if (value instanceof Date) {
        const type = String(description[column]?.type ?? '').toUpperCase();
        return [column, type.startsWith('DATE') && !type.startsWith('DATETIME') ? value.toISOString().slice(0, 10) : stamp(value)];
      }
      return [column, value];
    })));
  }
  const lmsFiles = {};
  for (const table of ['lms_lessons', 'lms_lesson_parts', 'lms_materials', 'lms_submissions']) {
    for (const row of data[table] ?? []) if (row.attachment_key) lmsFiles[row.attachment_key] = (await getLmsFile(row.attachment_key)).toString('base64');
  }
  return { format: FORMAT, version: VERSION, createdAt: new Date().toISOString(), tables: data, files: { lms: lmsFiles } };
}

export const backupSummary = async () => {
  const counts = {};
  for (const table of tables()) counts[table] = Number((await sequelize.query(`SELECT COUNT(*) AS n FROM \`${table}\``, { type: QueryTypes.SELECT }))[0].n);
  return { tables: Object.keys(counts).length, rows: Object.values(counts).reduce((a, b) => a + b, 0), counts };
};

/**
 * Replaces ALL data with the backup, in one transaction: if anything fails the database is left as it was.
 * Only tables that exist are accepted and column names are checked against the live schema, so a damaged or
 * foreign file cannot write anywhere unexpected. LMS resources are included by opaque storage key; the remaining platform files are in table data.
 */
export async function restoreBackup(text) {
  let backup;
  try { backup = JSON.parse(text); } catch { throw badRequest('That is not a valid backup file'); }
  if (backup?.format !== FORMAT || ![1, VERSION].includes(backup.version) || typeof backup.tables !== 'object') throw badRequest('That is not a School ERP backup file');

  const known = new Set(tables());
  const queryInterface = sequelize.getQueryInterface();
  const columns = {};
  for (const [table, rows] of Object.entries(backup.tables)) {
    if (!known.has(table)) throw badRequest(`The backup contains a table this system does not have: ${table}`);
    if (!Array.isArray(rows)) throw badRequest(`Table ${table} is damaged`);
    columns[table] = new Set(Object.keys(await queryInterface.describeTable(table)));
    for (const row of rows) {
      const bad = Object.keys(row).find((c) => !columns[table].has(c));
      if (bad) throw badRequest(`Table ${table} has an unknown column "${bad}": the backup is from a different version`);
    }
  }
  if (!backup.tables.users?.length) throw badRequest('The backup has no user accounts, so nobody could sign in afterwards');

  const lmsFiles = backup.version >= 2 ? backup.files?.lms ?? {} : {};
  if (!lmsFiles || typeof lmsFiles !== 'object' || Array.isArray(lmsFiles)) throw badRequest('The LMS file archive is damaged');
  for (const [key, encoded] of Object.entries(lmsFiles)) if (!/^[a-f0-9]{64}$/.test(key) || typeof encoded !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw badRequest('The LMS file archive contains an invalid file');
  for (const table of ['lms_lessons', 'lms_lesson_parts', 'lms_materials', 'lms_submissions']) for (const row of backup.tables[table] ?? []) {
    if (row.attachment_key && !lmsFiles[row.attachment_key]) throw badRequest(`The LMS file ${row.attachment_key} is missing from the backup archive`);
  }

  for (const [key, encoded] of Object.entries(lmsFiles)) await restoreLmsFile(key, Buffer.from(encoded, 'base64'));

  let restored = 0;
  await sequelize.transaction(async (transaction) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    try {
      for (const table of known) await sequelize.query(`DELETE FROM \`${table}\``, { transaction });
      for (const [table, rows] of Object.entries(backup.tables)) {
        for (let i = 0; i < rows.length; i += 500) await queryInterface.bulkInsert(table, rows.slice(i, i + 500), { transaction });
        restored += rows.length;
      }
    } finally {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    }
  });
  return { tables: Object.keys(backup.tables).length, rows: restored, backupCreatedAt: backup.createdAt };
}
