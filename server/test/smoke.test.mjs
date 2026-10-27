// End-to-end checks of the rules that must never regress. Run with the API up:  npm test --prefix server
// It talks to the running server (API_URL, default http://localhost:4000/api) and signs in as the seeded admin
// (ADMIN_EMAIL / ADMIN_PASSWORD). Everything it creates is deleted again, even when an assertion fails.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

const API = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@school.local', password: process.env.ADMIN_PASSWORD || 'admin123' };
const RUN = Date.now().toString(36); // keeps names unique between runs
const cleanups = [];

async function call(method, path, { token, body, raw, contentType } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(raw ? { 'Content-Type': contentType } : body && { 'Content-Type': 'application/json' }),
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let admin;
const asAdmin = (method, path, opts = {}) => call(method, path, { token: admin, ...opts });
/** Creates something and queues its deletion; returns the new id. */
async function create(path, body, deletePath) {
  const { status, data } = await asAdmin('POST', path, { body });
  assert.equal(status, 201, `create ${path}: ${JSON.stringify(data)}`);
  cleanups.unshift(() => asAdmin('DELETE', `${deletePath ?? path}/${data.id}`));
  return data.id;
}

before(async () => {
  const { status, data } = await call('POST', '/auth/login', { body: ADMIN });
  assert.equal(status, 200, 'admin sign-in failed: is the server running with the seeded admin?');
  admin = data.token;
});

after(async () => {
  for (const undo of cleanups) await undo().catch(() => {});
  await removeInventoryTestData();
});

/** Runs `fn(models)` against the database directly, for set-up the API deliberately does not allow. */
async function withDb(fn) {
  await import('../src/config/env.js');
  return fn(await import('../src/models/index.js'));
}

/**
 * Stock history cannot be deleted through the API (by design), so the test removes its own inventory rows directly.
 */
async function removeInventoryTestData() {
  try {
    await import('../src/config/env.js');
    const m = await import('../src/models/index.js');
    const items = await m.InventoryItem.findAll({ where: { name: [`Item ${RUN}`, `ReqItem ${RUN}`] } });
    const suppliers = await m.Supplier.findAll({ where: { name: `Supplier ${RUN}` } });
    const itemIds = items.map((i) => i.id);
    const orders = await m.PurchaseOrder.findAll({ where: { supplierId: suppliers.map((x) => x.id) } });
    await m.InventoryRequest.destroy({ where: { itemId: itemIds } });
    await m.StockMovement.destroy({ where: { itemId: itemIds } });
    await m.PurchaseOrderLine.destroy({ where: { orderId: orders.map((o) => o.id) } });
    await m.PurchaseOrder.destroy({ where: { id: orders.map((o) => o.id) } });
    await m.InventoryItem.destroy({ where: { id: itemIds } });
    await m.Supplier.destroy({ where: { id: suppliers.map((x) => x.id) } });
    await m.sequelize.close();
  } catch (err) {
    console.warn('Could not remove inventory test data:', err.message);
  }
}

describe('authentication', () => {
  test('a token stops working when its user is deleted or demoted', async () => {
    const id = await create('/users', { name: 'Tmp', email: `tmp-${RUN}@test.local`, password: 'password123', role: 'teacher' });
    const { data } = await call('POST', '/auth/login', { body: { email: `tmp-${RUN}@test.local`, password: 'password123' } });
    assert.equal((await call('GET', '/student-health', { token: data.token })).status, 200);
    await asAdmin('PUT', `/users/${id}`, { body: { role: 'accountant' } });
    assert.equal((await call('GET', '/student-health', { token: data.token })).status, 403);
    await asAdmin('DELETE', `/users/${id}`);
    assert.equal((await call('GET', '/students', { token: data.token })).status, 401);
  });

  test('requests without a valid token are refused', async () => {
    assert.equal((await call('GET', '/students')).status, 401);
    assert.equal((await call('GET', '/students', { token: 'garbage' })).status, 401);
  });
});

describe('students, files and student login', () => {
  let studentId;
  let otherId;
  before(async () => {
    studentId = await create('/students', { admissionNo: `T${RUN}a`, firstName: 'Test', lastName: 'One', gender: 'male' });
    otherId = await create('/students', { admissionNo: `T${RUN}b`, firstName: 'Test', lastName: 'Two', gender: 'female' });
  });

  test('uploads are checked by content, not by the name or type the client claims', async () => {
    const url = (kind) => `/student-files?studentId=${studentId}&kind=${kind}&name=x`;
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
    assert.equal((await asAdmin('POST', url('photo'), { raw: png, contentType: 'image/png' })).status, 201);
    assert.equal((await asAdmin('POST', url('photo'), { raw: Buffer.from('<html>'), contentType: 'image/png' })).status, 400);
    assert.equal((await asAdmin('POST', url('photo'), { raw: Buffer.from('%PDF-1.4 x'), contentType: 'application/pdf' })).status, 400);
    assert.equal((await asAdmin('POST', url('document'), { raw: Buffer.from('%PDF-1.4 x'), contentType: 'application/pdf' })).status, 201);
    assert.equal((await asAdmin('POST', url('document'), { raw: Buffer.alloc(6 * 1024 * 1024, 1), contentType: 'application/pdf' })).status, 413);
    const { data } = await asAdmin('GET', `/student-files?studentId=${studentId}`);
    assert.equal(data.filter((f) => f.kind === 'photo').length, 1, 'a student keeps a single photo');
  });

  test('a student sees only their own record, read-only', async () => {
    await create('/student-accounts', { studentId, email: `stu-${RUN}@test.local`, password: 'password123' });
    const { data } = await call('POST', '/auth/login', { body: { email: `stu-${RUN}@test.local`, password: 'password123' } });
    // a new account holds a temporary password: nothing but changing it works until then
    assert.equal((await call('GET', `/portal/children/${studentId}/overview`, { token: data.token })).status, 403);
    assert.equal((await call('POST', '/auth/change-password', { token: data.token, body: { currentPassword: 'password123', newPassword: 'password-45678' } })).status, 200);
    const token = (await call('POST', '/auth/login', { body: { email: `stu-${RUN}@test.local`, password: 'password-45678' } })).data.token;
    assert.equal((await call('GET', `/portal/children/${studentId}/overview`, { token })).status, 200);
    assert.equal((await call('GET', `/portal/children/${otherId}/overview`, { token })).status, 404);
    // a student may apply for leave (an empty request is refused as invalid), but every other write is closed
    assert.equal((await call('POST', `/portal/children/${studentId}/leaves`, { token, body: {} })).status, 400);
    assert.equal((await call('POST', `/portal/children/${studentId}/anything`, { token, body: {} })).status, 403);
    assert.equal((await call('GET', '/students', { token })).status, 403);
    assert.equal((await call('GET', '/student-accounts', { token })).status, 403);
  });
});

describe('hostel', () => {
  test('capacity and gender rules, and fees are billed once', async () => {
    const hostel = await create('/hostel/hostels', { name: `Hostel ${RUN}`, type: 'boys' });
    const room = await create('/hostel/rooms', { hostelId: hostel, roomNo: '1', capacity: 1, monthlyFee: 100 });
    // Created last, so cleanup (which runs in reverse) removes the students before the room and the hostel.
    const boy = await create('/students', { admissionNo: `H${RUN}a`, firstName: 'H', lastName: 'Boy', gender: 'male' });
    const girl = await create('/students', { admissionNo: `H${RUN}b`, firstName: 'H', lastName: 'Girl', gender: 'female' });
    const boy2 = await create('/students', { admissionNo: `H${RUN}c`, firstName: 'H', lastName: 'Boy2', gender: 'male' });
    assert.equal((await asAdmin('POST', '/hostel/allocations', { body: { studentId: girl, roomId: room } })).status, 409, 'girl in boys hostel');
    assert.equal((await asAdmin('POST', '/hostel/allocations', { body: { studentId: boy, roomId: room } })).status, 201);
    assert.equal((await asAdmin('POST', '/hostel/allocations', { body: { studentId: boy2, roomId: room } })).status, 409, 'room full');
    const month = '2031-01';
    const first = await asAdmin('POST', '/hostel/fees/generate', { body: { month } });
    const second = await asAdmin('POST', '/hostel/fees/generate', { body: { month } });
    assert.equal(first.data.created, 1);
    assert.equal(second.data.created, 0, 'second run must not double-bill');
  });
});

describe('inventory', () => {
  test('simultaneous stock-outs never take more than is in stock; an order is received once', async () => {
    const supplier = await create('/inventory/suppliers', { name: `Supplier ${RUN}` });
    const item = await create('/inventory/items', { name: `Item ${RUN}`, unit: 'pcs', reorderLevel: 1 });
    await asAdmin('POST', '/inventory/movements', { body: { itemId: item, type: 'in', quantity: 10, unitCost: 5 } });
    const outs = await Promise.all(Array.from({ length: 8 }, () => asAdmin('POST', '/inventory/movements', { body: { itemId: item, type: 'out', quantity: 2 } })));
    assert.equal(outs.filter((r) => r.status === 201).length, 5);
    assert.equal(outs.filter((r) => r.status === 409).length, 3);
    const stock = async () => (await asAdmin('GET', '/inventory/items')).data.find((i) => i.id === item).quantity;
    assert.equal(await stock(), 0);

    const { data: order } = await asAdmin('POST', '/inventory/orders', { body: { supplierId: supplier, lines: [{ itemId: item, quantity: 7, unitCost: 6 }] } });
    const receives = await Promise.all([1, 2, 3].map(() => asAdmin('POST', `/inventory/orders/${order.id}/receive`)));
    assert.equal(receives.filter((r) => r.status === 200).length, 1);
    assert.equal(await stock(), 7);
  });
});

describe('messaging', () => {
  test('rejects bad input and never delivers a number without a country code', async () => {
    const send = (body) => asAdmin('POST', '/messaging/send', { body });
    assert.equal((await send({ channel: 'fax', to: '1', body: 'x' })).status, 400);
    assert.equal((await send({ channel: 'email', to: 'not-an-email', subject: 's', body: 'x' })).status, 400);
    assert.equal((await send({ channel: 'email', to: 'a@b.com', body: 'x' })).status, 400, 'email needs a subject');
    const noCountry = await send({ channel: 'sms', to: '9876543210', body: 'x' });
    if (!process.env.DEFAULT_COUNTRY_CODE) assert.equal(noCountry.status, 400);
  });
});

describe('fees', () => {
  test('a fee with payment history cannot be moved, re-priced or deleted; bad amounts are refused', async () => {
    const s1 = await create('/students', { admissionNo: `F${RUN}a`, firstName: 'F', lastName: 'One' });
    const s2 = await create('/students', { admissionNo: `F${RUN}b`, firstName: 'F', lastName: 'Two' });
    assert.equal((await asAdmin('POST', '/fees', { body: { studentId: s1, title: 'Bad', amount: -50 } })).status, 400);
    assert.equal((await asAdmin('POST', '/fees', { body: { studentId: s1, title: 'Zero', amount: 0 } })).status, 400);
    const fee = (await asAdmin('POST', '/fees', { body: { studentId: s1, title: `Fee ${RUN}`, amount: 100 } })).data.id;

    assert.equal((await asAdmin('PUT', `/fees/${fee}`, { body: { title: `Fee ${RUN} renamed`, amount: 120 } })).status, 200, 'unpaid fee is editable');
    const pay = await asAdmin('POST', `/fees/${fee}/payments`, { body: { amount: 120, method: 'cash' } });
    assert.equal(pay.status, 201);
    // refunds only gain their foreign key once old orphans are cleared, so the test removes its own refund
    cleanups.unshift(() => withDb((m) => m.Refund.destroy({ where: { paymentId: pay.data.id } })));
    assert.equal((await asAdmin('PUT', `/fees/${fee}`, { body: { studentId: s2 } })).status, 409, 'cannot move paid fee to another student');
    assert.equal((await asAdmin('PUT', `/fees/${fee}`, { body: { amount: 1 } })).status, 409, 'cannot re-price a paid fee');
    assert.equal((await asAdmin('PUT', `/fees/${fee}`, { body: { dueDate: '2031-01-01' } })).status, 200, 'due date still editable');

    // fully refunded: paid amount is back to 0, but the payment history must still protect the fee
    assert.equal((await asAdmin('POST', `/fees/payments/${pay.data.id}/refund`, { body: { amount: 120, reason: 'test' } })).status, 201);
    assert.equal((await asAdmin('DELETE', `/fees/${fee}`)).status, 409, 'refunded fee keeps its history');
    assert.equal((await asAdmin('POST', `/fees/${fee}/payments`, { body: { amount: 500 } })).status, 409, 'overpayment refused');
  });
});

describe('library fines', () => {
  test('a late return bills the fine as a fee, once; past fines can be backfilled safely', async () => {
    const student = await create('/students', { admissionNo: `LF${RUN}a`, firstName: 'L', lastName: 'Fine' });
    const book = (await asAdmin('POST', '/library/books', { body: { title: `FineBook ${RUN}`, copies: 2 } })).data.id;
    cleanups.unshift(() => asAdmin('DELETE', `/library/books/${book}`));
    const loan = (await asAdmin('POST', '/library/issues', { body: { bookId: book, studentId: student, days: 7 } })).data.id;

    // Make the loan 5 days overdue, then return it: 5 days x 2 per day = 10.
    await withDb(async (m) => {
      const due = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
      await m.BookIssue.update({ dueOn: due }, { where: { id: loan } });
    });
    const returned = await asAdmin('POST', `/library/issues/${loan}/return`);
    assert.equal(returned.data.fine, '10.00');
    assert.equal(returned.data.billed, true);

    const fees = (await asAdmin('GET', `/fees?studentId=${student}`)).data;
    assert.equal(fees.length, 1);
    assert.equal(Number(fees[0].amount), 10);
    assert.match(fees[0].title, /^Library fine #/);

    const again = await asAdmin('POST', '/library/issues/bill-fines');
    assert.equal(again.status, 200);
    assert.equal((await asAdmin('GET', `/fees?studentId=${student}`)).data.length, 1, 'backfill must not bill the same fine twice');

    const onTime = (await asAdmin('POST', '/library/issues', { body: { bookId: book, studentId: student, days: 7 } })).data.id;
    assert.equal((await asAdmin('POST', `/library/issues/${onTime}/return`)).data.billed, false);
    assert.equal((await asAdmin('GET', `/fees?studentId=${student}`)).data.length, 1, 'an on-time return bills nothing');
  });
});

describe('payroll', () => {
  test('an accountant prepares payslips but only an admin can approve payment', async () => {
    const staff = await create('/staff', { staffNo: `PS${RUN}`, firstName: 'Pay', lastName: 'Roll', email: `pay-${RUN}@test.local` });
    // Payslips are payroll records, so staff who have any cannot be deleted; the test removes its own directly.
    cleanups.unshift(() => withDb(async (m) => { await m.Payslip.destroy({ where: { staffId: staff } }); await m.StaffSalary.destroy({ where: { staffId: staff } }); }));
    await create('/users', { name: 'Acct', email: `acct-${RUN}@test.local`, password: 'password123', role: 'accountant' });
    const acct = (await call('POST', '/auth/login', { body: { email: `acct-${RUN}@test.local`, password: 'password123' } })).data.token;
    const month = '2031-02';

    assert.equal((await call('PUT', `/payroll/salaries/${staff}`, { token: acct, body: { basic: 1000, allowances: 100, deductions: 50 } })).status, 200);
    assert.equal((await call('POST', '/payroll/generate', { token: acct, body: { month } })).status, 200);
    const slip = (await call('GET', `/payroll/payslips?month=${month}`, { token: acct })).data.find((p) => p.staffId === staff);
    assert.equal(slip.net, '1050.00');

    assert.equal((await call('POST', `/payroll/payslips/${slip.id}/pay`, { token: acct })).status, 403, 'accountant cannot approve');
    assert.equal((await asAdmin('POST', `/payroll/payslips/${slip.id}/pay`)).status, 200);
    assert.equal((await asAdmin('POST', `/payroll/payslips/${slip.id}/pay`)).status, 409, 'cannot pay twice');
    const paid = (await asAdmin('GET', `/payroll/payslips?month=${month}`)).data.find((p) => p.id === slip.id);
    assert.equal(paid.status, 'paid');
    assert.equal(paid.paidByName, 'Admin', 'the approver is recorded');
  });
});

describe('exams, attendance and library validation', () => {
  test('marks only accepted for the exam class and its subjects', async () => {
    const cls = await create('/classes', { name: `T${RUN}`, section: 'A' });
    const subj = await create('/subjects', { name: `Sub ${RUN}`, code: `S${RUN}`.slice(0, 20) });
    const other = await create('/subjects', { name: `Other ${RUN}`, code: `O${RUN}`.slice(0, 20) });
    const inside = await create('/students', { admissionNo: `E${RUN}a`, firstName: 'E', lastName: 'In', classId: cls });
    const outside = await create('/students', { admissionNo: `E${RUN}b`, firstName: 'E', lastName: 'Out' });
    await create('/class-subjects', { classId: cls, subjectId: subj });
    const exam = await create('/exams', { name: `Exam ${RUN}`, classId: cls, maxMarks: 50 });
    const save = (records) => asAdmin('POST', `/exams/${exam}/marks`, { body: { records } });
    assert.equal((await save([{ studentId: inside, subjectId: subj, marks: 40 }])).status, 200);
    assert.equal((await save([{ studentId: inside, subjectId: subj, marks: 51 }])).status, 400, 'over the maximum');
    assert.equal((await save([{ studentId: outside, subjectId: subj, marks: 40 }])).status, 400, 'student from another class');
    assert.equal((await save([{ studentId: inside, subjectId: other, marks: 40 }])).status, 400, 'subject the class does not study');
    assert.equal((await save('nonsense')).status, 400);
  });

  test('a teacher can enter marks only for subjects assigned to them', async () => {
    const cls = await create('/classes', { name: `M${RUN}`, section: 'A' });
    const mine = await create('/subjects', { name: `Mine ${RUN}`, code: `MI${RUN}`.slice(0, 20) });
    const theirs = await create('/subjects', { name: `Theirs ${RUN}`, code: `TH${RUN}`.slice(0, 20) });
    const student = await create('/students', { admissionNo: `TM${RUN}a`, firstName: 'T', lastName: 'M', classId: cls });
    const me = await create('/staff', { staffNo: `TS${RUN}a`, firstName: 'Me', lastName: 'Teacher', email: `teach-${RUN}@test.local` });
    const other = await create('/staff', { staffNo: `TS${RUN}b`, firstName: 'Other', lastName: 'Teacher', email: `other-${RUN}@test.local` });
    await create('/class-subjects', { classId: cls, subjectId: mine, staffId: me });
    await create('/class-subjects', { classId: cls, subjectId: theirs, staffId: other });
    const exam = await create('/exams', { name: `TExam ${RUN}`, classId: cls, maxMarks: 100 });
    await create('/users', { name: 'Teach', email: `teach-${RUN}@test.local`, password: 'password123', role: 'teacher' });
    await create('/users', { name: 'Stranger', email: `stranger-${RUN}@test.local`, password: 'password123', role: 'teacher' });
    const token = async (email) => (await call('POST', '/auth/login', { body: { email, password: 'password123' } })).data.token;
    const teacher = await token(`teach-${RUN}@test.local`);
    const stranger = await token(`stranger-${RUN}@test.local`);
    const save = (t, subjectId) => call('POST', `/exams/${exam}/marks`, { token: t, body: { records: [{ studentId: student, subjectId, marks: 70 }] } });

    assert.equal((await save(teacher, mine)).status, 200, 'own subject');
    assert.equal((await save(teacher, theirs)).status, 403, "another teacher's subject");
    assert.equal((await save(stranger, mine)).status, 403, 'login with no staff profile');
    assert.equal((await save(admin, theirs)).status, 200, 'admin may enter any subject');

    const sheet = (await call('GET', `/exams/${exam}/marks`, { token: teacher })).data;
    assert.deepEqual(sheet.subjects.map((x) => [x.id, x.editable]).sort(), [[mine, true], [theirs, false]].sort());
  });

  test('attendance rejects bad status, unknown students and future dates', async () => {
    const id = await create('/students', { admissionNo: `A${RUN}a`, firstName: 'A', lastName: 'One' });
    const day = new Date().toISOString().slice(0, 10);
    const mark = (body) => asAdmin('POST', '/attendance', { body });
    assert.equal((await mark({ date: day, records: [{ studentId: id, status: 'present' }] })).status, 200);
    assert.equal((await mark({ date: day, records: [{ studentId: id, status: 'sleeping' }] })).status, 400);
    assert.equal((await mark({ date: day, records: [{ studentId: 99999999, status: 'present' }] })).status, 400);
    assert.equal((await mark({ date: day, records: 'x' })).status, 400);
    assert.equal((await mark({ date: '2999-01-01', records: [{ studentId: id, status: 'present' }] })).status, 400);
  });

  test('library loan period must be sensible', async () => {
    const student = await create('/students', { admissionNo: `L${RUN}a`, firstName: 'L', lastName: 'One' });
    const book = (await asAdmin('POST', '/library/books', { body: { title: `Book ${RUN}`, copies: 1 } })).data.id;
    cleanups.unshift(() => asAdmin('DELETE', `/library/books/${book}`));
    for (const days of [-5, 0, 100000, 'abc']) {
      assert.equal((await asAdmin('POST', '/library/issues', { body: { bookId: book, studentId: student, days } })).status, 400, `days=${days}`);
    }
    const ok = await asAdmin('POST', '/library/issues', { body: { bookId: book, studentId: student, days: 7 } });
    assert.equal(ok.status, 201);
    assert.equal((await asAdmin('POST', `/library/issues/${ok.data.id}/return`)).status, 200);
  });
});

describe('inventory requests', () => {
  test('staff request items; approval issues stock once and never beyond what is in stock', async () => {
    const item = await create('/inventory/items', { name: `ReqItem ${RUN}`, unit: 'pcs', reorderLevel: 0 });
    await create('/users', { name: 'Req Teacher', email: `req-${RUN}@test.local`, password: 'password123', role: 'teacher' });
    await create('/users', { name: 'Other Teacher', email: `req2-${RUN}@test.local`, password: 'password123', role: 'teacher' });
    const login = async (email) => (await call('POST', '/auth/login', { body: { email, password: 'password123' } })).data.token;
    const teacher = await login(`req-${RUN}@test.local`);
    const other = await login(`req2-${RUN}@test.local`);
    await asAdmin('POST', '/inventory/movements', { body: { itemId: item, type: 'in', quantity: 10, unitCost: 2 } });
    const stock = async () => (await asAdmin('GET', '/inventory/items')).data.find((i) => i.id === item).quantity;
    const ask = (token, quantity) => call('POST', '/inventory-requests', { token, body: { itemId: item, quantity, reason: 'Science lab' } });

    assert.equal((await call('GET', '/inventory/items', { token: teacher })).status, 403, 'full inventory stays admin-only');
    assert.equal((await call('GET', '/inventory-requests/catalog', { token: teacher })).status, 200);
    assert.equal((await ask(teacher, 0)).status, 400);
    assert.equal((await call('POST', '/inventory-requests', { token: teacher, body: { itemId: item, quantity: 1 } })).status, 400, 'a reason is required');

    const first = (await ask(teacher, 4)).data.id;
    assert.equal((await call('POST', `/inventory-requests/${first}/approve`, { token: teacher })).status, 403, 'a teacher cannot approve');
    assert.equal((await call('GET', '/inventory-requests', { token: other })).data.length, 0, 'requests are private to the requester');
    assert.equal((await call('POST', `/inventory-requests/${first}/cancel`, { token: other })).status, 404, "cannot cancel someone else's request");

    assert.equal((await asAdmin('POST', `/inventory-requests/${first}/approve`, { body: { quantity: 3 } })).status, 200, 'approve fewer than asked');
    assert.equal(await stock(), 7);
    assert.equal((await asAdmin('POST', `/inventory-requests/${first}/approve`)).status, 409, 'cannot approve twice');
    assert.equal(await stock(), 7, 'a second approval must not issue again');
    const mine = (await call('GET', '/inventory-requests', { token: teacher })).data.find((r) => r.id === first);
    assert.equal(mine.status, 'approved');
    assert.equal(mine.approvedQuantity, 3);

    const tooMany = (await ask(teacher, 50)).data.id;
    assert.equal((await asAdmin('POST', `/inventory-requests/${tooMany}/approve`)).status, 409, 'not enough stock');
    assert.equal((await asAdmin('GET', '/inventory-requests?status=pending')).data.some((r) => r.id === tooMany), true, 'stays pending');
    assert.equal((await asAdmin('POST', `/inventory-requests/${tooMany}/reject`, { body: {} })).status, 400, 'rejection needs a reason');
    assert.equal((await asAdmin('POST', `/inventory-requests/${tooMany}/reject`, { body: { remarks: 'Too many' } })).status, 200);

    const withdrawn = (await ask(teacher, 1)).data.id;
    assert.equal((await call('POST', `/inventory-requests/${withdrawn}/cancel`, { token: teacher })).status, 200);
    assert.equal((await asAdmin('POST', `/inventory-requests/${withdrawn}/approve`)).status, 409, 'cancelled requests cannot be approved');
    assert.equal((await asAdmin('DELETE', `/inventory/items/${item}`)).status, 409, 'an item with requests is kept');
  });
});

describe('permanent delete', () => {
  test('removing a student for good leaves no certificate request pointing at them', async () => {
    const studentId = await create('/students', { admissionNo: `P${RUN}`, firstName: 'Purge', lastName: 'Test', gender: 'male' });
    const cert = await asAdmin('POST', '/documents', { body: { studentId, type: 'bonafide', purpose: 'test' } });
    assert.equal(cert.status, 201, JSON.stringify(cert.data));
    await asAdmin('DELETE', `/documents/${cert.data.id}`); // soft delete: the row stays, hidden
    const left = await withDb(async (m) => {
      await m.Student.destroy({ where: { id: studentId }, force: true });
      const [[{ n }]] = await m.sequelize.query('SELECT COUNT(*) n FROM document_requests WHERE student_id = ?', { replacements: [studentId] });
      return Number(n);
    });
    assert.equal(left, 0, 'the soft-deleted certificate request went with the student');
  });
});

describe('scheduled backup', () => {
  test('a backup file is written once per interval, is a valid backup, and old ones are pruned', async () => {
    const fsp = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'erp-backup-'));
    try {
      const { runAutoBackup } = await import('../src/modules/settings/autoBackup.service.js');
      const first = await withDb(() => runAutoBackup({ dir, everyHours: 24, keep: 2 }));
      assert.equal(first.ran, true);
      const written = JSON.parse(await fsp.readFile(path.join(dir, first.file), 'utf8'));
      assert.equal(written.format, 'school-erp-backup');
      assert.ok(written.tables.users.length >= 1, 'it holds the user accounts');
      assert.equal((await runAutoBackup({ dir, everyHours: 24, keep: 2 })).ran, false, 'a recent backup is not repeated');
      // older files beyond the keep count are removed
      for (const [i, name] of ['school-erp-backup-2020-01-01-0000.json', 'school-erp-backup-2020-01-02-0000.json'].entries()) {
        await fsp.writeFile(path.join(dir, name), '{}');
        await fsp.utimes(path.join(dir, name), new Date(2020, 0, i + 1), new Date(2020, 0, i + 1));
      }
      await fsp.utimes(path.join(dir, first.file), new Date(2020, 0, 3), new Date(2020, 0, 3)); // now the newest file is old enough to be replaced
      const again = await runAutoBackup({ dir, everyHours: 24, keep: 2 });
      assert.equal(again.ran, true);
      assert.equal((await fsp.readdir(dir)).filter((n) => n.endsWith('.json')).length, 2, 'only the newest two are kept');
    } finally {
      await fsp.rm(dir, { recursive: true, force: true });
    }
  });
});
