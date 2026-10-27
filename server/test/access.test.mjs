// Checks for custom roles, who can read which staff fields, student registration rules, and the restore guard.
// Same setup as smoke.test.mjs: run with the API up, signs in as the seeded admin, deletes everything it creates.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

const API = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@school.local', password: process.env.ADMIN_PASSWORD || 'admin123' };
const RUN = Date.now().toString(36);
const cleanups = [];

async function call(method, path, { token, body, raw } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(raw !== undefined ? { 'Content-Type': 'text/plain' } : body && { 'Content-Type': 'application/json' }) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

let admin;
const asAdmin = (method, path, opts = {}) => call(method, path, { token: admin, ...opts });

async function create(path, body, deletePath) {
  const { status, data } = await asAdmin('POST', path, { body });
  assert.equal(status, 201, `create ${path}: ${JSON.stringify(data)}`);
  cleanups.unshift(() => asAdmin('DELETE', `${deletePath ?? path}/${data.id}`));
  return data;
}

// Deleting an enquiry is a soft delete, so tests remove their own rows for good (delete, then purge).
async function dropEnquiry(id) {
  await asAdmin('DELETE', `/admissions/${id}`);
  await asAdmin('DELETE', `/admissions/${id}?permanent=1`);
}

// An enquiry only becomes "applied" by submitting the application form, which needs every required detail and document.
// Tests that need an applicant already under review set that state directly instead of repeating the whole form.
async function markApplied(id) {
  await import('../src/config/env.js');
  const { Admission } = await import('../src/models/index.js');
  await Admission.update({ status: 'applied' }, { where: { id } });
}

async function signIn(email, password) {
  const { status, data } = await call('POST', '/auth/login', { body: { email, password } });
  assert.equal(status, 200, `sign-in ${email}`);
  return data.token;
}

const PASSWORD = 'password-12345';
async function userWithRole(role, extra = {}) {
  const email = `${role}.${RUN}.${Math.random().toString(36).slice(2, 6)}@test.local`;
  const { id } = await create('/users', { name: `T ${role}`, email, password: PASSWORD, role, ...extra });
  return { id, token: await signIn(email, PASSWORD) };
}

before(async () => { admin = await signIn(ADMIN.email, ADMIN.password); });
after(async () => { for (const undo of cleanups) await undo().catch(() => {}); });

describe('custom roles', () => {
  test('a custom role is its base role narrowed to chosen modules, enforced by the server', async () => {
    const role = await create('/roles', { name: `Librarian ${RUN}`, baseRole: 'teacher', permissions: { library: 'write', students: 'read' } });
    assert.equal((await asAdmin('POST', '/roles', { body: { name: 'admin', baseRole: 'admin', permissions: { library: 'read' } } })).status, 400, 'built-in names are taken');
    assert.equal((await asAdmin('POST', '/roles', { body: { name: `Empty ${RUN}`, baseRole: 'teacher', permissions: {} } })).status, 400, 'needs at least one module');

    const user = await userWithRole('teacher', { roleId: role.id });
    // The user row stores the base role; the role id narrows it.
    const me = await call('GET', '/auth/me', { token: user.token });
    assert.equal(me.data.role, 'teacher');
    assert.equal(me.data.permissions.library, 'write');

    assert.equal((await call('GET', '/library/books', { token: user.token })).status, 200);
    const category = await call('POST', '/library/categories', { token: user.token, body: { name: `Cat ${RUN}` } });
    assert.equal(category.status, 201, 'library is granted for change');
    cleanups.unshift(() => asAdmin('DELETE', `/library/categories/${category.data.id}`));
    assert.equal((await call('GET', '/students', { token: user.token })).status, 200, 'students are granted for view');
    assert.equal((await call('POST', '/students', { token: user.token, body: { firstName: 'X', lastName: 'Y' } })).status, 403, 'view only means no writes');
    assert.equal((await call('GET', '/fees', { token: user.token })).status, 403, 'an area not granted is refused');
    assert.equal((await call('GET', '/exams', { token: user.token })).status, 403);
    assert.equal((await call('GET', '/users', { token: user.token })).status, 403, 'user management is never grantable');
    assert.equal((await call('GET', '/roles', { token: user.token })).status, 403);
    assert.equal((await call('POST', '/support', { token: user.token, body: { subject: `Help ${RUN}`, message: 'Test' } })).status, 201, 'support is open to every staff login');

    assert.equal((await asAdmin('DELETE', `/roles/${role.id}`)).status, 409, 'a role in use cannot be deleted');
    assert.equal((await asAdmin('PUT', `/roles/${role.id}`, { body: { name: `Librarian ${RUN}`, baseRole: 'accountant', permissions: { library: 'write' } } })).status, 409, 'base role is fixed while users hold it');
  });

  test('moving a user back to a built-in role removes the narrowing', async () => {
    const role = await create('/roles', { name: `Narrow ${RUN}`, baseRole: 'teacher', permissions: { library: 'read' } });
    const user = await userWithRole('teacher', { roleId: role.id });
    assert.equal((await call('GET', '/attendance', { token: user.token })).status, 403);
    assert.equal((await asAdmin('PUT', `/users/${user.id}`, { body: { role: 'teacher', roleId: null } })).status, 200);
    assert.notEqual((await call('GET', '/attendance', { token: user.token })).status, 403, 'plain teacher can read attendance again');
  });
});

describe('staff records', () => {
  test('identity and bank details are shown only to the roles that need them', async () => {
    const { id } = await create('/staff', { firstName: 'Test', lastName: `Staff${RUN}`, nationalId: '1234-5678-9012', bankAccountNo: '00112233445', ifsc: 'TEST0001', dob: '1990-01-01', qualification: 'M.Ed' });
    const teacher = await userWithRole('teacher');
    const accountant = await userWithRole('accountant');

    const asTeacher = (await call('GET', `/staff/${id}`, { token: teacher.token })).data;
    assert.equal(asTeacher.qualification, 'M.Ed');
    for (const key of ['nationalId', 'bankAccountNo', 'ifsc', 'dob']) assert.equal(key in asTeacher, false, `teacher must not see ${key}`);
    assert.equal('bankAccountNo' in (await call('GET', '/staff', { token: teacher.token })).data[0], false, 'the list is filtered too');

    const asAccountant = (await call('GET', `/staff/${id}`, { token: accountant.token })).data;
    assert.equal(asAccountant.bankAccountNo, '00112233445', 'payroll needs bank details');
    assert.equal('nationalId' in asAccountant, false);

    const asAdminView = (await asAdmin('GET', `/staff/${id}`)).data;
    assert.equal(asAdminView.nationalId, '1234-5678-9012');
    assert.equal((await call('POST', '/staff', { token: teacher.token, body: { firstName: 'a', lastName: 'b' } })).status, 403);
    assert.equal((await asAdmin('POST', '/staff', { body: { firstName: 'a', lastName: 'b', email: 'not-an-email' } })).status, 400);
    const auto = await create('/staff', { firstName: 'Auto', lastName: `Number${RUN}` }, '/staff');
    assert.ok(auto.id, 'a staff number is generated when none is given');
    assert.match((await asAdmin('GET', `/staff/${auto.id}`)).data.staffNo, /^STF-\d{4}-\d{4,}$/);
  });
});

describe('registrations', () => {
  test('a registration has an id and a status that can be filtered, counted and changed', async () => {
    const T = `Rg${RUN}`;
    const before = (await asAdmin('GET', '/students/registration-summary')).data;
    const a = await create('/students', { firstName: 'Reg', lastName: `${T}A`, guardianName: 'Parent A', registrationStatus: 'pending' });
    const b = await create('/students', { firstName: 'Reg', lastName: `${T}B`, registrationStatus: 'under_review' });
    const c = await create('/students', { firstName: 'Reg', lastName: `${T}C` });
    assert.equal((await asAdmin('POST', '/students', { body: { firstName: 'X', lastName: 'Y', registrationStatus: 'maybe' } })).status, 400);

    const mine = (await asAdmin('GET', `/students?q=${T}&page=1&pageSize=20`)).data.rows;
    assert.equal(mine.length, 3);
    const row = mine.find((r) => r.id === a.id);
    assert.match(row.registrationId, /^REG-\d{4}-\d{4,}$/);
    assert.equal(row.registrationStatus, 'pending');
    assert.equal(mine.find((r) => r.id === c.id).registrationStatus, 'complete', 'complete unless said otherwise');
    assert.equal((await asAdmin('GET', `/students?q=${T}&registrationStatus=under_review&page=1`)).data.rows.length, 1);
    assert.equal((await asAdmin('GET', `/students?q=${row.registrationId}&page=1`)).data.rows[0]?.id, a.id, 'the registration id can be searched');
    assert.equal((await asAdmin('GET', '/students?q=Parent%20A&page=1')).data.rows.some((r) => r.id === a.id), true, 'and the parent name');

    const after = (await asAdmin('GET', '/students/registration-summary')).data;
    // other suites add students at the same time, so total and complete can only be checked as "at least"
    assert.equal(after.total >= before.total + 3, true);
    assert.equal(after.pending, before.pending + 2);
    assert.equal(after.complete >= before.complete + 1, true);
    assert.equal((await asAdmin('PUT', `/students/${b.id}`, { body: { registrationStatus: 'complete' } })).status, 200);
    assert.equal((await asAdmin('GET', '/students/registration-summary')).data.pending, before.pending + 1);
  });
});

describe('student registration', () => {
  test('numbers are generated, same-name-same-birthday needs confirmation, fees are billed once', async () => {
    const cls = await create('/classes', { name: `Z${RUN}`.slice(0, 12), section: 'Q' });
    await create('/fee-structures', { classId: cls.id, title: `Tuition ${RUN}`, amount: '500', dueDate: '2031-01-01' });
    const body = { firstName: 'Dup', lastName: `Check${RUN}`, dob: '2014-03-03', classId: cls.id, billFees: true };

    const first = await asAdmin('POST', '/students', { body });
    assert.equal(first.status, 201);
    cleanups.unshift(() => asAdmin('DELETE', `/students/${first.data.id}`));
    assert.match(first.data.admissionNo, /^ADM-\d{4}-\d{4,}$/, 'a blank admission number is generated');
    assert.equal(first.data.feesBilled, 1);
    assert.equal((await asAdmin('GET', `/fees?studentId=${first.data.id}`)).data.length, 1);

    assert.equal((await asAdmin('POST', '/students', { body })).status, 409, 'a likely double entry is refused');
    const confirmed = await asAdmin('POST', '/students', { body: { ...body, billFees: false, allowDuplicate: true } });
    assert.equal(confirmed.status, 201, 'confirming registers them anyway');
    cleanups.unshift(() => asAdmin('DELETE', `/students/${confirmed.data.id}`));
    assert.notEqual(confirmed.data.admissionNo, first.data.admissionNo);

    assert.equal((await asAdmin('POST', '/students', { body: { firstName: 'A', lastName: 'B', email: 'bad' } })).status, 400, 'formats are checked');
    assert.equal((await asAdmin('POST', '/students', { body: { firstName: 'A', lastName: 'B', pincode: '!!' } })).status, 400);
  });
});

describe('restore', () => {
  test('refuses without confirmation and refuses files that are not backups, changing nothing', async () => {
    assert.equal((await asAdmin('POST', '/data/restore', { raw: '{}' })).status, 400, 'needs ?confirm=RESTORE');
    assert.equal((await asAdmin('POST', '/data/restore?confirm=RESTORE', { raw: 'not json' })).status, 400);
    assert.equal((await asAdmin('POST', '/data/restore?confirm=RESTORE', { raw: JSON.stringify({ format: 'other', version: 1, tables: {} }) })).status, 400);
    assert.equal((await asAdmin('POST', '/data/restore?confirm=RESTORE', { raw: JSON.stringify({ format: 'school-erp-backup', version: 1, tables: { not_a_table: [{ id: 1 }] } }) })).status, 400, 'unknown tables are refused');
    const teacher = await userWithRole('teacher');
    assert.equal((await call('POST', '/data/restore?confirm=RESTORE', { token: teacher.token, raw: '{}' })).status, 403, 'admin only');
    assert.equal((await call('GET', '/data/backup', { token: teacher.token })).status, 403);
  });
});

describe('enquiries', () => {
  test('tabs, search, filters and counts follow the follow-up and visit dates; planning is validated', async () => {
    const T = `Enq${RUN}`;
    const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const make = async (name, extra = {}) => {
      const r = await asAdmin('POST', '/admissions', { body: { applicantName: `${T} ${name}`, guardianName: `Parent ${name}`, guardianPhone: '+919800000000', ...extra } });
      assert.equal(r.status, 201, JSON.stringify(r.data));
      cleanups.unshift(() => dropEnquiry(r.data.id));
      return r.data.id;
    };
    const list = async (query) => (await asAdmin('GET', `/admissions/enquiries?pageSize=50&q=${T}&${query}`)).data;
    const names = (data) => data.rows.map((r) => r.applicantName.replace(`${T} `, '')).sort();

    const before = (await asAdmin('GET', '/admissions/enquiries/summary')).data;
    const due = await make('Due', { followUpOn: day(0) });
    const later = await make('Later', { followUpOn: day(5), visitOn: day(2), source: 'referral' });
    const plain = await make('Plain', { source: 'phone' });
    const applied = await make('Applied');
    await markApplied(applied);

    assert.deepEqual(names(await list('tab=all')), ['Applied', 'Due', 'Later', 'Plain']);
    assert.deepEqual(names(await list('tab=followup')), ['Due'], 'only a follow-up that has arrived needs follow-up');
    assert.deepEqual(names(await list('tab=new')), ['Later', 'Plain'], '"new" leaves out what is due and what has moved on');
    assert.deepEqual(names(await list('visit=1')), ['Later']);
    assert.deepEqual(names(await list('source=phone')), ['Plain']);
    assert.deepEqual(names(await list('stage=applied')), ['Applied']);
    assert.equal((await list('tab=converted')).total, 0);

    const row = (await list('tab=followup')).rows[0];
    assert.match(row.enquiryId, /^ENQ-\d{4}-\d{4,}$/);
    assert.equal(row.stageLabel, 'Follow-up');
    assert.equal(row.sourceLabel, 'Walk-in', 'an enquiry typed at the office is a walk-in by default');
    const byId = (await asAdmin('GET', `/admissions/enquiries?q=${row.enquiryId}`)).data;
    assert.deepEqual(byId.rows.map((r) => r.id), [due], 'found by its enquiry number');
    assert.equal((await asAdmin('GET', '/admissions/enquiries?q=Parent%20Plain')).data.total, 1, 'found by the parent name');
    assert.equal((await asAdmin('GET', '/admissions/enquiries?q=%25')).data.total, 0, 'a typed % is not a wildcard');
    assert.equal((await asAdmin('GET', '/admissions/enquiries?pageSize=2')).data.rows.length, 2, 'paged');
    assert.equal((await asAdmin('GET', '/admissions/enquiries?stage=nonsense')).status, 400);
    assert.equal((await asAdmin('GET', '/admissions/enquiries?from=yesterday')).status, 400);

    const after = (await asAdmin('GET', '/admissions/enquiries/summary')).data;
    assert.equal(after.total, before.total + 4);
    assert.equal(after.needsFollowUp, before.needsFollowUp + 1);
    assert.equal(after.visitsScheduled, before.visitsScheduled + 1);
    assert.equal(after.tabs.followup, before.tabs.followup + 1);

    // Planning: dates must not be in the past, notes are added, a contact is stamped, clearing works
    assert.equal((await asAdmin('PUT', `/admissions/${plain}/follow-up`, { body: { followUpOn: day(-3) } })).status, 400, 'no follow-up in the past');
    assert.equal((await asAdmin('PUT', `/admissions/${plain}/follow-up`, { body: {} })).status, 400, 'nothing to save');
    assert.equal((await asAdmin('PUT', `/admissions/${plain}/follow-up`, { body: { followUpOn: day(1), note: 'Spoke to mother', contacted: true } })).status, 200);
    const planned = (await list('tab=all')).rows.find((r) => r.id === plain);
    assert.equal(planned.followUpOn, day(1));
    assert.equal(planned.lastContactedOn, day(0));
    assert.match(planned.remarks, /Spoke to mother/);
    assert.equal((await asAdmin('PUT', `/admissions/${plain}/follow-up`, { body: { followUpOn: '' } })).status, 200, 'an empty date clears it');
    assert.equal((await list('tab=all')).rows.find((r) => r.id === plain).followUpOn, null);
    assert.equal((await asAdmin('POST', '/admissions', { body: { applicantName: `${T} Bad`, source: 'telepathy' } })).status, 400, 'unknown source refused');

    // A turned-away enquiry has nothing left to follow up
    await asAdmin('POST', `/admissions/${later}/status`, { body: { status: 'rejected' } });
    assert.equal((await asAdmin('PUT', `/admissions/${later}/follow-up`, { body: { followUpOn: day(2) } })).status, 409);
    assert.equal((await list('visit=1')).total, 0, 'a closed enquiry no longer counts as a scheduled visit');

    const teacher = await userWithRole('teacher');
    assert.equal((await call('GET', '/admissions/enquiries', { token: teacher.token })).status, 403, 'admissions are admin only');
  });
});

describe('enquiry form', () => {
  test('the enquiry form requires what it marks required, checks every field, and can be edited later', async () => {
    const T = `Ef${RUN}`;
    const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const cls = await create('/classes', { name: `${T}G1`.slice(0, 20), section: 'A' });
    const desk = await create('/staff', { firstName: 'Desk', lastName: `${T}Staff` });
    const inactive = await create('/staff', { firstName: 'Gone', lastName: `${T}Gone`, status: 'inactive' });
    const yearName = `${T}-27`.slice(0, 30);
    const year = await create('/academic-years', { name: yearName, startDate: '2031-06-01', endDate: '2032-03-31' });
    const form = (extra = {}) => ({
      firstName: 'Aarav', lastName: `${T}Khanna`, classId: cls.id, academicYear: yearName, guardianName: 'Rahul Khanna', guardianPhone: '+91 98765 43210', source: 'referral', ...extra,
    });
    const post = (body) => asAdmin('POST', '/admissions/enquiries', { body });

    // every field the form marks required is required
    for (const [field, label] of [['firstName', 'first name'], ['lastName', 'last name'], ['classId', 'Grade'], ['academicYear', 'Academic year'], ['guardianName', 'Parent'], ['guardianPhone', 'Phone'], ['source', 'where the enquiry came from']]) {
      const r = await post(form({ [field]: '' }));
      assert.equal(r.status, 400, `${field} is required`);
      assert.match(r.data.error, new RegExp(label, 'i'));
    }
    assert.equal((await post(form({ academicYear: 'Nope 1999' }))).status, 400, 'the year must be one of the academic years');
    assert.equal((await post(form({ classId: 999999 }))).status, 400);
    assert.equal((await post(form({ source: 'telepathy' }))).status, 400);
    assert.equal((await post(form({ assignedToId: inactive.id }))).status, 400, 'only active staff can be assigned');
    assert.equal((await post(form({ preferredContact: 'pigeon' }))).status, 400);
    assert.equal((await post(form({ followUpType: 'pigeon' }))).status, 400);
    assert.equal((await post(form({ followUpOn: day(-2) }))).status, 400, 'no follow-up in the past');
    assert.equal((await post(form({ enquiryOn: day(2) }))).status, 400, 'the family cannot have enquired tomorrow');
    assert.equal((await post(form({ email: 'not-an-email' }))).status, 400, 'formats follow the same rules as everywhere else');
    assert.equal((await post(form({ guardianPhone: 'abc' }))).status, 400);
    assert.equal((await post(form({ followUpNote: 'x'.repeat(201) }))).status, 400);

    const created = await post(form({
      dob: '2020-05-01', gender: 'male', previousSchool: 'Sunrise Nursery', guardianRelation: 'Father', email: 'rahul@example.com', address: '12 Lake Road, Pune',
      assignedToId: desk.id, preferredContact: 'whatsapp', remarks: 'Interested in the science lab', followUpOn: day(3), followUpType: 'whatsapp', followUpNote: 'Share fee structure',
    }));
    assert.equal(created.status, 201, JSON.stringify(created.data));
    cleanups.unshift(() => dropEnquiry(created.data.id));

    const saved = (await asAdmin('GET', `/admissions/enquiries/${created.data.id}`)).data;
    assert.equal(saved.applicantName, `Aarav ${T}Khanna`);
    assert.equal(saved.firstName, 'Aarav');
    assert.equal(saved.lastName, `${T}Khanna`);
    assert.equal(saved.enquiryOn, day(0), 'the enquiry date defaults to today');
    assert.equal(saved.academicYear, yearName);
    assert.equal(saved.assignedToId, desk.id);
    assert.equal(saved.followUpType, 'whatsapp');
    assert.equal(saved.followUpNote, 'Share fee structure');

    const row = (await asAdmin('GET', `/admissions/enquiries?q=${T}Khanna`)).data.rows[0];
    assert.equal(row.assignedToName, `Desk ${T}Staff`);
    assert.equal(row.followUpTypeLabel, 'WhatsApp');
    assert.equal(row.enquiryDate, day(0));

    // editing replaces the form's fields; the follow-up date that is already stored is not re-checked against today
    assert.equal((await asAdmin('PUT', `/admissions/enquiries/${created.data.id}`, { body: form({ lastName: `${T}Sharma`, source: 'phone', followUpOn: day(3), enquiryOn: day(-4) }) })).status, 200);
    const edited = (await asAdmin('GET', `/admissions/enquiries/${created.data.id}`)).data;
    assert.equal(edited.lastName, `${T}Sharma`);
    assert.equal(edited.source, 'phone');
    assert.equal(edited.enquiryOn, day(-4), 'the enquiry date can be a past day');
    assert.equal((await asAdmin('PUT', `/admissions/enquiries/${created.data.id}`, { body: form({ guardianName: '' }) })).status, 400, 'the same required fields apply when editing');
    assert.equal((await asAdmin('PUT', '/admissions/enquiries/999999', { body: form() })).status, 404);

    // the follow-up planner takes the type and reminder too
    assert.equal((await asAdmin('PUT', `/admissions/${created.data.id}/follow-up`, { body: { followUpType: 'meeting', followUpNote: 'Bring the birth certificate' } })).status, 200);
    assert.equal((await asAdmin('GET', `/admissions/enquiries/${created.data.id}`)).data.followUpType, 'meeting');
    assert.equal((await asAdmin('PUT', `/admissions/${created.data.id}/follow-up`, { body: { followUpType: 'pigeon' } })).status, 400);

    // soft delete: hidden everywhere, listed under Deleted, restorable, and only a deleted one can be removed for good
    const before = (await asAdmin('GET', '/admissions/enquiries/summary')).data;
    assert.equal((await asAdmin('DELETE', `/admissions/${created.data.id}?permanent=1`)).status, 409, 'must be deleted first');
    assert.equal((await asAdmin('DELETE', `/admissions/${created.data.id}`)).status, 200);
    assert.equal((await asAdmin('GET', `/admissions/enquiries?q=${T}Sharma`)).data.rows.length, 0, 'gone from the list');
    assert.equal((await asAdmin('GET', `/admissions/enquiries/${created.data.id}`)).status, 404);
    const sum = (await asAdmin('GET', '/admissions/enquiries/summary')).data;
    assert.equal(sum.tabs.all, before.tabs.all - 1, 'not counted any more');
    assert.equal(sum.tabs.deleted, before.tabs.deleted + 1);
    const bin = (await asAdmin('GET', `/admissions/enquiries?tab=deleted&q=${T}Sharma`)).data.rows;
    assert.equal(bin.length, 1);
    assert.ok(bin[0].deletedAt);
    assert.equal((await asAdmin('POST', `/admissions/enquiries/${created.data.id}/restore`)).status, 200);
    assert.equal((await asAdmin('GET', `/admissions/enquiries?q=${T}Sharma`)).data.rows.length, 1, 'back in the list');
    assert.equal((await asAdmin('POST', `/admissions/enquiries/${created.data.id}/restore`)).status, 404, 'only a deleted one can be restored');

    const teacher = await userWithRole('teacher');
    assert.equal((await call('POST', '/admissions/enquiries', { token: teacher.token, body: form() })).status, 403);
  });
});

describe('photos', () => {
  test('photos are stored in the database, judged by their bytes, and follow their owner', async () => {
    const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
    const put = (path, body, token = admin) => fetch(`${API}/photos/${path}`, { method: 'PUT', headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${token}` }, body });
    const staff = await create('/staff', { firstName: 'Photo', lastName: `Ph${RUN}` });

    assert.equal((await put(`staff/${staff.id}`, Buffer.from('%PDF-1.4 no'))).status, 400, 'a PDF is not a photo');
    assert.equal((await put(`staff/${staff.id}`, Buffer.alloc(1024 * 1024 + 10, 1))).status >= 400, true, 'over 1 MB is refused');
    assert.equal((await put('staff/999999', PNG)).status, 404, 'the owner must exist');
    assert.equal((await put('pets/1', PNG)).status, 404);
    assert.equal((await asAdmin('GET', `/photos/staff/${staff.id}`)).status, 404, 'nothing stored yet');

    assert.equal((await put(`staff/${staff.id}`, PNG)).status, 201);
    const got = await fetch(`${API}/photos/staff/${staff.id}`, { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(got.status, 200);
    assert.equal(got.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await got.arrayBuffer()), PNG, 'the same bytes come back');
    assert.equal((await put(`staff/${staff.id}`, PNG)).status, 201, 'a new photo replaces the old one');

    const teacher = await userWithRole('teacher');
    assert.equal((await put(`staff/${staff.id}`, PNG, teacher.token)).status, 403, 'only admins change photos');
    assert.equal((await call('GET', `/photos/staff/${staff.id}`, { token: teacher.token })).status, 200, 'teachers can see them');

    assert.equal((await asAdmin('DELETE', `/photos/staff/${staff.id}`)).status, 200);
    assert.equal((await asAdmin('GET', `/photos/staff/${staff.id}`)).status, 404);
    // deleting the owner removes its photo
    assert.equal((await put(`staff/${staff.id}`, PNG)).status, 201);
    assert.equal((await asAdmin('DELETE', `/staff/${staff.id}`)).status, 200);
    assert.equal((await asAdmin('GET', `/photos/staff/${staff.id}`)).status, 404, 'no orphan left behind');
  });
});

describe('applications', () => {
  test('the pipeline puts each applicant in one stage and the counts add up', async () => {
    const T = `Ap${RUN}`;
    const before = (await asAdmin('GET', '/admissions/applications/summary')).data;
    const mk = async (name, extra = {}) => {
      const r = await asAdmin('POST', '/admissions', { body: { applicantName: `${name} ${T}`, guardianName: 'Pat', ...extra } });
      assert.equal(r.status, 201, JSON.stringify(r.data));
      cleanups.unshift(() => dropEnquiry(r.data.id));
      return r.data.id;
    };
    const status = (id, st) => (st === 'applied' ? markApplied(id) : asAdmin('POST', `/admissions/${id}/status`, { body: { status: st } }));
    const enquiry = await mk('Enq');
    const review = await mk('Rev'); await status(review, 'applied');
    const assess = await mk('Ass'); await status(assess, 'applied');
    assert.equal((await asAdmin('PUT', `/admissions/${assess}/test`, { body: { testDate: '2031-01-01' } })).status, 200);
    const cls = await create('/classes', { name: `Ap${RUN}`.slice(0, 12), section: 'A' });
    const offer = await mk('Off', { classId: cls.id }); await status(offer, 'applied');
    assert.equal((await status(offer, 'approved')).status, 200);

    const list = async (tab) => (await asAdmin('GET', `/admissions/applications?tab=${tab}&q=${T}&pageSize=50`)).data.rows;
    assert.deepEqual((await list('all')).map((r) => r.stage).sort(), ['assessment', 'offer', 'review'], 'a plain enquiry is not an application');
    assert.deepEqual((await list('review')).map((r) => r.id), [review]);
    assert.deepEqual((await list('assessment')).map((r) => r.id), [assess]);
    assert.deepEqual((await list('offer')).map((r) => r.id), [offer]);
    assert.equal((await list('enrolled')).length, 0);
    assert.equal((await asAdmin('GET', '/admissions/applications?tab=nonsense')).status, 400);
    const one = (await list('offer'))[0];
    assert.match(one.applicationId, /^ADM-\d{4}-\d{4,}$/);
    assert.equal((await asAdmin('GET', `/admissions/applications?q=${one.applicationId}`)).data.rows[0]?.id, offer, 'searchable by application id');
    assert.equal((await asAdmin('GET', `/admissions/applications?q=Pat&pageSize=100`)).data.total >= 3, true, 'and by parent name');

    const after = (await asAdmin('GET', '/admissions/applications/summary')).data;
    assert.equal(after.counts.all, before.counts.all + 3);
    assert.equal(after.counts.review, before.counts.review + 1);
    assert.equal(after.counts.assessment, before.counts.assessment + 1);
    assert.equal(after.counts.offer, before.counts.offer + 1);
    assert.equal(enquiry > 0, true);
  });
});

describe('student directory', () => {
  test('grade and section filters, the student id and the summary tiles', async () => {
    const T = `Sd${RUN}`;
    const before = (await asAdmin('GET', '/students/summary')).data;
    const c1 = await create('/classes', { name: `${T}G1`.slice(0, 20), section: 'A' });
    const c2 = await create('/classes', { name: `${T}G1`.slice(0, 20), section: 'B' });
    const a = await create('/students', { firstName: 'Dir', lastName: `${T}A`, classId: c1.id });
    const b = await create('/students', { firstName: 'Dir', lastName: `${T}B`, classId: c2.id, status: 'inactive' });
    const name = `${T}G1`.slice(0, 20);
    const rows = (qs) => asAdmin('GET', `/students?page=1&pageSize=50&grade=${name}&${qs}`).then((r) => r.data.rows);
    assert.deepEqual((await rows('')).map((r) => r.id).sort(), [a.id, b.id].sort(), 'grade picks both sections');
    assert.deepEqual((await rows('section=B')).map((r) => r.id), [b.id]);
    assert.deepEqual((await rows('status=active')).map((r) => r.id), [a.id]);
    const one = (await rows('section=A'))[0];
    assert.match(one.studentId, /^STU-\d{4}-\d{4,}$/);
    assert.equal((await asAdmin('GET', `/students?page=1&q=${one.studentId}`)).data.rows[0]?.id, a.id, 'searchable by student id');
    const card = (await asAdmin('GET', `/documents/id-cards?studentId=${a.id}`)).data;
    assert.deepEqual(card.cards.map((c) => c.studentId), [a.id], 'one student can have a card printed');
    assert.equal((await asAdmin('GET', `/documents/id-cards?studentId=${b.id}`)).data.cards.length, 0, 'an inactive student has none');
    // other suites create students at the same time, so check the counts add up rather than exact differences
    const after = (await asAdmin('GET', '/students/summary')).data;
    assert.equal(after.total, after.active + after.inactive);
    assert.equal(after.inactive >= 1 && after.classes >= 2, true);
  });
});

describe('id card design', () => {
  test('one saved design is checked, applies to student and staff cards, and can be reset', async () => {
    const get = async () => (await asAdmin('GET', '/documents/id-card-design')).data;
    const put = (body) => asAdmin('PUT', '/documents/id-card-design', { body });
    const original = (await get()).design;
    cleanups.unshift(() => asAdmin('DELETE', '/documents/id-card-design'));

    assert.equal((await put({ ...original, headerColor: 'red' })).status, 400, 'colours are hex');
    assert.equal((await put({ ...original, footerText: 'x'.repeat(61) })).status, 400);
    assert.equal((await put({ ...original, student: { title: 'Student ID', fields: ['admissionNo', 'salary'] } })).status, 400, 'only known fields');
    assert.equal((await put({ ...original, staff: { title: '', fields: ['staffNo'] } })).status, 400, 'a title is needed');

    const saved = await put({ ...original, headerColor: '#112233', accentColor: '#AA5500', signatureLabel: 'Principal', student: { title: 'Pupil card', fields: ['className', 'admissionNo'] }, staff: { title: 'Staff ID', fields: ['phone', 'staffNo'] } });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    const now = (await get()).design;
    assert.equal(now.headerColor, '#112233');
    assert.equal(now.accentColor, '#aa5500', 'colours are stored in lower case');
    assert.deepEqual(now.student.fields, ['admissionNo', 'className'], 'fields keep the fixed order');
    assert.deepEqual(now.staff.fields, ['staffNo', 'phone']);
    assert.equal(now.student.title, 'Pupil card');

    // the cards the design is used for
    const staff = await create('/staff', { firstName: 'Card', lastName: `Cd${RUN}`, phone: '9876543210' });
    const cards = (await asAdmin('GET', `/documents/staff-id-cards?staffId=${staff.id}`)).data;
    assert.deepEqual(cards.cards.map((c) => [c.staffId, c.name, c.hasPhoto]), [[staff.id, `Card Cd${RUN}`, false]]);
    assert.equal(cards.cards[0].staffNo.startsWith('STF-'), true);

    const teacher = await userWithRole('teacher');
    assert.equal((await call('PUT', '/documents/id-card-design', { token: teacher.token, body: original })).status, 403, 'only admins change the design');

    assert.equal((await asAdmin('DELETE', '/documents/id-card-design')).status, 200);
    assert.equal((await get()).design.headerColor, '#1e293b', 'back to the standard design');
  });
});

describe('linked records', () => {
  test('deleting a student that was enrolled returns the applicant to an offer, and certificates block the delete', async () => {
    const T = `Lk${RUN}`;
    const cls = await create('/classes', { name: `${T}`.slice(0, 12), section: 'A' });
    const adm = await asAdmin('POST', '/admissions', { body: { applicantName: `Link ${T}`, guardianName: 'Pat', classId: cls.id } });
    assert.equal(adm.status, 201);
    cleanups.unshift(() => dropEnquiry(adm.data.id));
    await markApplied(adm.data.id);
    assert.equal((await asAdmin('POST', `/admissions/${adm.data.id}/status`, { body: { status: 'approved' } })).status, 200);
    const enrolled = (await asAdmin('POST', `/admissions/${adm.data.id}/enroll`, { body: {} })).data;
    assert.ok(enrolled.studentId);
    const row = async () => (await asAdmin('GET', `/admissions/applications?q=${T}`)).data.rows[0];
    assert.equal((await row()).stage, 'enrolled');

    // a certificate request on record keeps the student
    const cert = await asAdmin('POST', '/documents', { body: { studentId: enrolled.studentId, type: 'bonafide', purpose: 'test' } });
    if (cert.status === 201) {
      assert.equal((await asAdmin('DELETE', `/students/${enrolled.studentId}`)).status, 409, 'a student with certificate requests is not deleted');
      await asAdmin('DELETE', `/documents/${cert.data.id}`);
    }

    assert.equal((await asAdmin('DELETE', `/students/${enrolled.studentId}`)).status, 200);
    assert.equal((await row()).stage, 'offer', 'the applicant holds an offer again, not an enrolment with no student');
  });
});

describe('academics overview', () => {
  test('classes carry a room and class teacher, bands follow the grade, and the tiles count what is set up', async () => {
    const T = `Ac${RUN}`;
    const teacher = await create('/staff', { firstName: 'Home', lastName: `${T}`, designation: 'Class teacher' });
    const kg = await create('/classes', { name: `Kindergarten ${T}`.slice(0, 40), section: 'A', room: 'K-09', classTeacherId: teacher.id });
    const g7 = await create('/classes', { name: `Grade 7 ${T}`.slice(0, 40), section: 'B' });
    const g10 = await create('/classes', { name: `Grade 10 ${T}`.slice(0, 40), section: 'C' });
    const sub = await create('/subjects', { name: `Sub ${T}`.slice(0, 40), code: `S${RUN}`.slice(0, 10) });
    await create('/class-subjects', { classId: g7.id, subjectId: sub.id, staffId: teacher.id });

    const view = (await asAdmin('GET', '/classes/overview')).data;
    const row = (id) => view.rows.find((r) => r.id === id);
    assert.equal(row(kg.id).band, 'Primary');
    assert.equal(row(g7.id).band, 'Middle school');
    assert.equal(row(g10.id).band, 'Secondary');
    assert.equal(row(kg.id).room, 'K-09');
    assert.equal(row(kg.id).teacher, `Home ${T}`);
    assert.equal(row(g7.id).subjects, 1);
    assert.equal(row(g7.id).students, 0);
    assert.equal(view.summary.classes, view.rows.length);
    assert.equal(view.bands.all, view.rows.length);
    assert.equal(view.bands.primary + view.bands.middle + view.bands.secondary <= view.bands.all, true);
    assert.equal(view.summary.timetableCompletion === null || (view.summary.timetableCompletion >= 0 && view.summary.timetableCompletion <= 100), true);

    // the room can be changed and cleared
    assert.equal((await asAdmin('PUT', `/classes/${kg.id}`, { body: { room: '' } })).status, 200);
    assert.equal((await asAdmin('GET', '/classes/overview')).data.rows.find((r) => r.id === kg.id).room, null);
    const teacherUser = await userWithRole('teacher');
    assert.equal((await call('GET', '/classes/overview', { token: teacherUser.token })).status, 200, 'teachers can look');
  });
});

describe('attendance details', () => {
  test('arrival time and a note are kept with the mark, checked, and cleared for an absent student', async () => {
    const T = `At${RUN}`;
    const cls = await create('/classes', { name: `${T}`.slice(0, 12), section: 'A' });
    const a = await create('/students', { firstName: 'Late', lastName: T, classId: cls.id });
    const b = await create('/students', { firstName: 'Gone', lastName: T, classId: cls.id });
    const date = new Date().toISOString().slice(0, 10);
    const post = (records) => asAdmin('POST', '/attendance', { body: { date, records } });
    assert.equal((await post([{ studentId: a.id, status: 'late', arrivalTime: '25:61' }])).status, 400, 'a real time of day');
    assert.equal((await post([{ studentId: a.id, status: 'late', note: 'x'.repeat(121) }])).status, 400);
    assert.equal((await post([{ studentId: a.id, status: 'late', arrivalTime: '08:34', note: 'Bus delay' }, { studentId: b.id, status: 'absent', arrivalTime: '08:00', note: 'Sick' }])).status, 200);
    const roster = (await asAdmin('GET', `/attendance?date=${date}&classId=${cls.id}`)).data;
    const late = roster.find((r) => r.studentId === a.id);
    const gone = roster.find((r) => r.studentId === b.id);
    assert.deepEqual([late.status, late.arrivalTime, late.note], ['late', '08:34', 'Bus delay']);
    assert.equal(gone.arrivalTime, null, 'an absent student has no arrival time');
    assert.equal(gone.note, 'Sick');
    assert.ok(late.savedAt, 'the roster says when it was last saved');
    assert.equal(late.className, `${T}`.slice(0, 12));
    assert.equal(late.section, 'A');
  });
});

describe('application form', () => {
  test('a draft is filled in, submitted once, and its data, documents and photo flow through to the student', async () => {
    const T = `Fm${RUN}`;
    const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
    const cls = await create('/classes', { name: `${T}`.slice(0, 12), section: 'A' });
    const year = await asAdmin('GET', '/academic-years');
    const yearName = year.data.find((y) => y.isCurrent)?.name ?? year.data[0]?.name;

    // a draft needs a name and nothing else, and stays out of the enquiry list and the applicant counts
    assert.equal((await asAdmin('POST', '/admissions/applications', { body: {} })).status, 400);
    const before = (await asAdmin('GET', '/admissions/applications/summary')).data.counts.all;
    const draft = await asAdmin('POST', '/admissions/applications', { body: { firstName: 'Drafty', lastName: T } });
    assert.equal(draft.status, 201, JSON.stringify(draft.data));
    const id = draft.data.id;
    cleanups.unshift(() => dropEnquiry(id));
    assert.equal((await asAdmin('GET', `/admissions/enquiries?q=${T}`)).data.total, 0, 'a draft is not an enquiry');
    assert.equal((await asAdmin('GET', '/admissions/applications/summary')).data.counts.all, before, 'and not an applicant yet');
    const drafts = (await asAdmin('GET', `/admissions/applications?tab=draft&q=${T}`)).data.rows;
    assert.deepEqual(drafts.map((r) => [r.id, r.stage]), [[id, 'draft']]);

    // submitting needs the required details and consent
    const sub = (body) => asAdmin('POST', `/admissions/applications/${id}/submit`, { body });
    const refused = await sub({ consent: true });
    assert.equal(refused.status, 400);
    assert.match(refused.data.error, /Date of birth/);
    assert.match(refused.data.error, /Primary guardian name/);
    const details = { firstName: 'Drafty', lastName: T, dob: '2019-02-03', gender: 'female', classId: cls.id, academicYear: yearName, nationality: 'Indian', motherTongue: 'Marathi',
      guardianName: 'Gita Rao', guardianRelation: 'Mother', guardianPhone: '+91 98765 43210', guardianEmail: 'gita@example.com', secondaryGuardianName: 'Ravi Rao', secondaryGuardianPhone: '+91 98222 11111',
      address: '12 Lake Road, Pune', previousSchool: 'Sunrise Nursery', previousClass: 'Kindergarten', previousTcNo: 'TC-77', specialNeeds: 'Wears glasses', source: 'referral', referredBy: 'Mrs Nair', remarks: 'Keen on music' };
    assert.equal((await asAdmin('PUT', `/admissions/applications/${id}`, { body: details })).status, 200);
    assert.equal((await sub({ consent: false })).status, 400, 'consent is required');
    assert.equal((await asAdmin('PUT', `/admissions/applications/${id}`, { body: { ...details, secondaryGuardianPhone: 'abc' } })).status, 400, 'phones are checked');
    assert.equal((await asAdmin('PUT', `/admissions/applications/${id}`, { body: { ...details, academicYear: 'Nope 1999' } })).status, 400, 'the year must be a real one');

    // documents: only real PDFs and images, kept with the application
    const up = (body, name, title = '') => fetch(`${API}/admissions/applications/${id}/documents?name=${name}&title=${encodeURIComponent(title)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${admin}` }, body });
    assert.equal((await up(Buffer.from('MZ not a document'), 'x.pdf')).status, 400, 'judged by the bytes');
    const doc = await up(PNG, 'birth-certificate.png', 'Birth certificate');
    assert.equal(doc.status, 201);
    assert.equal((await asAdmin('GET', `/admissions/applications/${id}`)).data.documents.length, 1);
    const back = await fetch(`${API}/admissions/applications/${id}/documents/${(await doc.json()).id}`, { headers: { Authorization: `Bearer ${admin}` } });
    assert.deepEqual(Buffer.from(await back.arrayBuffer()), PNG, 'the same bytes come back');
    assert.equal((await fetch(`${API}/photos/enquiry/${id}`, { method: 'PUT', headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${admin}` }, body: PNG })).status, 201);

    // the required documents from Master data must be uploaded before the application can be submitted
    const needDocs = await sub({ consent: true });
    assert.equal(needDocs.status, 400);
    assert.match(needDocs.data.error, /Address proof \(upload\)/);
    assert.doesNotMatch(needDocs.data.error, /Birth certificate/, 'the one that was uploaded is no longer missing');
    assert.equal((await up(PNG, 'address.png', 'Address proof')).status, 201);

    // submit: the draft becomes an application under review, with the consent time kept; it cannot be submitted twice
    assert.equal((await sub({ consent: true })).status, 200);
    const app = (await asAdmin('GET', `/admissions/applications?q=${T}`)).data.rows[0];
    assert.equal(app.stage, 'review');
    assert.equal((await asAdmin('GET', '/admissions/applications/summary')).data.counts.all, before + 1);
    assert.ok((await asAdmin('GET', `/admissions/applications/${id}`)).data.consentAt);
    assert.equal((await sub({ consent: true })).status, 409);

    // approve and enrol: the details, the document and the photo are on the student
    assert.equal((await asAdmin('POST', `/admissions/${id}/status`, { body: { status: 'approved' } })).status, 200);
    const enrolled = await asAdmin('POST', `/admissions/${id}/enroll`, { body: {} });
    assert.equal(enrolled.status, 200, JSON.stringify(enrolled.data));
    const student = (await asAdmin('GET', `/students/${enrolled.data.studentId}`)).data;
    cleanups.unshift(() => asAdmin('DELETE', `/students/${enrolled.data.studentId}`));
    for (const key of ['guardianRelation', 'secondaryGuardianName', 'secondaryGuardianPhone', 'specialNeeds', 'previousTcNo', 'nationality', 'motherTongue', 'address']) assert.equal(student[key], details[key], `${key} reached the student`);
    const files = (await asAdmin('GET', `/student-files?studentId=${enrolled.data.studentId}`)).data;
    assert.deepEqual(files.filter((x) => x.kind === 'document').map((x) => x.title).sort(), ['Address proof', 'Birth certificate'], 'the documents moved to the student, under their type');
    assert.equal((await asAdmin('GET', `/photos/student/${enrolled.data.studentId}`)).status, 200, 'and so did the photo');

    // an enquiry can be opened in the same form and submitted
    const enq = await asAdmin('POST', '/admissions', { body: { applicantName: `Enq ${T}`, guardianName: 'Pat' } });
    cleanups.unshift(() => dropEnquiry(enq.data.id));
    assert.equal((await asAdmin('POST', `/admissions/applications/${enq.data.id}/submit`, { body: { consent: true } })).status, 400, 'the same required details apply');
  });
});

describe('required documents', () => {
  test('document lists live in master data, can mark items required, and only document lists can', async () => {
    const masters = (await asAdmin('GET', '/masters')).data;
    for (const key of ['application_document', 'student_document', 'staff_document']) {
      assert.equal(masters.types.find((t) => t.key === key)?.documents, true, `${key} is a document list`);
      assert.equal(masters.items[key].some((i) => i.required), true, `${key} has required items by default`);
    }
    assert.equal(masters.types.find((t) => t.key === 'religion').documents, false);
    const name = `Doc ${RUN}`;
    const made = await asAdmin('POST', '/masters', { body: { type: 'staff_document', name, required: true } });
    assert.equal(made.status, 201);
    cleanups.unshift(() => asAdmin('DELETE', `/masters/${made.data.id}`));
    const row = () => asAdmin('GET', '/masters?type=staff_document').then((r) => r.data.items.staff_document.find((i) => i.id === made.data.id));
    assert.equal((await row()).required, true);
    assert.equal((await asAdmin('PUT', `/masters/${made.data.id}`, { body: { required: false } })).status, 200);
    assert.equal((await row()).required, false);
    const faith = masters.items.religion[0];
    assert.equal((await asAdmin('PUT', `/masters/${faith.id}`, { body: { required: true } })).status, 400, 'a religion cannot be required');
  });
});

describe('dashboard', () => {
  test('the school overview carries trends, activity, what needs review and the day\'s priorities, and teachers see no admissions detail', async () => {
    const T = `Db${RUN}`;
    const cls = await create('/classes', { name: `${T}`.slice(0, 12), section: 'A' });
    const enq = await asAdmin('POST', '/admissions', { body: { applicantName: `Dash ${T}`, guardianName: 'Pat', classId: cls.id } });
    cleanups.unshift(() => dropEnquiry(enq.data.id));
    await markApplied(enq.data.id);

    const d = (await asAdmin('GET', '/dashboard')).data;
    assert.equal(d.enrollmentTrend.length, 8, 'eight months');
    assert.equal(d.enrollmentTrend.every((m) => Number.isInteger(m.admissions) && Number.isInteger(m.enquiries)), true);
    assert.equal(d.enrollmentTrend.at(-1).admissions >= 1, true, 'this month counts the new application');
    assert.equal(d.toReview.some((r) => r.name === `Dash ${T}` && r.stage === 'review'), true, 'it is waiting for review');
    assert.equal(d.underReview >= 1, true);
    assert.equal(Array.isArray(d.unmarkedClasses) && d.unmarkedClasses.includes(`${T}`.slice(0, 12) + ' · A') === false, true, 'a class with no students has nothing to mark');
    assert.equal(d.recentActivity.length <= 6 && d.recentActivity.every((e) => e.title && e.at), true);
    assert.equal(d.recentActivity.every((e, i, all) => i === 0 || all[i - 1].at >= e.at), true, 'newest first');

    const teacher = await userWithRole('teacher');
    const t = (await call('GET', '/dashboard', { token: teacher.token })).data;
    assert.deepEqual(t.toReview, [], 'applicant names are for administrators');
    assert.deepEqual(t.recentActivity, []);
    assert.equal(typeof t.students, 'number', 'the rest of the dashboard still works');
  });
});

describe('subject map', () => {
  test('subjects are core or elective, theory or practical; students pick one elective per group; exams follow the choices', async () => {
    const T = `Sm${RUN}`;
    const cls = await create('/classes', { name: `${T}`.slice(0, 12), section: 'A' });
    const other = await create('/classes', { name: `${T}x`.slice(0, 12), section: 'B' });
    const math = await create('/subjects', { name: `Math ${T}`, code: `Zm${RUN}`.slice(0, 10) });
    const sci = await create('/subjects', { name: `Sci ${T}`, code: `Zs${RUN}`.slice(0, 10) });
    const hin = await create('/subjects', { name: `Hin ${T}`, code: `Zh${RUN}`.slice(0, 10) });
    const fre = await create('/subjects', { name: `Fre ${T}`, code: `Zf${RUN}`.slice(0, 10) });
    const cs = (body) => asAdmin('POST', '/class-subjects', { body: { classId: cls.id, ...body } });
    const made = async (body) => { const r = await cs(body); assert.equal(r.status, 201, JSON.stringify(r.data)); cleanups.unshift(() => asAdmin('DELETE', `/class-subjects/${r.data.id}`)); return r.data.id; };

    // the rules on a subject-map row
    assert.equal((await cs({ subjectId: math.id, component: 'lab' })).status, 400, 'theory, practical or both');
    assert.equal((await cs({ subjectId: math.id, periodsPerWeek: 99 })).status, 400);
    const csMath = await made({ subjectId: math.id, component: 'theory', periodsPerWeek: 6 });
    assert.equal((await cs({ subjectId: math.id })).status, 409, 'a subject is in a class once');
    const csSci = await made({ subjectId: sci.id, component: 'theory_practical', periodsPerWeek: 5 });
    const csHin = await made({ subjectId: hin.id, isElective: true, electiveGroup: 'Second language' });
    const csFre = await made({ subjectId: fre.id, isElective: true, electiveGroup: 'Second language', component: 'practical' });

    const map = (await asAdmin('GET', `/class-subjects/map?classId=${cls.id}`)).data;
    const row = (id) => map.subjects.find((x) => x.id === id);
    assert.equal(row(csSci).componentLabel, 'Theory + practical');
    assert.equal(row(csMath).isElective, false);
    assert.equal(row(csHin).electiveGroup, 'Second language');
    assert.equal(map.subjects.findIndex((x) => x.id === csMath) < map.subjects.findIndex((x) => x.id === csHin), true, 'core subjects come first');

    // students choose; one per group; only their class's electives
    const a = await create('/students', { firstName: 'Ana', lastName: T, classId: cls.id });
    const b = await create('/students', { firstName: 'Bo', lastName: T, classId: cls.id });
    const outsider = await create('/students', { firstName: 'Out', lastName: T, classId: other.id });
    const choose = (id, ids) => asAdmin('PUT', `/students/${id}/electives`, { body: { classSubjectIds: ids } });
    assert.equal((await choose(a.id, [csHin, csFre])).status, 400, 'one elective per group');
    assert.equal((await choose(a.id, [csMath])).status, 400, 'a core subject is not a choice');
    assert.equal((await choose(outsider.id, [csHin])).status, 400, 'only the electives of the student\'s own class');
    assert.equal((await choose(a.id, [csHin])).status, 200);
    assert.equal((await choose(b.id, [csFre])).status, 200);
    const sheet = (await asAdmin('GET', `/class-subjects/electives?classId=${cls.id}`)).data;
    assert.deepEqual(sheet.students.find((x) => x.id === a.id).choices, [csHin]);
    assert.equal(sheet.groups.length, 1);
    assert.equal(sheet.groups[0].subjects.length, 2);
    assert.equal((await asAdmin('GET', `/class-subjects/map?classId=${cls.id}`)).data.subjects.find((x) => x.id === csHin).takers, 1);
    const mine = (await asAdmin('GET', `/students/${a.id}/subjects`)).data;
    assert.deepEqual(mine.subjects.map((x) => x.id).sort(), [csMath, csSci, csHin].sort());
    assert.deepEqual(mine.electivesNotChosen, [`Fre ${T}`]);

    // an exam only expects, accepts and ranks what each student takes
    const exam = await create('/exams', { name: `Exam ${T}`, classId: cls.id, maxMarks: 100 });
    const marks = (records) => asAdmin('POST', `/exams/${exam.id}/marks`, { body: { records } });
    assert.equal((await marks([{ studentId: a.id, subjectId: fre.id, marks: 50 }])).status, 400, 'no mark for an elective the student did not choose');
    assert.equal((await marks([
      { studentId: a.id, subjectId: math.id, marks: 80 }, { studentId: a.id, subjectId: sci.id, marks: 70 }, { studentId: a.id, subjectId: hin.id, marks: 60 },
      { studentId: b.id, subjectId: math.id, marks: 90 }, { studentId: b.id, subjectId: sci.id, marks: 90 }, { studentId: b.id, subjectId: fre.id, marks: 90 },
    ])).status, 200);
    const sheetMarks = (await asAdmin('GET', `/exams/${exam.id}/marks`)).data;
    assert.deepEqual(sheetMarks.students.find((x) => x.studentId === a.id).skips, [fre.id], 'the sheet says which subject a student skips');
    assert.equal(sheetMarks.subjects.find((x) => x.id === fre.id).elective, true);
    const results = (await asAdmin('GET', `/exams/${exam.id}/results`)).data.rows;
    const ra = results.find((r) => r.studentId === a.id);
    assert.equal(ra.outOf, 300, 'three subjects, not four');
    assert.equal(ra.total, 210);
    assert.equal(ra.result, 'pass', 'complete: nothing is missing for the subjects Ana takes');
    assert.equal(results.find((r) => r.studentId === b.id).rank, 1);
    const card = (await asAdmin('GET', `/exams/${exam.id}/report-card/${a.id}`)).data;
    assert.deepEqual(card.subjects.map((x) => x.subjectId).sort(), [math.id, sci.id, hin.id].sort(), 'the report card lists only her subjects');

    // moving class drops the old class's electives; a core subject cannot keep student choices
    assert.equal((await asAdmin('PUT', `/students/${a.id}`, { body: { classId: other.id } })).status, 200);
    assert.deepEqual((await asAdmin('GET', `/students/${a.id}/subjects`)).data.subjects, [], 'no subjects in a class that has none');
    assert.equal((await asAdmin('PUT', `/class-subjects/${csFre}`, { body: { isElective: false } })).status, 200);
    assert.equal((await asAdmin('GET', `/class-subjects/map?classId=${cls.id}`)).data.subjects.find((x) => x.id === csFre).electiveGroup, null);
    assert.deepEqual((await asAdmin('GET', `/class-subjects/electives?classId=${cls.id}`)).data.students.find((x) => x.id === b.id).choices, [], 'its choices are cleared when it becomes core');
  });
});

describe('admission choices', () => {
  test('what a family asks for at registration is checked, kept on the application, and becomes real on enrolment', async () => {
    const T = `Ch${RUN}`;
    const cls = await create('/classes', { name: `${T}`.slice(0, 12), section: 'A' });
    const sub = (name, code) => create('/subjects', { name: `${name} ${T}`, code: `${code}${RUN}`.slice(0, 10) });
    const hin = await sub('Hin', 'Yh'); const fre = await sub('Fre', 'Yf'); const eng = await sub('Eng', 'Ye');
    const link = async (subject, extra = {}) => { const r = await asAdmin('POST', '/class-subjects', { body: { classId: cls.id, subjectId: subject.id, ...extra } }); assert.equal(r.status, 201, JSON.stringify(r.data)); cleanups.unshift(() => asAdmin('DELETE', `/class-subjects/${r.data.id}`)); return r.data.id; };
    const csEng = await link(eng);
    const csHin = await link(hin, { isElective: true, electiveGroup: 'Second language' });
    const csFre = await link(fre, { isElective: true, electiveGroup: 'Second language' });
    await create('/fee-structures', { classId: cls.id, title: `Tuition ${T}`, amount: '1000', dueDate: '2031-01-01' });
    const group = await create('/fee-groups', { name: `Pack ${T}` });
    assert.equal((await asAdmin('POST', `/fee-groups/${group.id}/items`, { body: { title: `Uniform ${T}`, amount: '350' } })).status, 201);
    const bus = await create('/transport/vehicles', { regNo: `CH-${RUN}`.slice(0, 20), capacity: 10 });
    const route = await create('/transport/routes', { name: `Route ${T}`, vehicleId: bus.id, monthlyFee: 500 });
    const stop = await create('/transport/stops', { routeId: route.id, name: `Stop ${T}`, sequence: 1 });
    const club = await create('/activities', { kind: 'club', title: `Club ${T}`, startDate: '2031-02-01', endDate: '2031-02-02' });

    const adm = await asAdmin('POST', '/admissions', { body: { applicantName: `Choice ${T}`, guardianName: 'Pat', classId: cls.id } });
    assert.equal(adm.status, 201);
    cleanups.unshift(() => dropEnquiry(adm.data.id));
    const save = (choices) => asAdmin('PUT', `/admissions/applications/${adm.data.id}`, { body: { choices } });

    // the rules
    assert.equal((await save({ electiveIds: [csEng] })).status, 400, 'a core subject is not an elective');
    assert.equal((await save({ electiveIds: [csHin, csFre] })).status, 400, 'one elective per group');
    assert.equal((await save({ transportRouteId: route.id })).status, 400, 'a route needs a stop');
    assert.equal((await save({ activityIds: [999999] })).status, 400);
    assert.equal((await save({ feeGroupId: 999999 })).status, 400);

    // the choices are kept with the application
    const wanted = { electiveIds: [csFre], activityIds: [club.id], transportRouteId: route.id, transportStopId: stop.id, needsHostel: true, hostelRoomId: null, feeGroupId: group.id };
    assert.equal((await save(wanted)).status, 200);
    assert.deepEqual((await asAdmin('GET', `/admissions/applications/${adm.data.id}`)).data.choices, wanted);

    // enrolment makes them real
    await markApplied(adm.data.id);
    assert.equal((await asAdmin('POST', `/admissions/${adm.data.id}/status`, { body: { status: 'approved' } })).status, 200);
    const enrolled = (await asAdmin('POST', `/admissions/${adm.data.id}/enroll`, { body: {} })).data;
    cleanups.unshift(() => asAdmin('DELETE', `/students/${enrolled.studentId}`));
    assert.ok(enrolled.studentId);
    assert.equal(enrolled.followUps.length, 1, 'only the hostel bed is left for the school to do');
    assert.match(enrolled.followUps[0], /Hostel/);

    const mine = (await asAdmin('GET', `/students/${enrolled.studentId}/subjects`)).data;
    assert.deepEqual(mine.subjects.map((x) => x.id).sort(), [csEng, csFre].sort(), 'core plus the chosen elective');
    const people = (await asAdmin('GET', `/activities/${club.id}/participants`)).data;
    assert.equal(JSON.stringify(people).includes(`Choice ${T}`), true, 'registered for the activity');
    const rides = (await asAdmin('GET', `/transport/assignments?routeId=${route.id}`)).data;
    assert.equal(rides.some((r) => r.studentId === enrolled.studentId && r.stopId === stop.id), true, 'on the bus');
    cleanups.unshift(() => asAdmin('DELETE', `/transport/assignments/${enrolled.studentId}`));
    const fees = (await asAdmin('GET', `/fees?studentId=${enrolled.studentId}`)).data.map((x) => x.title).sort();
    assert.deepEqual(fees, [`Tuition ${T}`, `Uniform ${T}`].sort(), 'the class fee and the fee group item are both billed');

    // the class map pulls it all together
    const map = (await asAdmin('GET', `/classes/${cls.id}/map`)).data;
    assert.equal(map.students, 1);
    assert.equal(map.subjects.length, 3);
    assert.equal(map.fees.total, 1000);
    assert.deepEqual(map.transport.routes.map((r) => [r.name, r.riders]), [[`Route ${T}`, 1]]);
    assert.equal(map.activities.some((x) => x.id === club.id), true);
    assert.equal((await asAdmin('GET', '/classes/999999/map')).status, 404);
  });
});

describe('theory and practical marks', () => {
  test('a theory + practical subject takes two marks, each against its own maximum, and the total is their sum', async () => {
    const T = `Tp${RUN}`;
    const cls = await create('/classes', { name: `${T}`.slice(0, 12), section: 'A' });
    const sci = await create('/subjects', { name: `Sci ${T}`, code: `Zq${RUN}`.slice(0, 10) });
    const art = await create('/subjects', { name: `Art ${T}`, code: `Zr${RUN}`.slice(0, 10) });
    const eng = await create('/subjects', { name: `Eng ${T}`, code: `Zt${RUN}`.slice(0, 10) });
    const link = async (subject, body) => { const r = await asAdmin('POST', '/class-subjects', { body: { classId: cls.id, subjectId: subject.id, ...body } }); assert.equal(r.status, 201, JSON.stringify(r.data)); cleanups.unshift(() => asAdmin('DELETE', `/class-subjects/${r.data.id}`)); return r.data.id; };
    assert.equal((await asAdmin('POST', '/class-subjects', { body: { classId: cls.id, subjectId: sci.id, component: 'theory_practical', practicalShare: 100 } })).status, 400, 'a share is a percent below 100');
    const csSci = await link(sci, { component: 'theory_practical', practicalShare: 30 });
    await link(art, { component: 'practical' });
    await link(eng, { component: 'theory', practicalShare: 40 });
    const maps = (await asAdmin('GET', `/class-subjects/map?classId=${cls.id}`)).data.subjects;
    assert.equal(maps.find((x) => x.id === csSci).practicalShare, 30);
    assert.equal(maps.find((x) => x.subjectId === eng.id).practicalShare, null, 'a plain theory subject keeps no share');

    const kid = await create('/students', { firstName: 'Tess', lastName: T, classId: cls.id });
    const exam = await create('/exams', { name: `Exam ${T}`, classId: cls.id, maxMarks: 100 });
    const save = (record) => asAdmin('POST', `/exams/${exam.id}/marks`, { body: { records: [{ studentId: kid.id, ...record }] } });
    const sheet = async () => (await asAdmin('GET', `/exams/${exam.id}/marks`)).data;
    const first = await sheet();
    assert.deepEqual(first.subjects.find((x) => x.id === sci.id).split, { theory: 70, practical: 30 });
    assert.deepEqual(first.subjects.find((x) => x.id === art.id).split, { theory: 0, practical: 100 }, 'a practical-only subject is all practical');
    assert.equal(first.subjects.find((x) => x.id === eng.id).split, null);

    // each part has its own maximum
    assert.equal((await save({ subjectId: sci.id, theory: 75, practical: 20 })).status, 400, 'theory is out of 70');
    assert.equal((await save({ subjectId: sci.id, theory: 60, practical: 31 })).status, 400, 'practical is out of 30');
    assert.equal((await save({ subjectId: sci.id, theory: 60 })).status, 400, 'both parts or neither');
    assert.equal((await save({ subjectId: eng.id, theory: 50, practical: 10 })).status, 400, 'a plain subject takes one mark');
    assert.equal((await save({ subjectId: art.id, theory: 5, practical: 80 })).status, 400, 'a practical-only subject has no theory marks');

    assert.equal((await save({ subjectId: sci.id, theory: 60, practical: 25 })).status, 200);
    assert.equal((await save({ subjectId: art.id, practical: 90 })).status, 200);
    assert.equal((await save({ subjectId: eng.id, marks: 70 })).status, 200);
    const after = (await sheet()).students.find((x) => x.studentId === kid.id);
    assert.equal(Number(after.marks[sci.id]), 85, 'the subject total is theory + practical');
    assert.deepEqual(after.parts[sci.id], { theory: 60, practical: 25 });
    assert.equal(Number(after.marks[art.id]), 90);

    // results use the totals; the report card shows the parts
    const result = (await asAdmin('GET', `/exams/${exam.id}/results`)).data.rows[0];
    assert.equal(result.total, 245);
    assert.equal(result.outOf, 300);
    const card = (await asAdmin('GET', `/exams/${exam.id}/report-card/${kid.id}`)).data.subjects.find((x) => x.subjectId === sci.id);
    assert.deepEqual([card.marks, card.theoryMarks, card.practicalMarks, card.theoryMax, card.practicalMax], [85, 60, 25, 70, 30]);

    // clearing both removes the mark; a share is dropped when the subject stops being theory + practical
    assert.equal((await save({ subjectId: sci.id, theory: '', practical: '' })).status, 200);
    assert.equal((await sheet()).students.find((x) => x.studentId === kid.id).marks[sci.id], undefined);
    assert.equal((await asAdmin('PUT', `/class-subjects/${csSci}`, { body: { component: 'theory' } })).status, 200);
    assert.equal((await asAdmin('GET', `/class-subjects/map?classId=${cls.id}`)).data.subjects.find((x) => x.id === csSci).practicalShare, null);
  });
});

describe('bulk import', () => {
  test('a school can load classes, staff, subjects, curriculum, fees, books and students from spreadsheets, safely and repeatably', async () => {
    const T = `Z${RUN}`.toUpperCase().slice(0, 7); // keeps this run's records recognisable for clean-up
    const send = (kind, csv, preview = false) => asAdmin('POST', `/data/import/${kind}${preview ? '/preview' : ''}`, { raw: csv });
    const count = async (path) => (await asAdmin('GET', path)).data.length;

    cleanups.unshift(async () => {
      await import('../src/config/env.js');
      const m = await import('../src/models/index.js');
      const { Op } = await import('sequelize');
      const like = { [Op.like]: `${T}%` };
      await m.Student.destroy({ where: { admissionNo: like } });
      await m.SchoolClass.destroy({ where: { name: like } });
      await m.Staff.destroy({ where: { lastName: like } });
      await m.Subject.destroy({ where: { code: like } });
      await m.FeeType.destroy({ where: { name: like } });
      await m.Book.destroy({ where: { title: like } });
      await m.LibraryCategory.destroy({ where: { name: like } });
      await m.Department.destroy({ where: { name: like } });
      await m.Designation.destroy({ where: { name: like } });
      await m.sequelize.close();
    });

    const kinds = (await asAdmin('GET', '/data/import/datasets')).data;
    assert.deepEqual(kinds.map((k) => k.key), ['classes', 'subjects', 'departments', 'designations', 'staff', 'curriculum', 'feetypes', 'feestructure', 'books', 'students'], 'listed in the order to load them');
    for (const k of kinds) {
      const template = await fetch(`${API}/data/import/${k.key}/template`, { headers: { Authorization: `Bearer ${admin}` } });
      assert.equal(template.status, 200);
      assert.match(await template.text(), new RegExp(k.columns[0].key), `${k.key} template has its headers`);
    }
    assert.equal((await asAdmin('GET', '/data/import/nonsense/template')).status, 400);

    // Departments and designations: new, then "exists" on a second upload, never duplicated
    const departments = `name\n${T} Science\n${T} Arts\n`;
    assert.deepEqual(Object.values((await send('departments', departments, true)).data).slice(0, 4), [2, 2, 0, 0]);
    assert.deepEqual((await send('departments', departments)).data, { imported: 2, skipped: 0 });
    assert.deepEqual((await send('departments', departments)).data, { imported: 0, skipped: 2 }, 'uploading the same file again changes nothing');
    assert.equal((await send('designations', `name\n${T} Teacher\n`)).data.imported, 1);

    // Staff: numbers are generated, an unknown department is refused with a reason, a bad row blocks the whole file
    const goodStaff = `staffNo,firstName,lastName,designation,department,email,gender,employmentType\n,Asha,${T}One,${T} Teacher,${T} Science,asha.${T}@x.com,female,permanent\n${T}-S2,Ravi,${T}Two,${T} Teacher,${T} Arts,,male,part time\n`;
    const badDept = `firstName,lastName,department\nA,${T}Bad,Nowhere\n`;
    const badPreview = (await send('staff', badDept, true)).data;
    assert.equal(badPreview.errorCount, 1);
    assert.match(badPreview.rows[0].problems[0], /import departments first/);
    const staffBefore = await count('/staff');
    assert.equal((await send('staff', `${goodStaff},Zed,${T}Bad,,Nowhere,,,\n`.replace(`${goodStaff},`, goodStaff))).status, 400, 'one bad row stops the whole file');
    assert.equal(await count('/staff'), staffBefore, 'nothing was imported');
    assert.equal((await send('staff', goodStaff)).data.imported, 2);
    const staff = (await asAdmin('GET', '/staff')).data.filter((s) => s.lastName.startsWith(T));
    assert.equal(staff.length, 2);
    assert.match(staff.find((s) => s.lastName === `${T}One`).staffNo, /^STF-\d{4}-\d{4,}$/, 'a blank staff number is generated');
    assert.equal(staff.find((s) => s.lastName === `${T}Two`).employmentType, 'part_time', '"part time" is understood');
    assert.equal(staff.find((s) => s.lastName === `${T}One`).departmentName, `${T} Science`);
    const teacherNo = `${T}-S2`;

    // Classes (with a class teacher by staff number), subjects, curriculum
    assert.equal((await send('classes', `name,section,classTeacher\n${T}5,A,NO-SUCH\n`, true)).data.errorCount, 1, 'an unknown class teacher is refused');
    assert.equal((await send('classes', `name,section,classTeacher\n${T}5,A,${teacherNo}\n${T}5,B,\n`)).data.imported, 2);
    const classes = (await asAdmin('GET', '/classes')).data.filter((c) => c.name.startsWith(T));
    assert.equal(classes.find((c) => c.section === 'A').classTeacherName, 'Ravi ' + `${T}Two`);
    assert.equal((await send('subjects', `name,code\nMaths,${T}MATH\nScience,${T}SCI\n`)).data.imported, 2);
    assert.equal((await send('curriculum', `class,subject,teacher\n${T}5-A,${T}MATH,${teacherNo}\n${T}9-Z,${T}MATH,\n`, true)).data.errorCount, 1, 'an unknown class is refused');
    assert.equal((await send('curriculum', `class,subject,teacher\n${T}5-A,${T}MATH,${teacherNo}\n${T}5-A,Science,\n`)).data.imported, 2, 'a subject can be named by code or by name');

    // Fees
    assert.equal((await send('feetypes', `name,description\n${T} Tuition,Monthly\n`)).data.imported, 1);
    assert.equal((await send('feestructure', `class,title,amount\n${T}5-A,${T} Tuition,-5\n`, true)).data.errorCount, 1, 'an amount must be above zero');
    assert.equal((await send('feestructure', `class,title,amount,dueDate\n${T}5-A,${T} Tuition,1200,2031-07-10\n`)).data.imported, 1);

    // Books: the category is created on the way, an ISBN already held is left alone
    const books = `title,author,isbn,copies,category\n${T} Book,Someone,${T}-ISBN1,3,${T} Fiction\n`;
    assert.equal((await send('books', books)).data.imported, 1);
    assert.deepEqual((await send('books', books)).data, { imported: 0, skipped: 1 });

    // Students are placed in a class by its label
    const students = `admissionNo,firstName,lastName,class\n${T}-A1,Mina,${T}Kid,${T}5-A\n`;
    assert.equal((await send('students', students)).data.imported, 1);
    assert.equal((await send('students', `admissionNo,firstName,lastName,class\n${T}-A2,Kiran,${T}Kid,9-Q\n`, true)).data.errorCount, 1, 'an unknown class is refused');

    // What was loaded is what Class Readiness reads
    const ready = (await asAdmin('GET', '/setup/classes')).data.find((c) => c.name === `${T}5-A`);
    assert.equal(ready.classTeacher, `Ravi ${T}Two`);
    assert.equal(ready.subjects, 2);
    assert.equal(ready.subjectsWithoutTeacher, 1);
    assert.equal(ready.feeItems, 1);
    assert.equal(ready.students, 1);
    assert.deepEqual(ready.issues.map((i) => i.text).sort(), ['1 subject(s) without a teacher', 'No timetable']);

    const teacher = await userWithRole('teacher');
    assert.equal((await call('GET', '/data/import/datasets', { token: teacher.token })).status, 403);
    assert.equal((await call('POST', '/data/import/classes', { token: teacher.token, raw: 'name\nx\n' })).status, 403);
  });
});

describe('setup guide and class readiness', () => {
  test('the checklist ticks from real data, a class shows what it still lacks, and only admins can see it', async () => {
    const status = (await asAdmin('GET', '/setup/status')).data;
    assert.ok(status.steps.length >= 15 && status.progress.total > 0);
    assert.deepEqual(status.phases.slice(0, 2), ['Foundation', 'Academic structure']);
    assert.ok(status.steps.every((s) => s.title && s.why && s.link.startsWith('/')), 'every step explains itself and links to a screen');

    const teacher = (await create('/staff', { firstName: 'Class', lastName: `Teacher${RUN}` })).id;
    const cls = await create('/classes', { name: `Y${RUN}`.slice(0, 12), section: 'R' });
    const row = async () => (await asAdmin('GET', '/setup/classes')).data.find((c) => c.id === cls.id);

    let r = await row();
    assert.equal(r.ready, false);
    assert.deepEqual(r.issues.map((i) => i.text).sort(), ['No class teacher', 'No fee structure', 'No subjects assigned', 'No timetable']);
    assert.equal((await asAdmin('GET', '/setup/status')).data.classes.total >= 1, true);

    assert.equal((await asAdmin('PUT', `/classes/${cls.id}`, { body: { classTeacherId: 999999 } })).status, 400, 'the class teacher must exist');
    assert.equal((await asAdmin('PUT', `/classes/${cls.id}`, { body: { classTeacherId: teacher } })).status, 200);
    r = await row();
    assert.equal(r.classTeacher, `Class Teacher${RUN}`);
    assert.equal(r.issues.some((i) => i.text === 'No class teacher'), false, 'naming a teacher clears that gap');
    assert.equal((await asAdmin('GET', '/classes')).data.find((c) => c.id === cls.id).classTeacherName, `Class Teacher${RUN}`);

    await asAdmin('PUT', `/staff/${teacher}`, { body: { status: 'inactive' } });
    assert.equal((await asAdmin('PUT', `/classes/${cls.id}`, { body: { classTeacherId: teacher } })).status, 400, 'an inactive teacher cannot be class teacher');

    const nonAdmin = await userWithRole('teacher');
    assert.equal((await call('GET', '/setup/status', { token: nonAdmin.token })).status, 403);
    assert.equal((await call('GET', '/setup/classes', { token: nonAdmin.token })).status, 403);
  });
});

describe('school profile', () => {
  test('only profile fields are accepted and checked, the logo must really be an image, and staff cannot edit', async () => {
    const put = (values) => asAdmin('PUT', '/settings/profile', { body: { values } });
    const keys = ['school.website', 'school.board', 'school.established', 'school.motto'];
    cleanups.unshift(async () => { for (const key of keys) await asAdmin('POST', '/settings/reset', { body: { key } }).catch(() => {}); });

    const profile = (await asAdmin('GET', '/settings/profile')).data;
    assert.ok(profile.fields.length >= 15, 'every profile field is listed');
    assert.deepEqual(profile.fields.find((f) => f.key === 'school.board').options.slice(0, 2), ['CBSE', 'ICSE']);

    assert.equal((await put({ 'school.website': 'not a site' })).status, 400);
    assert.equal((await put({ 'school.board': 'Made up' })).status, 400, 'a choice field only takes its listed options');
    assert.equal((await put({ 'school.established': '1750' })).status, 400);
    assert.equal((await put({ 'school.timezone': '' })).status, 400, 'required fields cannot be blanked');
    assert.equal((await put({ 'library.loanDays': 3 })).status, 400, 'other settings cannot be changed through the profile');
    assert.equal((await put({ 'school.website': 'www.example.edu.in', 'school.board': 'CBSE', 'school.established': '2008', 'school.motto': `Motto ${RUN}` })).status, 200);
    const saved = (await asAdmin('GET', '/settings/profile')).data;
    assert.equal(saved.fields.find((f) => f.key === 'school.motto').value, `Motto ${RUN}`);
    assert.ok(saved.lastUpdated, 'the last-updated time is reported');

    // The logo is judged by its bytes, not by what the upload claims to be.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const send = (body, token = admin) => fetch(`${API}/settings/logo?name=logo.png`, { method: 'POST', headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${token}` }, body });
    assert.equal((await send(Buffer.from('<svg onload=alert(1)>'))).status, 400, 'text claiming to be a PNG is refused');
    assert.equal((await send(Buffer.from('%PDF-1.4 not an image'))).status, 400, 'a PDF is not a logo');
    cleanups.unshift(() => asAdmin('DELETE', '/settings/logo'));
    assert.equal((await send(png)).status, 201);
    const logo = await fetch(`${API}/settings/logo`, { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(logo.status, 200);
    assert.equal(logo.headers.get('content-type'), 'image/png');
    assert.equal((await fetch(`${API}/settings/logo`)).status, 401, 'sign-in is required to see it');

    const teacher = await userWithRole('teacher');
    assert.equal((await call('PUT', '/settings/profile', { token: teacher.token, body: { values: { 'school.motto': 'x' } } })).status, 403);
    assert.equal((await send(png, teacher.token)).status, 403);
  });
});

describe('audit log', () => {
  test('full-table downloads are recorded, ordinary reads are not, and the log can be filtered', async () => {
    const before = (await asAdmin('GET', '/audit?method=GET')).data.total;
    assert.equal((await asAdmin('GET', '/data/export/students')).status, 200);
    assert.equal((await asAdmin('GET', '/data/export/nonsense')).status, 400, 'a failed download is not logged as a success');
    assert.equal((await asAdmin('GET', '/students')).status, 200, 'an ordinary read');
    await new Promise((r) => setTimeout(r, 300)); // the entry is written after the response is sent
    const after = await asAdmin('GET', '/audit?method=GET');
    assert.equal(after.data.total, before + 1, 'exactly the export was recorded');
    assert.equal(after.data.rows[0].path, '/api/data/export/students');
    assert.equal(after.data.rows[0].resource, 'data');

    assert.ok((await asAdmin('GET', '/audit/resources')).data.includes('data'), 'the area list comes from the log itself');
    assert.equal((await asAdmin('GET', '/audit?q=export/students')).data.rows.length > 0, true, 'free-text search on the path');
    assert.equal((await asAdmin('GET', '/audit?from=2999-01-01')).data.total, 0, 'date filter');
    assert.equal((await asAdmin('GET', '/audit?method=TRACE')).status, 400);
    assert.equal((await asAdmin('GET', '/audit?from=yesterday')).status, 400);
    const teacher = await userWithRole('teacher');
    assert.equal((await call('GET', '/audit', { token: teacher.token })).status, 403, 'admin only');
  });
});

describe('type-ahead search', () => {
  test('every word must match, wildcards are literal, results are capped, exclusion and id lookup work', async () => {
    const tag = `Tq${RUN}`;
    const a = (await create('/students', { firstName: 'Ravi', lastName: `Shah${tag}`, dob: '2013-01-01' })).id;
    const b = (await create('/students', { firstName: 'Ravi', lastName: `Patel${tag}`, dob: '2013-01-02' })).id;
    const find = async (query) => (await asAdmin('GET', `/lookup/students?${query}`)).data;

    assert.deepEqual((await find(`q=ravi%20sha`)).filter((r) => r.label.includes(tag)).map((r) => r.id), [a], 'every word must match, in any order');
    assert.deepEqual((await find(`q=${encodeURIComponent(`shah${tag} ravi`)}`)).map((r) => r.id), [a], 'order of the words does not matter');
    assert.equal((await find(`q=${encodeURIComponent(`Ravi ${tag}`)}`)).length, 2);
    assert.equal((await find('q=%25')).length, 0, 'a typed % is a character, not a wildcard');
    assert.equal((await find('q=_')).length, 0, 'a typed _ is a character, not a wildcard');

    const without = await find(`q=${encodeURIComponent(tag)}&exclude=${a}`);
    assert.deepEqual(without.map((r) => r.id), [b], 'excluded ids are left out by the server');
    const one = await find(`id=${a}`);
    assert.equal(one.length, 1);
    assert.match(one[0].label, /Ravi/);
    assert.deepEqual(Object.keys(one[0]).sort(), ['id', 'label', 'sub'], 'only a label and one line of context are returned');
    assert.ok((await find('limit=1000')).length <= 25, 'never more than 25 rows');

    assert.equal((await call('GET', '/lookup/students')).status, 401, 'sign-in is required');
    const teacher = await userWithRole('teacher');
    assert.equal((await call('GET', `/lookup/students?q=${tag}`, { token: teacher.token })).status, 200, 'staff logins can search');
    const role = await create('/roles', { name: `Search ${RUN}`, baseRole: 'teacher', permissions: { library: 'read' } });
    const narrowed = await userWithRole('teacher', { roleId: role.id });
    assert.equal((await call('GET', '/lookup/students', { token: narrowed.token })).status, 200, 'pickers work for every custom role');
  });
});

describe('library cards', () => {
  test('a card limits books at a time, can be suspended or expired, and cannot be withdrawn while books are out', async () => {
    const holder = (await create('/students', { firstName: 'Lib', lastName: `Card${RUN}` })).id;
    const book = (await create('/library/books', { title: `Book ${RUN}`, copies: 5 }, '/library/books')).id;
    const loans = [];
    const lend = async () => {
      const r = await asAdmin('POST', '/library/issues', { body: { bookId: book, studentId: holder } });
      if (r.status === 201) loans.push(r.data.id);
      return r;
    };
    // Books must be back before the book and student can be deleted (cleanups run last-in first-out).
    cleanups.unshift(async () => { for (const id of loans) await asAdmin('POST', `/library/issues/${id}/return`).catch(() => {}); });

    const card = await create('/library/memberships', { studentId: holder, maxBooks: 2 });
    assert.equal((await asAdmin('POST', '/library/memberships', { body: { studentId: holder } })).status, 409, 'one card per student');
    assert.equal((await lend()).status, 201);
    assert.equal((await lend()).status, 201);
    assert.equal((await lend()).status, 409, 'a third book is over the limit');

    const mine = (await asAdmin('GET', '/library/memberships')).data.find((c) => c.id === card.id);
    assert.match(mine.cardNo, /^LIB-\d{5,}$/);
    assert.equal(mine.onLoan, 2);

    assert.equal((await asAdmin('PUT', `/library/memberships/${card.id}`, { body: { maxBooks: 5, status: 'suspended' } })).status, 200);
    assert.equal((await lend()).status, 409, 'a suspended card cannot borrow');
    assert.equal((await asAdmin('PUT', `/library/memberships/${card.id}`, { body: { status: 'active', memberSince: '2019-01-01', validUntil: '2020-01-01' } })).status, 200);
    assert.equal((await lend()).status, 409, 'an expired card cannot borrow');
    assert.equal((await asAdmin('DELETE', `/library/memberships/${card.id}`)).status, 409, 'a card with books out cannot be withdrawn');
  });
});


describe('class teacher', () => {
  test('a login linked to staff sees only the classes they teach', async () => {
    const staff = await create('/staff', { firstName: 'Class', lastName: `Teacher${RUN}` });
    const other = await create('/staff', { firstName: 'Other', lastName: `Teacher${RUN}` });
    const cls = await create('/classes', { name: `T${RUN}`.slice(0, 12), section: 'M', classTeacherId: staff.id });
    const rival = await create('/classes', { name: `U${RUN}`.slice(0, 12), section: 'M', classTeacherId: other.id });

    const teacher = await userWithRole('teacher');
    assert.deepEqual((await call('GET', '/my-class', { token: teacher.token })).data, [], 'not linked yet, so no classes');
    assert.equal((await asAdmin('PUT', `/users/${teacher.id}`, { body: { staffId: 999999 } })).status, 400, 'unknown staff');
    assert.equal((await asAdmin('PUT', `/users/${teacher.id}`, { body: { staffId: staff.id } })).status, 200);
    const second = await userWithRole('teacher');
    assert.equal((await asAdmin('PUT', `/users/${second.id}`, { body: { staffId: staff.id } })).status, 409, 'one login per staff member');

    const mine = (await call('GET', '/my-class', { token: teacher.token })).data;
    assert.deepEqual(mine.map((c) => c.id), [cls.id]);
    assert.deepEqual((await call('GET', '/auth/me', { token: teacher.token })).data.classes.map((c) => c.id), [cls.id]);

    const today = (await call('GET', `/my-class/${cls.id}`, { token: teacher.token }));
    assert.equal(today.status, 200);
    assert.equal(today.data.totals.students, 0);
    assert.equal((await call('GET', `/my-class/${rival.id}`, { token: teacher.token })).status, 403, 'not the class teacher of that class');
    assert.equal((await asAdmin('GET', `/my-class/${rival.id}`)).status, 200, 'an admin can open any class');
  });
});
