import { money, niceDate } from '../ui';
import { badgeFor, dateTime } from './format';

const dot = (...xs) => xs.filter((x) => x !== null && x !== undefined && x !== '').join(' · ');
const ym = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const decide = (base) => [
  { label: 'Approve', path: (r) => `${base}/${r.id}/approve`, body: () => ({}), fields: [{ key: 'remarks', label: 'Note (optional)' }], submit: 'Approve', done: () => 'Approved.' },
  { label: 'Reject', tone: 'danger', path: (r) => `${base}/${r.id}/reject`, fields: [{ key: 'remarks', label: 'Reason', required: true, multiline: true }], submit: 'Reject', done: () => 'Rejected.' },
];

/**
 * What the mobile app offers staff, grouped like the web menu. The API still decides who may do what; `roles` only hides what would be refused.
 * A screen is a list (rows from the API, tap for detail and actions), a stats page (tiles and lists), or a custom screen.
 */
export const STAFF_MODULES = [
  {
    key: 'admissions', title: 'Admissions', icon: '\u{1F4DD}', roles: ['admin'],
    screens: [
      { key: 'enquiries', title: 'Enquiries', kind: 'list', path: '/admissions/enquiries?pageSize=200', pick: (d) => d.rows, row: (r) => ({ title: r.applicantName, sub: dot(r.className, r.guardianName, r.guardianPhone), badge: badgeFor(r.status, r.stageLabel) }) },
      { key: 'applications', title: 'Applications', kind: 'list', path: '/admissions/applications?pageSize=200', pick: (d) => d.rows, row: (r) => ({ title: r.applicantName, sub: dot(r.applicationId, r.className), badge: badgeFor(r.status, r.stageLabel) }) },
      {
        key: 'offers', title: 'Offers and enrolment', kind: 'list', path: '/admissions/offers',
        row: (r) => ({ title: r.applicantName, sub: dot(r.className, r.offerExpiry ? `offer until ${niceDate(r.offerExpiry)}` : null), badge: r.expired ? { text: 'Expired', tone: 'red' } : badgeFor(r.status, r.status === 'approved' ? 'Offered' : undefined) }),
        actions: [{
          label: 'Enroll as student', when: (r) => r.status === 'approved' && !r.expired, path: (r) => `/admissions/${r.id}/enroll`, body: () => ({}),
          confirm: 'Enrol this applicant? The class fees are billed and a student login is created.', submit: 'Enroll',
          done: (res) => `Enrolled as ${res.admissionNo}. Student login: ${res.studentLogin?.username ?? ''} / ${res.studentLogin?.password ?? ''}. Write the password down now, it is shown only once.`,
        }],
      },
      {
        key: 'summary', title: 'Admissions summary', kind: 'stats', path: '/admissions/summary',
        tiles: (d) => [{ label: 'Applicants', value: d.total }, { label: 'Conversion', value: `${d.conversionPercent}%`, tone: 'green' }, { label: 'Offers accepted', value: `${d.acceptancePercent}%`, tone: 'green' }, { label: 'Tests taken', value: d.testsTaken, tone: 'amber' }],
        lists: [{ title: 'By stage', rows: (d) => d.stages, row: (s) => ({ title: s.stage, right: s.count }) }, { title: 'By class', rows: (d) => d.byClass, row: (c) => ({ title: c.className, sub: dot(`${c.approved} offered`, `${c.enrolled} enrolled`), right: c.total }) }],
      },
    ],
  },
  {
    key: 'students', title: 'Students', icon: '\u{1F393}', roles: ['admin', 'teacher'],
    screens: [
      { key: 'students', title: 'Students', kind: 'list', path: '/students', row: (r) => ({ title: `${r.firstName} ${r.lastName}`, sub: dot(r.admissionNo, r.guardianName), badge: badgeFor(r.status) }) },
      { key: 'summary', title: 'Student summary', kind: 'stats', path: '/students/summary', tiles: (d) => [{ label: 'Students', value: d.total }, { label: 'Active', value: d.active, tone: 'green' }, { label: 'Inactive', value: d.inactive, tone: 'red' }, { label: 'Awaiting enrolment', value: d.pendingEnrollment, tone: 'amber' }] },
      { key: 'health', title: 'Health records', kind: 'list', path: '/student-health', row: (r) => ({ title: r.name, sub: dot(r.className, r.bloodGroup, r.allergies ? `allergy: ${r.allergies}` : null) }) },
      { key: 'behavior', title: 'Behaviour', kind: 'list', path: '/behavior', empty: 'No behaviour notes recorded.' },
      { key: 'alumni', title: 'Alumni', kind: 'list', path: '/alumni', row: (r) => ({ title: r.name, sub: dot(r.lastClass, r.leavingDate ? niceDate(r.leavingDate) : null) }) },
      { key: 'accounts', title: 'Student logins', kind: 'list', roles: ['admin'], path: '/student-accounts', row: (r) => ({ title: r.studentName, sub: dot(r.admissionNo, r.className, r.email), badge: badgeFor(r.studentStatus) }) },
    ],
  },
  {
    key: 'academics', title: 'Academics', icon: '\u{1F4DA}', roles: ['admin', 'teacher'],
    screens: [
      { key: 'classes', title: 'Classes', kind: 'list', path: '/classes', row: (r) => ({ title: `${r.name}-${r.section}`, sub: dot(r.classTeacherName ? `Teacher ${r.classTeacherName}` : null, r.room ? `Room ${r.room}` : null), right: `${r.studentCount ?? 0}` }) },
      { key: 'subjects', title: 'Subjects', kind: 'list', path: '/subjects', row: (r) => ({ title: r.name, sub: r.code }) },
      { key: 'years', title: 'Academic years', kind: 'list', path: '/academic-years', row: (r) => ({ title: r.name, sub: dot(niceDate(r.startDate), niceDate(r.endDate)), badge: r.isCurrent ? { text: 'Current', tone: 'green' } : null }) },
      { key: 'homework', title: 'Homework', kind: 'list', path: '/homework', row: (r) => ({ title: r.title, sub: dot(r.className, r.subjectName, `due ${niceDate(r.dueDate)}`), right: r.total ? `${r.submitted}/${r.total}` : undefined, badge: r.overdue ? { text: 'Overdue', tone: 'red' } : null }) },
      { key: 'materials', title: 'Study materials', kind: 'list', path: '/study-materials', row: (r) => ({ title: r.title, sub: dot(r.className, r.subjectName) }), actions: [{ kind: 'link', label: 'Open material', url: (r) => r.url, when: (r) => Boolean(r.url) }] },
      { key: 'online', title: 'Online classes', kind: 'list', path: '/online-classes', row: (r) => ({ title: r.title, sub: dot(r.className, r.subjectName, niceDate(r.classDate), r.startTime) }), actions: [{ kind: 'link', label: 'Join class', url: (r) => r.link, when: (r) => Boolean(r.link) }] },
      { key: 'syllabus', title: 'Syllabus', kind: 'list', path: '/syllabus', empty: 'No syllabus topics yet.' },
      { key: 'calendar', title: 'Calendar and holidays', kind: 'list', path: '/calendar', row: (r) => ({ title: r.title, sub: dot(r.type, niceDate(r.startDate), r.endDate && r.endDate !== r.startDate ? `to ${niceDate(r.endDate)}` : null) }) },
    ],
  },
  {
    key: 'lms', title: 'Learning Management', icon: '\u{1F4DA}', roles: ['admin', 'teacher'],
    screens: [
      { key: 'courses', title: 'Learning courses', kind: 'custom', route: 'LmsManage' },
    ],
  },
  {
    key: 'attendance', title: 'Attendance and leave', icon: '✅', roles: ['admin', 'teacher'],
    screens: [
      { key: 'mark', title: 'Mark attendance', kind: 'custom', route: 'MarkAttendance' },
      { key: 'myclass', title: 'My class today', kind: 'custom', route: 'MyClass' },
      {
        key: 'leaves', title: 'Student leave', kind: 'list', path: '/student-leaves',
        filters: [{ label: 'Pending', test: (r) => r.status === 'pending' }],
        row: (r) => ({ title: r.studentName, sub: dot(r.className, `${niceDate(r.fromDate)} to ${niceDate(r.toDate)}`, r.leaveType), badge: badgeFor(r.status) }),
        actions: decide('/student-leaves').map((a) => ({ ...a, when: (r) => r.status === 'pending' && r.canDecide })),
      },
    ],
  },
  {
    key: 'exams', title: 'Examinations', icon: '\u{1F9EA}', roles: ['admin', 'teacher'],
    screens: [
      { key: 'marks', title: 'Enter marks', kind: 'custom', route: 'Exams' },
      {
        key: 'exams', title: 'Exams', kind: 'list', path: '/exams', row: (r) => ({ title: r.name, sub: dot(r.className, `out of ${r.maxMarks}`, r.startDate ? niceDate(r.startDate) : null) }),
        actions: [{ kind: 'navigate', label: 'Enter marks', route: 'Marks', params: (r) => ({ examId: r.id, title: r.name }) }],
      },
      {
        key: 'reval', title: 'Revaluation requests', kind: 'list', path: '/exams/revaluations', empty: 'No revaluation requests.',
        row: (r) => ({ title: r.studentName ?? `Request #${r.id}`, sub: dot(r.examName, r.subjectName, r.reason), badge: badgeFor(r.status) }),
        actions: [
          { label: 'Accept', when: (r) => r.status === 'pending', roles: ['admin'], path: (r) => `/exams/revaluations/${r.id}/accept`, fields: [{ key: 'newMarks', label: 'Revised marks', keyboard: 'decimal-pad', required: true }, { key: 'remarks', label: 'Note' }], body: (v) => ({ newMarks: v.newMarks, remarks: v.remarks }), done: () => 'Accepted. The mark is updated.' },
          { label: 'Reject', tone: 'danger', when: (r) => r.status === 'pending', roles: ['admin'], path: (r) => `/exams/revaluations/${r.id}/reject`, fields: [{ key: 'remarks', label: 'Reason', required: true, multiline: true }], done: () => 'Rejected.' },
        ],
      },
      { key: 'grading', title: 'Grade scale', kind: 'stats', path: '/exams/grading', tiles: (d) => [{ label: 'Pass mark', value: `${d.passPercent}%`, tone: 'green' }], lists: [{ title: 'Grades', rows: (d) => d.bands ?? [], row: (b) => ({ title: b.grade, sub: `from ${b.min}%` }) }] },
    ],
  },
  {
    key: 'fees', title: 'Fees and finance', icon: '\u{1F4B0}', roles: ['admin', 'accountant'],
    screens: [
      {
        key: 'fees', title: 'Fees and payments', kind: 'list', path: '/fees',
        filters: [{ label: 'Unpaid', test: (r) => r.status === 'unpaid' }, { label: 'Part paid', test: (r) => r.status === 'partial' }, { label: 'Overdue', test: (r) => r.status === 'overdue' }, { label: 'Paid', test: (r) => r.status === 'paid' }],
        row: (r) => ({ title: r.studentName, sub: dot(r.title, `${money(r.paidAmount)} of ${money(r.amount)}`, r.dueDate ? `due ${niceDate(r.dueDate)}` : null), badge: badgeFor(r.status) }),
        actions: [{
          label: 'Take a payment', when: (r) => r.status !== 'paid', path: (r) => `/fees/${r.id}/payments`,
          fields: [{ key: 'amount', label: 'Amount', keyboard: 'decimal-pad', required: true, default: (r) => r.balance }, { key: 'method', label: 'Method', options: ['cash', 'card', 'upi', 'bank'], default: 'cash' }],
          body: (v) => ({ amount: v.amount, method: v.method }), submit: 'Record payment', done: (res) => `Payment recorded. Receipt ${res.receiptNo ?? ''}`.trim(),
        }],
      },
      { key: 'payments', title: 'Payments and receipts', kind: 'list', path: '/fees/payments', row: (r) => ({ title: r.studentName, sub: dot(r.feeTitle, niceDate(r.paidOn), r.method, r.receiptNo), right: money(r.amount) }) },
      { key: 'structure', title: 'Fee structure', kind: 'list', path: '/fee-structures', row: (r) => ({ title: r.title, sub: dot(r.className, r.dueDate ? `due ${niceDate(r.dueDate)}` : null), right: money(r.amount) }) },
      { key: 'groups', title: 'Fee groups', kind: 'list', path: '/fee-groups', row: (r) => ({ title: r.name, sub: r.description, right: money(r.total) }) },
      { key: 'defaulters', title: 'Defaulters', kind: 'list', path: '/reports/fee-defaulters', empty: 'Nobody has overdue fees.' },
      {
        key: 'finance', title: 'Income and expenses', kind: 'stats', path: '/reports/finance',
        tiles: (d) => [{ label: 'Fees collected', value: money(d.feeCollection), tone: 'green' }, { label: 'Other income', value: money(d.otherIncome), tone: 'blue' }, { label: 'Expenses', value: money(d.totalExpenses), tone: 'red' }, { label: 'Net', value: money(d.net), tone: 'amber' }],
        lists: [{ title: 'Expenses by category', rows: (d) => d.expensesByCategory ?? [], row: (e) => ({ title: e.category, right: money(e.total) }), empty: 'No expenses this month.' }],
      },
      {
        key: 'collection', title: 'Collection this month', kind: 'stats', path: '/reports/collection',
        tiles: (d) => [{ label: 'Collected', value: money(d.total), tone: 'green' }],
        lists: [{ title: 'By method', rows: (d) => d.byMethod, row: (m) => ({ title: m.method, sub: `${m.count} payments`, right: money(m.total) }) }, { title: 'By day', rows: (d) => d.byDay, row: (m) => ({ title: niceDate(m.paidOn), right: money(m.total) }) }],
      },
    ],
  },
  {
    key: 'transport', title: 'Transport', icon: '\u{1F68C}', roles: ['admin', 'teacher'],
    screens: [
      { key: 'summary', title: 'Transport summary', kind: 'stats', path: '/transport/summary', tiles: (d) => [{ label: 'Riders', value: d.riders }, { label: 'Vehicles', value: d.vehicles?.length ?? 0 }, { label: 'Routes', value: d.routes?.length ?? 0 }, { label: 'Maintenance cost', value: money(d.maintenanceCost), tone: 'amber' }] },
      { key: 'vehicles', title: 'Vehicles', kind: 'list', path: '/transport/vehicles', row: (r) => ({ title: r.regNo, sub: dot(r.model, `${r.seatsTaken}/${r.capacity} seats`), badge: badgeFor(r.status) }) },
      { key: 'routes', title: 'Routes', kind: 'list', path: '/transport/routes', row: (r) => ({ title: r.name, sub: dot(r.vehicleRegNo, `${r.stopCount} stops`, `${r.studentCount} riders`), right: money(r.monthlyFee) }) },
      { key: 'stops', title: 'Stops', kind: 'list', path: '/transport/stops', row: (r) => ({ title: r.name, sub: dot(r.routeName, r.pickupTime), right: `#${r.sequence}` }) },
      { key: 'assignments', title: 'Riders', kind: 'list', path: '/transport/assignments', row: (r) => ({ title: r.studentName, sub: dot(r.routeName, r.stopName, r.pickupTime), right: r.tripType }) },
      { key: 'staff', title: 'Drivers and attendants', kind: 'list', path: '/transport/staff', row: (r) => ({ title: r.name, sub: dot(r.role, r.phone, r.vehicleRegNo) }) },
      { key: 'tracking', title: 'Live bus tracking', kind: 'list', path: '/transport/tracking', row: (r) => ({ title: r.regNo, sub: dot(r.model, r.live ? 'Live now' : r.hasTracker ? 'Tracker offline' : 'No tracker'), badge: r.live ? { text: 'Live', tone: 'green' } : null }) },
    ],
  },
  {
    key: 'hostel', title: 'Hostel', icon: '\u{1F6CF}️', roles: ['admin', 'teacher'],
    screens: [
      { key: 'summary', title: 'Hostel summary', kind: 'stats', path: '/hostel/summary', tiles: (d) => [{ label: 'Boarders', value: d.boarders }, { label: 'Full rooms', value: d.fullRooms, tone: 'amber' }, { label: 'Visitors inside', value: d.visitorsInside, tone: 'red' }, { label: 'Monthly income', value: money(d.monthlyIncome), tone: 'green' }] },
      { key: 'hostels', title: 'Hostels', kind: 'list', path: '/hostel/hostels', row: (r) => ({ title: r.name, sub: dot(r.type, r.wardenName), right: `${r.occupied}/${r.capacity}` }) },
      { key: 'rooms', title: 'Rooms', kind: 'list', path: '/hostel/rooms', row: (r) => ({ title: `Room ${r.roomNo}`, sub: dot(r.hostelName, money(r.monthlyFee)), right: `${r.occupied}/${r.capacity}` }) },
      { key: 'allocations', title: 'Boarders', kind: 'list', path: '/hostel/allocations', row: (r) => ({ title: r.studentName, sub: dot(r.hostelName, `Room ${r.roomNo}`, r.bedNo ? `Bed ${r.bedNo}` : null) }) },
      {
        key: 'visitors', title: 'Visitor log', kind: 'list', path: '/hostel/visitors', filters: [{ label: 'Inside now', test: (r) => !r.checkOut }],
        row: (r) => ({ title: r.visitorName, sub: dot(r.studentName, r.relation, dateTime(r.checkIn)), badge: r.checkOut ? null : { text: 'Inside', tone: 'amber' } }),
        actions: [{ label: 'Check out', when: (r) => !r.checkOut, path: (r) => `/hostel/visitors/${r.id}/checkout`, body: () => ({}), confirm: 'Record that this visitor has left?', done: () => 'Checked out.' }],
      },
      { key: 'meals', title: 'Mess menu', kind: 'list', path: '/hostel/meals', row: (r) => ({ title: `${r.day} ${r.meal}`, sub: r.items }) },
    ],
  },
  {
    key: 'library', title: 'Library', icon: '\u{1F4D6}', roles: ['admin', 'teacher'],
    screens: [
      { key: 'summary', title: 'Library summary', kind: 'stats', path: '/library/summary', tiles: (d) => [{ label: 'Titles', value: d.titles }, { label: 'On loan', value: d.onLoan, tone: 'amber' }, { label: 'Overdue', value: d.overdue, tone: 'red' }, { label: 'Fines', value: money(d.finesCharged), tone: 'amber' }], lists: [{ title: 'Most borrowed', rows: (d) => d.mostBorrowed, row: (b) => ({ title: b.title, right: b.loans }) }] },
      {
        key: 'books', title: 'Books', kind: 'list', path: '/library/books', row: (r) => ({ title: r.title, sub: dot(r.author, r.LibraryCategory?.name), right: `${r.available}/${r.copies}` }),
        create: { label: 'Add book', path: '/library/books', fields: [
          { key: 'title', label: 'Title', required: true }, { key: 'author', label: 'Author' },
          { key: 'categoryId', label: 'Category', optionsPath: '/library/categories', allLabel: 'No category', mapOption: (x) => ({ value: String(x.id), label: x.name }) },
          { key: 'isbn', label: 'ISBN' }, { key: 'copies', label: 'Copies', keyboard: 'number-pad', required: true, default: 1 },
        ], body: (v) => ({ ...v, categoryId: v.categoryId ? Number(v.categoryId) : null, copies: Number(v.copies) }), done: () => 'Book added.' },
        actions: [
          { label: 'Edit book', path: (r) => `/library/books/${r.id}`, method: 'PUT', fields: [
            { key: 'title', label: 'Title', required: true, default: (r) => r.title }, { key: 'author', label: 'Author', default: (r) => r.author },
            { key: 'categoryId', label: 'Category', optionsPath: '/library/categories', allLabel: 'No category', mapOption: (x) => ({ value: String(x.id), label: x.name }), default: (r) => r.categoryId },
            { key: 'isbn', label: 'ISBN', default: (r) => r.isbn }, { key: 'copies', label: 'Copies', keyboard: 'number-pad', required: true, default: (r) => r.copies },
          ], body: (v) => ({ ...v, categoryId: v.categoryId ? Number(v.categoryId) : null, copies: Number(v.copies) }), done: () => 'Book updated.' },
          { label: 'Delete book', tone: 'danger', path: (r) => `/library/books/${r.id}`, method: 'DELETE', confirm: (r) => `Delete “${r.title}”? Books on loan cannot be deleted.`, done: () => 'Book deleted.' },
        ],
      },
      {
        key: 'issues', title: 'Loans', kind: 'list', path: '/library/issues', filters: [{ label: 'On loan', test: (r) => !r.returnedOn }, { label: 'Overdue', test: (r) => r.overdue }],
        row: (r) => ({ title: r.bookTitle, sub: dot(r.studentName, `due ${niceDate(r.dueOn)}`), badge: r.returnedOn ? { text: 'Returned', tone: 'green' } : r.overdue ? { text: 'Overdue', tone: 'red' } : { text: 'On loan', tone: 'amber' } }),
        create: { label: 'Issue a book', path: '/library/issues', fields: [
          { key: 'bookId', label: 'Book', optionsPath: '/library/books', filterOption: (x) => x.available > 0, mapOption: (x) => ({ value: String(x.id), label: `${x.title} (${x.available} available)` }), required: true },
          { key: 'studentId', label: 'Student', optionsPath: '/students?status=active', mapOption: (x) => ({ value: String(x.id), label: `${x.firstName} ${x.lastName} · ${x.admissionNo}` }), required: true },
          { key: 'days', label: 'Loan days (optional)', keyboard: 'number-pad' },
        ], body: (v) => ({ bookId: Number(v.bookId), studentId: Number(v.studentId), ...(v.days ? { days: Number(v.days) } : {}) }), done: () => 'Book issued.' },
        actions: [{ label: 'Mark returned', when: (r) => !r.returnedOn, path: (r) => `/library/issues/${r.id}/return`, body: () => ({}), confirm: 'Record this book as returned? A late fine is billed if it applies.', done: (result) => Number(result.fine) > 0 ? `Returned ${result.lateDays} day(s) late. Fine ${result.fine} was added to fees.` : 'Returned on time.' }],
      },
      { key: 'categories', title: 'Book categories', kind: 'list', path: '/library/categories', row: (r) => ({ title: r.name, right: `${r.bookCount} books` }), create: { label: 'Add category', path: '/library/categories', fields: [{ key: 'name', label: 'Category name', required: true }] }, actions: [{ label: 'Delete category', tone: 'danger', path: (r) => `/library/categories/${r.id}`, method: 'DELETE', confirm: (r) => r.bookCount ? `${r.bookCount} book(s) still use this category.` : `Delete ${r.name}?`, when: (r) => r.bookCount === 0, done: () => 'Category deleted.' }] },
      {
        key: 'members', title: 'Library cards', kind: 'list', path: '/library/memberships', row: (r) => ({ title: r.studentName, sub: dot(r.cardNo, `${r.onLoan} on loan`, r.expired ? 'expired' : null), badge: badgeFor(r.status) }),
        create: { label: 'Create library card', path: '/library/memberships', fields: [
          { key: 'studentId', label: 'Student', optionsPath: '/students?status=active', mapOption: (x) => ({ value: String(x.id), label: `${x.firstName} ${x.lastName} · ${x.admissionNo}` }), required: true },
          { key: 'memberSince', label: 'Member since (YYYY-MM-DD)' }, { key: 'validUntil', label: 'Valid until (optional, YYYY-MM-DD)' },
          { key: 'maxBooks', label: 'Maximum books', keyboard: 'number-pad' }, { key: 'notes', label: 'Notes', multiline: true },
        ], body: (v) => ({ ...v, studentId: Number(v.studentId), maxBooks: v.maxBooks ? Number(v.maxBooks) : undefined }), done: () => 'Library card created.' },
        actions: [
          { label: 'Edit card', path: (r) => `/library/memberships/${r.id}`, method: 'PUT', fields: [
            { key: 'memberSince', label: 'Member since (YYYY-MM-DD)', default: (r) => r.memberSince }, { key: 'validUntil', label: 'Valid until (optional, YYYY-MM-DD)', default: (r) => r.validUntil },
            { key: 'maxBooks', label: 'Maximum books', keyboard: 'number-pad', default: (r) => r.maxBooks }, { key: 'status', label: 'Status', options: ['active', 'suspended'], default: (r) => r.status }, { key: 'notes', label: 'Notes', multiline: true, default: (r) => r.notes },
          ], body: (v) => ({ ...v, maxBooks: Number(v.maxBooks) }), done: () => 'Library card updated.' },
          { label: 'Delete card', tone: 'danger', path: (r) => `/library/memberships/${r.id}`, method: 'DELETE', confirm: 'Delete this card? The student must return all books first.', done: () => 'Library card deleted.' },
        ],
      },
      {
        key: 'reservations', title: 'Reservations', kind: 'list', path: '/library/reservations', empty: 'No reservations.', row: (r) => ({ title: r.bookTitle, sub: dot(r.studentName, r.status === 'active' && r.queuePosition ? `queue #${r.queuePosition}` : null), badge: badgeFor(r.status) }),
        create: { label: 'Reserve unavailable book', path: '/library/reservations', fields: [
          { key: 'bookId', label: 'Book', optionsPath: '/library/books', filterOption: (x) => x.available < 1, mapOption: (x) => ({ value: String(x.id), label: `${x.title} (${x.available} available)` }), required: true },
          { key: 'studentId', label: 'Student', optionsPath: '/students?status=active', mapOption: (x) => ({ value: String(x.id), label: `${x.firstName} ${x.lastName} · ${x.admissionNo}` }), required: true },
        ], body: (v) => ({ bookId: Number(v.bookId), studentId: Number(v.studentId) }), done: () => 'Reservation added.' },
        actions: [{ label: 'Cancel reservation', tone: 'danger', when: (r) => r.status === 'active', path: (r) => `/library/reservations/${r.id}/cancel`, method: 'POST', body: () => ({}), confirm: 'Cancel this reservation?', done: () => 'Reservation cancelled.' }],
      },
    ],
  },
  {
    key: 'inventory', title: 'Inventory', icon: '\u{1F4E6}', roles: ['admin', 'teacher'],
    screens: [
      {
        key: 'requests', title: 'Item requests', kind: 'list', path: '/inventory-requests',
        row: (r) => ({ title: r.itemName, sub: dot(`${r.quantity} ${r.unit ?? ''}`.trim(), r.requestedByName, r.reason), badge: badgeFor(r.status) }),
        create: { label: 'Request stock', path: '/inventory-requests', fields: [
          { key: 'itemId', label: 'Item', optionsPath: '/inventory-requests/catalog', mapOption: (x) => ({ value: String(x.id), label: `${x.name} · ${x.inStock} ${x.unit} in stock` }), required: true },
          { key: 'quantity', label: 'Quantity', keyboard: 'number-pad', required: true }, { key: 'reason', label: 'What do you need it for?', required: true, multiline: true },
        ], body: (v) => ({ itemId: Number(v.itemId), quantity: Number(v.quantity), reason: v.reason }), done: () => 'Request sent to the office.' },
        actions: [
          { label: 'Approve', roles: ['admin'], when: (r) => r.status === 'pending', path: (r) => `/inventory-requests/${r.id}/approve`, fields: [{ key: 'quantity', label: 'Quantity to issue', keyboard: 'number-pad', default: (r) => r.quantity }], body: (v) => ({ quantity: v.quantity }), submit: 'Approve', done: () => 'Approved and issued from stock.' },
          { label: 'Reject', tone: 'danger', roles: ['admin'], when: (r) => r.status === 'pending', path: (r) => `/inventory-requests/${r.id}/reject`, fields: [{ key: 'remarks', label: 'Reason', required: true, multiline: true }], submit: 'Reject', done: () => 'Rejected.' },
          { label: 'Withdraw request', tone: 'ghost', when: (r) => r.status === 'pending', path: (r) => `/inventory-requests/${r.id}/cancel`, body: () => ({}), confirm: 'Withdraw this request?', done: () => 'Withdrawn.' },
        ],
      },
      { key: 'summary', title: 'Stock summary', kind: 'stats', roles: ['admin'], path: '/inventory/summary', tiles: (d) => [{ label: 'Items', value: d.itemCount }, { label: 'Stock value', value: money(d.totalValue), tone: 'green' }, { label: 'Low stock', value: d.lowStock?.length ?? 0, tone: 'red' }, { label: 'Open orders', value: d.openOrders, tone: 'amber' }], lists: [{ title: 'Low on stock', rows: (d) => d.lowStock, row: (i) => ({ title: i.name, sub: `reorder at ${i.reorderLevel}`, right: `${i.quantity} ${i.unit ?? ''}` }), empty: 'Nothing is low.' }] },
      { key: 'categories', title: 'Categories', kind: 'list', roles: ['admin'], path: '/inventory/categories', row: (r) => ({ title: r.name, right: `${r.itemCount} items` }), create: { label: 'Add category', path: '/inventory/categories', fields: [{ key: 'name', label: 'Category name', required: true }] }, actions: [{ label: 'Delete category', tone: 'danger', when: (r) => r.itemCount === 0, path: (r) => `/inventory/categories/${r.id}`, method: 'DELETE', confirm: (r) => `Delete ${r.name}?`, done: () => 'Category deleted.' }] },
      {
        key: 'items', title: 'Items', kind: 'list', roles: ['admin'], path: '/inventory/items', row: (r) => ({ title: r.name, sub: dot(r.categoryName, r.lowStock ? 'low stock' : null), right: `${r.quantity} ${r.unit ?? ''}`, badge: r.lowStock ? { text: 'Low', tone: 'red' } : null }),
        create: { label: 'Add stock item', path: '/inventory/items', fields: [
          { key: 'name', label: 'Item name', required: true }, { key: 'categoryId', label: 'Category', optionsPath: '/inventory/categories', allLabel: 'No category', mapOption: (x) => ({ value: String(x.id), label: x.name }) },
          { key: 'unit', label: 'Unit', default: 'pcs' }, { key: 'reorderLevel', label: 'Reorder level', keyboard: 'number-pad', default: 0 },
        ], body: (v) => ({ ...v, categoryId: v.categoryId ? Number(v.categoryId) : null, reorderLevel: Number(v.reorderLevel || 0) }), done: () => 'Stock item added.' },
        actions: [
          { label: 'Edit item', path: (r) => `/inventory/items/${r.id}`, method: 'PUT', fields: [
            { key: 'name', label: 'Item name', required: true, default: (r) => r.name }, { key: 'categoryId', label: 'Category', optionsPath: '/inventory/categories', allLabel: 'No category', mapOption: (x) => ({ value: String(x.id), label: x.name }), default: (r) => r.categoryId },
            { key: 'unit', label: 'Unit', default: (r) => r.unit }, { key: 'reorderLevel', label: 'Reorder level', keyboard: 'number-pad', default: (r) => r.reorderLevel },
          ], body: (v) => ({ ...v, categoryId: v.categoryId ? Number(v.categoryId) : null, reorderLevel: Number(v.reorderLevel || 0) }), done: () => 'Stock item updated.' },
          { label: 'Delete item', tone: 'danger', path: (r) => `/inventory/items/${r.id}`, method: 'DELETE', confirm: 'Delete this item? Items with movement or order history are retained.', done: () => 'Item deleted.' },
        ],
      },
      {
        key: 'orders', title: 'Purchase orders', kind: 'list', roles: ['admin'], path: '/inventory/orders', row: (r) => ({ title: r.supplierName, sub: dot(niceDate(r.orderDate), r.expectedDate ? `expected ${niceDate(r.expectedDate)}` : null, `${r.lines?.length ?? 0} line(s)`), badge: badgeFor(r.status), right: money(r.total) }),
        create: { label: 'Create purchase order', path: '/inventory/orders', fields: [
          { key: 'supplierId', label: 'Supplier', optionsPath: '/inventory/suppliers', mapOption: (x) => ({ value: String(x.id), label: x.name }), required: true },
          { key: 'lines', label: 'Order items', type: 'lineItems', optionsPath: '/inventory/items', mapOption: (x) => ({ value: String(x.id), label: `${x.name} (${x.unit})` }), required: true, default: [{ itemId: '', quantity: '', unitCost: '0' }] },
          { key: 'orderDate', label: 'Order date (YYYY-MM-DD)', default: today }, { key: 'expectedDate', label: 'Expected date (optional)' }, { key: 'note', label: 'Note' },
        ], body: (v) => ({ supplierId: Number(v.supplierId), orderDate: v.orderDate, expectedDate: v.expectedDate || null, note: v.note, lines: v.lines.map((line) => ({ itemId: Number(line.itemId), quantity: Number(line.quantity), unitCost: Number(line.unitCost || 0) })) }), done: () => 'Purchase order created.' },
        actions: [
          { label: 'Receive order', when: (r) => r.status === 'ordered', path: (r) => `/inventory/orders/${r.id}/receive`, confirm: (r) => `Receive all ${r.lines?.length ?? ''} order line(s) into stock?`, done: () => 'Order received into stock.' },
          { label: 'Cancel order', tone: 'danger', when: (r) => r.status === 'ordered', path: (r) => `/inventory/orders/${r.id}/cancel`, confirm: 'Cancel this order?', done: () => 'Order cancelled.' },
        ],
      },
      {
        key: 'movements', title: 'Stock movements', kind: 'list', roles: ['admin'], path: '/inventory/movements', row: (r) => ({ title: r.itemName, sub: dot(r.type === 'in' ? 'Stock in' : 'Stock out', niceDate(r.date), r.party, r.note), right: `${r.type === 'in' ? '+' : '-'}${r.quantity} ${r.unit ?? ''}` }),
        create: { label: 'Record stock movement', path: '/inventory/movements', fields: [
          { key: 'itemId', label: 'Item', optionsPath: '/inventory/items', mapOption: (x) => ({ value: String(x.id), label: `${x.name} · ${x.quantity} ${x.unit} in stock` }), required: true },
          { key: 'type', label: 'Movement', options: [{ value: 'in', label: 'Stock in' }, { value: 'out', label: 'Stock out' }], required: true, default: 'in' },
          { key: 'quantity', label: 'Quantity', keyboard: 'number-pad', required: true }, { key: 'unitCost', label: 'Unit cost (stock in)', keyboard: 'decimal-pad' },
          { key: 'supplierId', label: 'Supplier (optional)', optionsPath: '/inventory/suppliers', allLabel: 'No supplier', mapOption: (x) => ({ value: String(x.id), label: x.name }) },
          { key: 'party', label: 'Issued to / source' }, { key: 'date', label: 'Date (YYYY-MM-DD)', default: today }, { key: 'note', label: 'Note' },
        ], body: (v) => ({ ...v, itemId: Number(v.itemId), quantity: Number(v.quantity), unitCost: v.unitCost === '' ? null : Number(v.unitCost), supplierId: v.supplierId ? Number(v.supplierId) : null }), done: () => 'Stock movement recorded.' },
      },
      {
        key: 'suppliers', title: 'Suppliers', kind: 'list', roles: ['admin'], path: '/inventory/suppliers', row: (r) => ({ title: r.name, sub: dot(r.contactPerson, r.phone, r.email) }),
        create: { label: 'Add supplier', path: '/inventory/suppliers', fields: [{ key: 'name', label: 'Supplier name', required: true }, { key: 'contactPerson', label: 'Contact person' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'address', label: 'Address', multiline: true }] },
        actions: [{ label: 'Edit supplier', path: (r) => `/inventory/suppliers/${r.id}`, method: 'PUT', fields: [{ key: 'name', label: 'Supplier name', required: true, default: (r) => r.name }, { key: 'contactPerson', label: 'Contact person', default: (r) => r.contactPerson }, { key: 'phone', label: 'Phone', default: (r) => r.phone }, { key: 'email', label: 'Email', default: (r) => r.email }, { key: 'address', label: 'Address', multiline: true, default: (r) => r.address }] }, { label: 'Delete supplier', tone: 'danger', path: (r) => `/inventory/suppliers/${r.id}`, method: 'DELETE', confirm: 'Delete this supplier? Suppliers with purchase orders are retained.' }],
      },
      { key: 'assets', title: 'Assets', kind: 'list', roles: ['admin'], path: '/inventory/assets', row: (r) => ({ title: r.name, sub: dot(r.assetTag, r.categoryName, r.location), badge: badgeFor(r.status) }), create: { label: 'Add asset', path: '/inventory/assets', fields: [{ key: 'assetTag', label: 'Asset tag', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'categoryId', label: 'Category', optionsPath: '/inventory/categories', allLabel: 'No category', mapOption: (x) => ({ value: String(x.id), label: x.name }) }, { key: 'location', label: 'Location' }, { key: 'purchaseDate', label: 'Purchase date (YYYY-MM-DD)' }, { key: 'cost', label: 'Cost', keyboard: 'decimal-pad', default: 0 }, { key: 'status', label: 'Status', options: ['in_use', 'in_store', 'under_repair', 'disposed'], default: 'in_use' }, { key: 'notes', label: 'Notes' }], body: (v) => ({ ...v, categoryId: v.categoryId ? Number(v.categoryId) : null, cost: Number(v.cost || 0) }), done: () => 'Asset added.' }, actions: [{ label: 'Edit asset', path: (r) => `/inventory/assets/${r.id}`, method: 'PUT', fields: [{ key: 'assetTag', label: 'Asset tag', required: true, default: (r) => r.assetTag }, { key: 'name', label: 'Name', required: true, default: (r) => r.name }, { key: 'categoryId', label: 'Category', optionsPath: '/inventory/categories', allLabel: 'No category', mapOption: (x) => ({ value: String(x.id), label: x.name }), default: (r) => r.categoryId }, { key: 'location', label: 'Location', default: (r) => r.location }, { key: 'purchaseDate', label: 'Purchase date (YYYY-MM-DD)', default: (r) => r.purchaseDate }, { key: 'cost', label: 'Cost', keyboard: 'decimal-pad', default: (r) => r.cost }, { key: 'status', label: 'Status', options: ['in_use', 'in_store', 'under_repair', 'disposed'], default: (r) => r.status }, { key: 'notes', label: 'Notes', default: (r) => r.notes }], body: (v) => ({ ...v, categoryId: v.categoryId ? Number(v.categoryId) : null, cost: Number(v.cost || 0) }), done: () => 'Asset updated.' }, { label: 'Delete asset', tone: 'danger', path: (r) => `/inventory/assets/${r.id}`, method: 'DELETE', confirm: 'Delete this asset? An asset with maintenance history cannot be deleted.' }] },
      { key: 'assetSummary', title: 'Asset summary', kind: 'stats', roles: ['admin'], path: '/inventory/assets/summary', tiles: (d) => [{ label: 'Assets', value: d.total }, { label: 'In use', value: d.inUse }, { label: 'In repair', value: d.underRepair, tone: d.underRepair ? 'amber' : 'green' }, { label: 'Maintenance due', value: d.maintenanceDue?.length ?? 0, tone: d.maintenanceDue?.length ? 'amber' : 'green' }] },
      { key: 'maintenance', title: 'Asset maintenance', kind: 'list', roles: ['admin'], path: '/inventory/asset-maintenance', row: (r) => ({ title: r.assetName, sub: dot(niceDate(r.serviceDate), r.description, r.nextDue ? `next due ${niceDate(r.nextDue)}` : null), right: money(r.cost) }), create: { label: 'Record maintenance', path: '/inventory/asset-maintenance', fields: [{ key: 'assetId', label: 'Asset', optionsPath: '/inventory/assets', mapOption: (x) => ({ value: String(x.id), label: `${x.assetTag} · ${x.name}` }), required: true }, { key: 'serviceDate', label: 'Service date (YYYY-MM-DD)', required: true, default: today }, { key: 'description', label: 'Work performed', required: true }, { key: 'cost', label: 'Cost', keyboard: 'decimal-pad', default: 0 }, { key: 'nextDue', label: 'Next due (optional, YYYY-MM-DD)' }], body: (v) => ({ ...v, assetId: Number(v.assetId), cost: Number(v.cost || 0), nextDue: v.nextDue || null }), done: () => 'Maintenance recorded.' } },
    ],
  },
  {
    key: 'hr', title: 'Staff and HR', icon: '\u{1F465}', roles: ['admin', 'teacher', 'accountant'],
    screens: [
      { key: 'staff', title: 'Staff directory', kind: 'list', roles: ['admin', 'teacher', 'accountant'], path: '/staff', row: (r) => ({ title: `${r.firstName} ${r.lastName}`, sub: dot(r.designation, r.staffNo, r.phone), badge: badgeFor(r.status) }) },
      { key: 'summary', title: 'HR summary', kind: 'stats', roles: ['admin'], path: '/hr/reports', tiles: (d) => [{ label: 'Staff', value: d.headcount }, { label: 'Leave to decide', value: d.pendingLeaves, tone: 'amber' }], lists: [{ title: 'By department', rows: (d) => d.byDepartment, row: (x) => ({ title: x.department, right: x.headcount }) }] },
      {
        key: 'leaves', title: 'Staff leave', kind: 'list', roles: ['admin', 'teacher'], path: '/hr/leaves', filters: [{ label: 'Pending', test: (r) => r.status === 'pending' }],
        row: (r) => ({ title: r.staffName, sub: dot(r.type, `${niceDate(r.fromDate)} to ${niceDate(r.toDate)}`), badge: badgeFor(r.status) }),
        actions: decide('/hr/leaves').map((a) => ({ ...a, when: (r) => r.status === 'pending' && r.canDecide })),
      },
      {
        key: 'payslips', title: 'Payslips this month', kind: 'list', roles: ['admin', 'accountant'], path: () => `/payroll/payslips?month=${ym()}`,
        row: (r) => ({ title: r.staffName ?? r.name ?? `Staff #${r.staffId}`, sub: dot(r.month, `basic ${money(r.basic)}`), badge: badgeFor(r.status), right: money(r.net) }),
        actions: [{ label: 'Approve and mark paid', roles: ['admin'], when: (r) => r.status === 'draft', path: (r) => `/payroll/payslips/${r.id}/pay`, body: () => ({}), confirm: 'Approve this payslip as paid? Your name is recorded as the approver.', done: () => 'Payslip paid.' }],
      },
      { key: 'salaries', title: 'Salary terms', kind: 'list', roles: ['admin', 'accountant'], path: '/payroll/salaries', row: (r) => ({ title: r.name, sub: dot(r.staffNo, `allowances ${money(r.allowances)}`, `deductions ${money(r.deductions)}`), right: money(r.basic) }) },
      { key: 'openings', title: 'Recruitment', kind: 'list', roles: ['admin'], path: '/recruitment/openings', empty: 'No job openings.' },
    ],
  },
  {
    key: 'safety', title: 'Health and safety', icon: '\u{1FA7A}', roles: ['admin'],
    screens: [
      { key: 'summary', title: 'Safety summary', kind: 'stats', path: '/safety/summary', tiles: (d) => [{ label: 'Clinic visits', value: d.visitsThisMonth }, { label: 'Sent home', value: d.sentHomeThisMonth, tone: 'amber' }, { label: 'Open incidents', value: d.openIncidents, tone: d.openIncidents ? 'red' : 'green' }, { label: 'Serious open', value: d.seriousOpen, tone: d.seriousOpen ? 'red' : 'green' }] },
      { key: 'incidents', title: 'Incidents', kind: 'list', path: '/safety/incidents', empty: 'No incidents recorded.' },
    ],
  },
  {
    key: 'activities', title: 'Events and activities', icon: '\u{1F389}', roles: ['admin', 'teacher'],
    screens: [
      { key: 'activities', title: 'Activities', kind: 'list', path: '/activities', row: (r) => ({ title: r.title, sub: dot(r.kindLabel, r.startDate ? niceDate(r.startDate) : null, r.venue), right: `${r.registered}${r.capacity ? `/${r.capacity}` : ''}`, badge: badgeFor(r.status) }) },
      { key: 'summary', title: 'Activity summary', kind: 'stats', path: '/activities/summary', lists: [{ title: 'By kind', rows: (d) => d.byKind, row: (k) => ({ title: k.label, sub: `${k.participants} participants`, right: k.activities }) }] },
    ],
  },
  {
    key: 'documents', title: 'Certificates', icon: '\u{1F4C4}', roles: ['admin'],
    screens: [{
      key: 'requests', title: 'Requests and register', kind: 'list', path: '/documents', filters: [{ label: 'Requested', test: (r) => r.status === 'requested' }, { label: 'Issued', test: (r) => r.status === 'issued' }],
      row: (r) => ({ title: r.studentName ?? 'Former student', sub: dot(r.typeLabel, r.purpose, r.certificateNo), badge: badgeFor(r.status) }),
      actions: [
        { label: 'Issue certificate', when: (r) => r.status === 'requested', path: (r) => `/documents/${r.id}/issue`, body: () => ({}), confirm: 'Issue this certificate? The wording in force is frozen into it.', done: () => 'Issued. Print it from the website.' },
        { label: 'Reject', tone: 'danger', when: (r) => r.status === 'requested', path: (r) => `/documents/${r.id}/reject`, fields: [{ key: 'remarks', label: 'Reason', required: true, multiline: true }], done: () => 'Rejected.' },
      ],
    }],
  },
  {
    key: 'communication', title: 'Communication', icon: '\u{1F4AC}', roles: ['admin', 'teacher', 'accountant'],
    screens: [
      {
        key: 'notices', title: 'Notices', kind: 'list', path: '/notices', row: (r) => ({ title: r.title, sub: dot(r.audience, niceDate(r.createdAt)) }),
        create: { label: '＋ New notice', path: '/notices', roles: ['admin'], fields: [{ key: 'title', label: 'Title', required: true }, { key: 'body', label: 'Message', required: true, multiline: true }, { key: 'audience', label: 'For', options: ['all', 'teachers', 'parents', 'students'], default: 'all' }], submit: 'Publish', done: () => 'Notice published.' },
      },
      {
        key: 'history', title: 'Message history', kind: 'list', roles: ['admin'], path: '/messaging/history',
        row: (r) => ({ title: r.recipientName ?? r.recipient, sub: dot(r.channel, r.subject ?? r.body?.slice(0, 40), dateTime(r.createdAt)), badge: badgeFor(r.status) }),
        create: { label: '＋ Message parents', path: '/messaging/broadcast', fields: [{ key: 'channel', label: 'Send by', options: ['email', 'sms'], default: 'sms' }, { key: 'classId', label: 'Class', optionsPath: '/classes', allLabel: 'All classes', default: '' }, { key: 'subject', label: 'Subject (email)' }, { key: 'body', label: 'Message', required: true, multiline: true }], body: (v) => ({ channel: v.channel, classId: v.classId || undefined, subject: v.subject, body: v.body }), submit: 'Send', done: (res) => `Sent: ${res.sent ?? 0}, recorded only: ${res.recorded ?? 0}, failed: ${res.failed ?? 0}.` },
      },
      { key: 'feedback', title: 'Feedback and grievances', kind: 'list', roles: ['admin'], path: '/feedback', empty: 'No feedback yet.' },
    ],
  },
  {
    key: 'portal', title: 'Parents and logins', icon: '\u{1F468}‍\u{1F469}‍\u{1F467}', roles: ['admin'],
    screens: [
      { key: 'parents', title: 'Parent accounts', kind: 'list', path: '/parents', empty: 'No parent accounts yet.' },
      { key: 'users', title: 'Users', kind: 'list', path: '/users', row: (r) => ({ title: r.name, sub: dot(r.email, r.roleName ?? r.role) }) },
      { key: 'logins', title: 'Login history', kind: 'list', path: '/login-activity', row: (r) => ({ title: r.email, sub: dot(r.role, r.ip, dateTime(r.createdAt)), badge: r.success ? { text: 'OK', tone: 'green' } : { text: 'Failed', tone: 'red' } }) },
    ],
  },
];

/** The staff home page: what needs attention today. */
export const STAFF_DASHBOARD = {
  title: 'Today',
  sub: 'What needs attention.',
  path: '/dashboard',
  tiles: (d, role) => (role === 'accountant'
    ? [{ label: 'Fees due', value: money(d.feesDue), tone: 'amber' }, { label: 'Overdue', value: d.overdueFees, tone: d.overdueFees ? 'red' : 'green' }, { label: 'Collected this month', value: money(d.collectedThisMonth), tone: 'green' }]
    : [
      { label: 'Students', value: d.students }, { label: 'Staff', value: d.staff },
      { label: 'Present today', value: d.attendanceToday?.present, tone: 'green' }, { label: 'Absent today', value: d.attendanceToday?.absent, tone: 'red' },
      ...(role === 'admin' ? [
        { label: 'Fees due', value: money(d.feesDue), tone: 'amber' }, { label: 'Collected this month', value: money(d.collectedThisMonth), tone: 'green' },
        { label: 'Applications waiting', value: d.pendingAdmissions, tone: 'amber' }, { label: 'Leave to decide', value: (d.attention?.studentLeaves ?? 0) + (d.attention?.staffLeaves ?? 0), tone: 'amber' },
      ] : []),
    ]),
  lists: [
    { title: 'Classes without attendance today', rows: (d) => d.unmarkedClasses ?? [], row: (c) => ({ title: c }), empty: 'Every class has been marked.' },
    { title: 'Upcoming events', rows: (d) => d.upcomingEvents ?? [], row: (e) => ({ title: e.title, sub: niceDate(e.startDate) }), empty: 'No events soon.' },
    { title: 'Notices', rows: (d) => d.notices ?? [], row: (n) => ({ title: n.title, sub: n.body?.slice(0, 60) }), empty: 'No notices.' },
  ],
};
