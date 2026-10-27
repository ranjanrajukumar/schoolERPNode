import {
  ClassSubject, Department, Designation, FeeStructure, FeeType, Book, LibraryCategory, SchoolClass, Staff, Student, Subject, sequelize,
} from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';
import { parseCsv, toCsv } from '../../utils/csv.js';
import { problems as staffProblems } from '../hr/staff.routes.js';
import { IMPORT_TEMPLATE, importStudentCsv, previewStudentCsv } from './data.service.js';

const MAX_ROWS = 2000;
const SHOWN = 300;
const blank = (v) => v === undefined || v === null || v === '';
const key = (v) => String(v ?? '').trim().toLowerCase();
const classLabel = (c) => `${c.name}-${c.section}`;

/**
 * One importer per kind of data a school brings on a spreadsheet. A file is read, checked row by row (nothing is written),
 * and only when every row is fine is the whole file imported in one transaction. A row that is already in the system is
 * reported as "exists" and left alone, so a corrected file can be uploaded again without duplicating anything.
 *
 * Each importer: { label, note, order, link, columns[{key,label,required,example,help}], count(), prepare(), check(raw, ctx) -> { problems, summary, exists?, record }, save(records, tx) }
 */
const col = (k, label, example, extra = {}) => ({ key: k, label, example, ...extra });

export const IMPORTERS = {
  classes: {
    label: 'Classes and sections', order: 1, link: '/classes',
    note: 'Import staff first if you want to name class teachers here; otherwise set them on the Classes page later.',
    columns: [col('name', 'Class', '5', { required: true }), col('section', 'Section', 'A', { help: 'Blank means A' }), col('classTeacher', 'Class teacher (staff no)', 'STF-2026-0001')],
    count: () => SchoolClass.count(),
    prepare: async () => ({
      classes: new Set((await SchoolClass.findAll()).map((c) => key(classLabel(c)))),
      staff: new Map((await Staff.findAll({ where: { status: 'active' }, attributes: ['id', 'staffNo'] })).map((s) => [key(s.staffNo), s.id])),
      seen: new Set(),
    }),
    check(raw, ctx) {
      const problems = [];
      const name = raw.name.trim(); const section = raw.section.trim() || 'A';
      if (!name) problems.push('Class is required'); else if (name.length > 50) problems.push('Class name is too long');
      if (section.length > 10) problems.push('Section is too long');
      const label = `${name}-${section}`;
      let classTeacherId = null;
      if (raw.classTeacher.trim()) {
        classTeacherId = ctx.staff.get(key(raw.classTeacher)) ?? null;
        if (!classTeacherId) problems.push(`Staff no "${raw.classTeacher}" is not an active staff member`);
      }
      const dup = ctx.seen.has(key(label)); ctx.seen.add(key(label));
      if (dup) problems.push('Repeated in this file');
      return { problems, summary: label, exists: ctx.classes.has(key(label)), record: { name, section, classTeacherId } };
    },
    save: (records, transaction) => SchoolClass.bulkCreate(records, { transaction }),
  },

  subjects: {
    label: 'Subjects', order: 2, link: '/subjects', note: 'The code must be unique, e.g. MATH, ENG, SCI.',
    columns: [col('name', 'Subject name', 'Mathematics', { required: true }), col('code', 'Code', 'MATH', { required: true })],
    count: () => Subject.count(),
    prepare: async () => ({ codes: new Set((await Subject.findAll()).map((s) => key(s.code))), seen: new Set() }),
    check(raw, ctx) {
      const problems = [];
      const name = raw.name.trim(); const code = raw.code.trim();
      if (!name) problems.push('Subject name is required'); else if (name.length > 80) problems.push('Subject name is too long');
      if (!code) problems.push('Code is required'); else if (code.length > 20) problems.push('Code is too long');
      const dup = ctx.seen.has(key(code)); ctx.seen.add(key(code));
      if (dup) problems.push('Code is repeated in this file');
      return { problems, summary: `${name} (${code})`, exists: ctx.codes.has(key(code)), record: { name, code } };
    },
    save: (records, transaction) => Subject.bulkCreate(records, { transaction }),
  },

  departments: {
    label: 'Departments', order: 3, link: '/departments', note: 'Used when registering staff and openings.',
    columns: [col('name', 'Department', 'Science', { required: true })],
    count: () => Department.count(),
    prepare: async () => ({ names: new Set((await Department.findAll()).map((d) => key(d.name))), seen: new Set() }),
    check: (raw, ctx) => simpleName(raw, ctx, 80, 'Department'),
    save: (records, transaction) => Department.bulkCreate(records, { transaction }),
  },
  designations: {
    label: 'Designations', order: 4, link: '/designations', note: 'Teacher, Clerk, Principal and so on.',
    columns: [col('name', 'Designation', 'Teacher', { required: true })],
    count: () => Designation.count(),
    prepare: async () => ({ names: new Set((await Designation.findAll()).map((d) => key(d.name))), seen: new Set() }),
    check: (raw, ctx) => simpleName(raw, ctx, 80, 'Designation'),
    save: (records, transaction) => Designation.bulkCreate(records, { transaction }),
  },

  staff: {
    label: 'Staff', order: 5, link: '/staff?new=1',
    note: 'A teacher\'s email here must equal their login email for marks entry. Blank staff numbers are generated. Import departments first.',
    columns: [
      col('staffNo', 'Staff no', 'STF-2026-0001', { help: 'Blank = generated' }), col('firstName', 'First name', 'Meera', { required: true }), col('middleName', 'Middle name', ''),
      col('lastName', 'Last name', 'Joshi', { required: true }), col('gender', 'Gender', 'female', { help: 'male, female or other' }), col('dob', 'Date of birth', '1988-06-14'),
      col('designation', 'Designation', 'Teacher'), col('department', 'Department', 'Science', { help: 'Must exist' }), col('phone', 'Phone', '+919800000001'),
      col('email', 'Email', 'meera@school.edu.in'), col('joinDate', 'Joining date', '2020-06-01'), col('qualification', 'Qualification', 'M.Sc, B.Ed'),
      col('experienceYears', 'Years of experience', '8'), col('employmentType', 'Employment type', 'permanent', { help: 'permanent, contract, part_time, visiting' }),
      col('address', 'Address', ''), col('city', 'City', 'Pune'), col('state', 'State', 'Maharashtra'), col('pincode', 'PIN', '411001'),
    ],
    count: () => Staff.count(),
    prepare: async () => {
      const all = await Staff.findAll({ attributes: ['staffNo', 'email'] });
      return {
        numbers: new Set(all.map((s) => key(s.staffNo))), emails: new Set(all.filter((s) => s.email).map((s) => key(s.email))),
        departments: new Map((await Department.findAll()).map((d) => [key(d.name), d.id])), seenNo: new Set(), seenEmail: new Set(),
      };
    },
    check(raw, ctx) {
      const r = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.trim()]));
      const body = {
        ...r, gender: key(r.gender) || '', employmentType: key(r.employmentType).replace(/[\s-]+/g, '_') || '', status: 'active',
      };
      if (!body.gender) delete body.gender;
      if (!body.employmentType) delete body.employmentType;
      const problems = staffProblems({ ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== '')) });
      let departmentId = null;
      if (r.department) {
        departmentId = ctx.departments.get(key(r.department)) ?? null;
        if (!departmentId) problems.push(`Department "${r.department}" does not exist: import departments first`);
      }
      for (const [k, seen, label] of [['staffNo', ctx.seenNo, 'Staff no'], ['email', ctx.seenEmail, 'Email']]) {
        if (r[k]) { if (seen.has(key(r[k]))) problems.push(`${label} is repeated in this file`); seen.add(key(r[k])); }
      }
      const exists = (r.staffNo && ctx.numbers.has(key(r.staffNo))) || (r.email && ctx.emails.has(key(r.email)));
      const record = Object.fromEntries(Object.entries({ ...body, departmentId }).map(([k, v]) => [k, v === '' ? null : v]));
      delete record.department;
      return { problems, summary: `${r.firstName} ${r.lastName}${r.designation ? ` (${r.designation})` : ''}`, exists: Boolean(exists), record };
    },
    async save(records, transaction) {
      const taken = new Set((await Staff.findAll({ attributes: ['staffNo'], transaction })).map((s) => key(s.staffNo)));
      let n = ((await Staff.max('id', { transaction })) || 0) + 1;
      for (const record of records) {
        if (!record.staffNo) {
          let candidate;
          do { candidate = `STF-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`; n += 1; } while (taken.has(key(candidate)));
          record.staffNo = candidate;
        }
        taken.add(key(record.staffNo));
        await Staff.create(record, { transaction });
      }
    },
  },

  curriculum: {
    label: 'Subjects and teachers for each class', order: 6, link: '/class-subjects',
    note: 'Import classes, subjects and staff first. This decides who may enter marks for each subject.',
    columns: [col('class', 'Class (e.g. 5-A)', '5-A', { required: true }), col('subject', 'Subject (code or name)', 'MATH', { required: true }), col('teacher', 'Teacher (staff no)', 'STF-2026-0001')],
    count: () => ClassSubject.count(),
    prepare: async () => ({
      classes: new Map((await SchoolClass.findAll()).map((c) => [key(classLabel(c)), c.id])),
      subjects: (await Subject.findAll()).flatMap((s) => [[key(s.code), s.id], [key(s.name), s.id]]).reduce((m, [k, v]) => m.set(k, m.get(k) ?? v), new Map()),
      staff: new Map((await Staff.findAll({ where: { status: 'active' }, attributes: ['id', 'staffNo'] })).map((s) => [key(s.staffNo), s.id])),
      pairs: new Set((await ClassSubject.findAll()).map((p) => `${p.classId}:${p.subjectId}`)), seen: new Set(),
    }),
    check(raw, ctx) {
      const problems = [];
      const classId = ctx.classes.get(key(raw.class));
      const subjectId = ctx.subjects.get(key(raw.subject));
      if (!classId) problems.push(`Class "${raw.class}" does not exist (write it like 5-A)`);
      if (!subjectId) problems.push(`Subject "${raw.subject}" does not exist`);
      let staffId = null;
      if (raw.teacher.trim()) { staffId = ctx.staff.get(key(raw.teacher)) ?? null; if (!staffId) problems.push(`Staff no "${raw.teacher}" is not an active staff member`); }
      const pair = `${classId}:${subjectId}`;
      if (classId && subjectId) { if (ctx.seen.has(pair)) problems.push('This class and subject are repeated in this file'); ctx.seen.add(pair); }
      return { problems, summary: `${raw.class} · ${raw.subject}${raw.teacher.trim() ? ` · ${raw.teacher}` : ''}`, exists: ctx.pairs.has(pair), record: { classId, subjectId, staffId } };
    },
    save: (records, transaction) => ClassSubject.bulkCreate(records, { transaction }),
  },

  feetypes: {
    label: 'Fee types', order: 7, link: '/fee-types', note: 'Tuition, Transport, Exam fee, …',
    columns: [col('name', 'Fee type', 'Tuition', { required: true }), col('description', 'Description', 'Monthly tuition')],
    count: () => FeeType.count(),
    prepare: async () => ({ names: new Set((await FeeType.findAll()).map((f) => key(f.name))), seen: new Set() }),
    check(raw, ctx) {
      const out = simpleName(raw, ctx, 80, 'Fee type');
      const description = raw.description.trim();
      if (description.length > 255) out.problems.push('Description is too long');
      out.record.description = description || null;
      return out;
    },
    save: (records, transaction) => FeeType.bulkCreate(records, { transaction }),
  },

  feestructure: {
    label: 'Fee structure for each class', order: 8, link: '/fee-structures',
    note: 'What every student of a class is billed. Import classes first. Amounts must be above zero.',
    columns: [col('class', 'Class (e.g. 5-A)', '5-A', { required: true }), col('title', 'Fee item', 'Tuition 2026-27', { required: true }), col('amount', 'Amount', '12000', { required: true }), col('dueDate', 'Due date', '2026-07-10')],
    count: () => FeeStructure.count(),
    prepare: async () => ({
      classes: new Map((await SchoolClass.findAll()).map((c) => [key(classLabel(c)), c.id])),
      items: new Set((await FeeStructure.findAll()).map((f) => `${f.classId}:${key(f.title)}`)), seen: new Set(),
    }),
    check(raw, ctx) {
      const problems = [];
      const classId = ctx.classes.get(key(raw.class));
      if (!classId) problems.push(`Class "${raw.class}" does not exist (write it like 5-A)`);
      const title = raw.title.trim();
      if (!title) problems.push('Fee item is required'); else if (title.length > 120) problems.push('Fee item is too long');
      const amount = Number(raw.amount);
      if (!(amount > 0) || !Number.isFinite(amount)) problems.push('Amount must be a number above zero');
      const due = raw.dueDate.trim();
      if (due && !(/^\d{4}-\d{2}-\d{2}$/.test(due) && !Number.isNaN(new Date(due).getTime()))) problems.push('Due date must look like 2026-07-10');
      const id = `${classId}:${key(title)}`;
      if (classId && title) { if (ctx.seen.has(id)) problems.push('This class and fee item are repeated in this file'); ctx.seen.add(id); }
      return { problems, summary: `${raw.class} · ${title} · ${raw.amount}`, exists: ctx.items.has(id), record: { classId, title, amount, dueDate: due || null } };
    },
    save: (records, transaction) => FeeStructure.bulkCreate(records, { transaction }),
  },

  books: {
    label: 'Library books', order: 9, link: '/library',
    note: 'A new category name is created automatically. A book with an ISBN already in the library is left alone.',
    columns: [col('title', 'Title', 'Wings of Fire', { required: true }), col('author', 'Author', 'A. P. J. Abdul Kalam'), col('isbn', 'ISBN', '9788173711466'),
      col('copies', 'Copies', '3', { help: 'Blank means 1' }), col('category', 'Category', 'Biography')],
    count: () => Book.count(),
    prepare: async () => ({
      isbns: new Set((await Book.findAll({ where: {}, attributes: ['isbn'] })).filter((b) => b.isbn).map((b) => key(b.isbn))),
      titles: new Set((await Book.findAll({ attributes: ['title', 'author'] })).map((b) => `${key(b.title)}|${key(b.author)}`)), seen: new Set(),
    }),
    check(raw, ctx) {
      const problems = [];
      const title = raw.title.trim(); const author = raw.author.trim(); const isbn = raw.isbn.trim();
      if (!title) problems.push('Title is required'); else if (title.length > 200) problems.push('Title is too long');
      if (author.length > 120) problems.push('Author is too long');
      if (isbn.length > 30) problems.push('ISBN is too long');
      const copies = raw.copies.trim() === '' ? 1 : Number(raw.copies);
      if (!Number.isInteger(copies) || copies < 0) problems.push('Copies must be a whole number');
      const id = isbn ? `i:${key(isbn)}` : `t:${key(title)}|${key(author)}`;
      if (ctx.seen.has(id)) problems.push(isbn ? 'ISBN is repeated in this file' : 'This book is repeated in this file'); ctx.seen.add(id);
      const exists = isbn ? ctx.isbns.has(key(isbn)) : ctx.titles.has(`${key(title)}|${key(author)}`);
      return { problems, summary: `${title}${author ? ` — ${author}` : ''} × ${copies}`, exists, record: { title, author: author || null, isbn: isbn || null, copies, category: raw.category.trim() || null } };
    },
    async save(records, transaction) {
      const categories = new Map((await LibraryCategory.findAll({ transaction })).map((c) => [key(c.name), c.id]));
      for (const record of records) {
        const { category, ...book } = record;
        let categoryId = null;
        if (category) {
          if (!categories.has(key(category))) categories.set(key(category), (await LibraryCategory.create({ name: category }, { transaction })).id);
          categoryId = categories.get(key(category));
        }
        await Book.create({ ...book, available: book.copies, categoryId }, { transaction });
      }
    },
  },

  // Students have their own rules (class lookup, registration details); this adapts them to the same preview shape.
  students: {
    label: 'Students', order: 10, link: '/students?new=1', custom: true,
    note: 'Classes must exist first. Only admission number, first and last name are required; the template also lists the optional registration columns.',
    columns: [col('admissionNo', 'Admission no', 'ADM-2026-0100', { required: true }), col('firstName', 'First name', 'Asha', { required: true }), col('lastName', 'Last name', 'Verma', { required: true }),
      col('dob', 'Date of birth', '2015-04-12'), col('gender', 'Gender', 'female'), col('guardianName', 'Guardian', 'Rohit Verma'), col('guardianPhone', 'Guardian phone', '+919876543210'),
      col('class', 'Class (e.g. 5-A)', '5-A'), col('status', 'Status', 'active', { help: 'active or inactive' })],
    count: () => Student.count(),
    template: () => IMPORT_TEMPLATE,
    async preview(text) {
      const p = await previewStudentCsv(text);
      return {
        total: p.total, errorCount: p.errors, existingCount: 0, newCount: p.total - p.errors,
        rows: p.rows.map((r) => ({ line: r.line, status: r.problems.length ? 'error' : 'new', problems: r.problems, summary: `${r.admissionNo} · ${r.firstName} ${r.lastName}${r.class ? ` · ${r.class}` : ''}` })),
      };
    },
    run: async (text) => { const r = await importStudentCsv(text); return { imported: r.imported, skipped: 0 }; },
  },
};

function simpleName(raw, ctx, max, label) {
  const problems = [];
  const name = raw.name.trim();
  if (!name) problems.push(`${label} name is required`); else if (name.length > max) problems.push(`${label} name is too long`);
  const dup = ctx.seen.has(key(name)); ctx.seen.add(key(name));
  if (dup) problems.push('Repeated in this file');
  return { problems, summary: name, exists: ctx.names.has(key(name)), record: { name } };
}

export const importerList = async () => Promise.all(Object.entries(IMPORTERS).sort(([, a], [, b]) => a.order - b.order).map(async ([k, i]) => ({
  key: k, label: i.label, note: i.note, link: i.link, order: i.order, columns: i.columns, count: await i.count(),
})));

export const templateCsv = (k) => {
  const i = IMPORTERS[k];
  if (!i) throw badRequest('Unknown kind of data');
  if (i.template) return i.template();
  return toCsv(i.columns.map((c) => ({ key: c.key, label: c.key })), [Object.fromEntries(i.columns.map((c) => [c.key, c.example ?? '']))]);
};

/** Reads and checks a file. Returns the unified preview and, for generic importers, the new records to save. */
async function read(k, text) {
  const importer = IMPORTERS[k];
  const table = parseCsv(text);
  if (table.length < 2) throw badRequest('The file has no data rows');
  const header = table[0].map((h) => h.trim());
  const missing = importer.columns.filter((c) => c.required && !header.includes(c.key)).map((c) => c.key);
  if (missing.length) throw badRequest(`Missing column(s): ${missing.join(', ')}. Download the template for the expected layout.`);
  const unknown = header.filter((h) => h && !importer.columns.some((c) => c.key === h));
  if (unknown.length) throw badRequest(`Unknown column(s): ${unknown.join(', ')}`);
  if (table.length - 1 > MAX_ROWS) throw badRequest(`Import at most ${MAX_ROWS} rows at a time`);

  const ctx = await importer.prepare();
  const rows = table.slice(1).map((cells, i) => {
    const raw = Object.fromEntries(importer.columns.map((c) => [c.key, (cells[header.indexOf(c.key)] ?? '').trim()]));
    const out = importer.check(raw, ctx);
    return { line: i + 2, ...out, status: out.problems.length ? 'error' : out.exists ? 'exists' : 'new' };
  });
  return rows;
}

export async function previewImport(k, text) {
  const importer = IMPORTERS[k];
  if (!importer) throw badRequest('Unknown kind of data');
  if (importer.custom) return importer.preview(text);
  const rows = await read(k, text);
  const count = (s) => rows.filter((r) => r.status === s).length;
  return {
    total: rows.length, newCount: count('new'), existingCount: count('exists'), errorCount: count('error'),
    rows: rows.slice(0, SHOWN).map((r) => ({ line: r.line, status: r.status, problems: r.problems, summary: r.summary })),
  };
}

export async function runImport(k, text) {
  const importer = IMPORTERS[k];
  if (!importer) throw badRequest('Unknown kind of data');
  if (importer.custom) return importer.run(text);
  const rows = await read(k, text);
  const errors = rows.filter((r) => r.status === 'error').length;
  if (errors) throw badRequest(`${errors} row(s) have problems. Fix them and upload again; nothing was imported.`);
  const fresh = rows.filter((r) => r.status === 'new').map((r) => r.record);
  if (fresh.length) await sequelize.transaction((transaction) => importer.save(fresh, transaction));
  return { imported: fresh.length, skipped: rows.length - fresh.length };
}
