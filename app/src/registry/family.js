import { niceDate } from '../ui';
import { badgeFor, dateTime } from './format';

const dot = (...xs) => xs.filter((x) => x !== null && x !== undefined && x !== '').join(' · ');
const kid = (c, tail) => `/portal/children/${c?.id}${tail}`;
// "pending" is what the server sends until the teacher marks the work, so it shows as nothing (or Overdue once the date has passed)
const SUBMISSION_BADGE = { submitted: { text: 'Submitted', tone: 'green' }, late: { text: 'Late', tone: 'amber' }, missing: { text: 'Missing', tone: 'red' } };
const DAY = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const cap = (s) => String(s ?? '').replace(/^./, (c) => c.toUpperCase());

/**
 * What a parent or student can open in the app. The home screen shows each module here as a titled section of icons (Academic, Exam,
 * Fees and so on); `scope: 'child'` pages follow the child chosen on the home screen, the others are for the whole school.
 * A `custom` page opens one of the app's own screens by route name.
 */
export const FAMILY_MODULES = [
  {
    key: 'academic', title: 'Academic',
    screens: [
      { key: 'timetable', title: 'Timetable', scope: 'child', kind: 'custom', route: 'Timetable' },
      { key: 'calendar', title: 'Calendar', kind: 'list', path: '/portal/calendar', row: (r) => ({ title: r.title, sub: dot(r.type, niceDate(r.startDate), r.endDate && r.endDate !== r.startDate ? `to ${niceDate(r.endDate)}` : null) }) },
      { key: 'homework', title: 'Homework', scope: 'child', kind: 'list', path: (c) => kid(c, '/homework'), row: (r) => ({ title: r.title, sub: dot(r.subjectName, `due ${niceDate(r.dueDate)}`), badge: SUBMISSION_BADGE[r.submission?.status] ?? (r.overdue ? { text: 'Overdue', tone: 'red' } : null) }), empty: 'No homework right now.' },
      { key: 'materials', title: 'Learning materials', scope: 'child', kind: 'list', path: (c) => kid(c, '/materials'), row: (r) => ({ title: r.title, sub: dot(r.subjectName, r.createdByName) }), actions: [{ kind: 'link', label: 'Open material', url: (r) => r.url, when: (r) => Boolean(r.url) }], empty: 'No materials shared yet.' },
      { key: 'online', title: 'Online classes', scope: 'child', kind: 'list', path: (c) => kid(c, '/online-classes'), row: (r) => ({ title: r.title, sub: dot(r.subjectName, niceDate(r.classDate), `${r.startTime ?? ''}${r.endTime ? `–${r.endTime}` : ''}`), badge: r.today ? { text: 'Today', tone: 'green' } : null }), actions: [{ kind: 'link', label: 'Join class', url: (r) => r.link, when: (r) => Boolean(r.link) }], empty: 'No live classes scheduled.' },
      { key: 'attendance', title: 'Attendance', scope: 'child', kind: 'custom', route: 'Attendance' },
      { key: 'leave', title: 'Student leave', scope: 'child', kind: 'custom', route: 'Leave' },
      { key: 'balance', title: 'Leave balance', scope: 'child', kind: 'list', path: (c) => kid(c, '/leave-balance'), row: (r) => ({ title: r.name, sub: `${r.used ?? 0} of ${r.yearlyDays ?? '—'} days used` }) },
    ],
  },
  {
    key: 'exam', title: 'Exam',
    screens: [
      { key: 'results', title: 'Exams & results', scope: 'child', kind: 'custom', route: 'Results' },
      { key: 'revaluations', title: 'Revaluation requests', scope: 'child', kind: 'list', path: (c) => kid(c, '/revaluations'), empty: 'No revaluation requests.' },
    ],
  },
  {
    key: 'fees', title: 'Fees',
    screens: [
      { key: 'fees', title: 'Fees & payments', scope: 'child', kind: 'custom', route: 'Fees' },
    ],
  },
  {
    key: 'hostel', title: 'Hostel',
    screens: [
      {
        key: 'details', title: 'Room & warden', scope: 'child', kind: 'stats', path: (c) => kid(c, '/hostel'),
        tiles: (d) => (d.allocated
          ? [{ label: 'Hostel', value: d.hostel }, { label: 'Room', value: d.room }, { label: 'Bed', value: d.bedNo ?? '—' }, { label: 'Meal plan', value: d.mealPlan ?? '—', tone: 'green' }]
          : [{ label: 'Hostel', value: 'Not a boarder', tone: 'amber' }]),
        lists: [
          { title: 'Warden', rows: (d) => (d.allocated && d.wardenName ? [d] : []), row: (d) => ({ title: d.wardenName, sub: dot(d.wardenPhone, d.address) }), empty: 'No warden is recorded.' },
          { title: 'Local guardian', rows: (d) => (d.allocated && d.localGuardianName ? [d] : []), row: (d) => ({ title: d.localGuardianName, sub: dot(d.localGuardianRelation, d.localGuardianPhone) }), empty: 'No local guardian is recorded.' },
        ],
      },
      { key: 'meals', title: 'Mess menu', scope: 'child', kind: 'list', path: (c) => kid(c, '/hostel/meals'), row: (r) => ({ title: `${DAY[r.day] ?? r.day} · ${cap(r.meal)}`, sub: r.items }), empty: 'The mess menu has not been set.' },
      { key: 'attendance', title: 'Night roll call', scope: 'child', kind: 'list', path: (c) => kid(c, '/hostel/attendance'), row: (r) => ({ title: niceDate(r.date), badge: { text: r.status, tone: { present: 'green', absent: 'red', leave: 'amber' }[r.status] ?? 'grey' } }), empty: 'No roll call recorded in the last month.' },
      { key: 'visitors', title: 'Visitors', scope: 'child', kind: 'list', path: (c) => kid(c, '/hostel/visitors'), row: (r) => ({ title: r.visitorName, sub: dot(r.relation, r.purpose, dateTime(r.checkIn)), badge: r.checkOut ? { text: 'Left', tone: 'grey' } : { text: 'Inside', tone: 'amber' } }), empty: 'No visitors recorded.' },
    ],
  },
  {
    key: 'library', title: 'Library',
    screens: [
      { key: 'library', title: 'Library', scope: 'child', kind: 'stats', path: (c) => kid(c, '/library'), tiles: (d) => [{ label: 'Card', value: d.card?.cardNo ?? 'None' }, { label: 'On loan', value: d.loans?.filter((l) => !l.returnedOn).length ?? 0, tone: 'amber' }], lists: [{ title: 'Loans', rows: (d) => d.loans ?? [], row: (l) => ({ title: l.title ?? l.bookTitle, sub: dot(l.issuedOn ? `issued ${niceDate(l.issuedOn)}` : null, l.dueOn ? `due ${niceDate(l.dueOn)}` : null), right: l.returnedOn ? 'Returned' : l.overdue ? 'Overdue' : '' }), empty: 'No books on loan.' }] },
    ],
  },
  {
    key: 'admin', title: 'Administration',
    screens: [
      {
        key: 'documents', title: 'Certificates', scope: 'child', kind: 'list', path: (c) => kid(c, '/documents'), empty: 'No certificate requests yet.',
        row: (r) => ({ title: r.typeLabel ?? r.type, sub: dot(r.purpose, r.certificateNo, niceDate(r.createdAt)), badge: badgeFor(r.status) }),
        create: { label: '＋ Request a certificate', path: (r, c) => kid(c, '/documents'), fields: [{ key: 'type', label: 'Certificate', options: ['bonafide', 'character', 'fee'], default: 'bonafide' }, { key: 'purpose', label: 'Purpose', required: true }], submit: 'Send request', done: () => 'Request sent. The office will issue it.' },
      },
      {
        key: 'feedback', title: 'Feedback & grievance', scope: 'child', kind: 'list', path: (c) => kid(c, '/feedback'), empty: 'Nothing sent yet.',
        row: (r) => ({ title: r.subject, sub: dot(r.ticketNo, r.kind, r.category), badge: badgeFor(r.status) }),
        create: { label: '＋ Send feedback', path: (r, c) => kid(c, '/feedback'), fields: [{ key: 'kind', label: 'This is', options: ['feedback', 'grievance'], default: 'feedback' }, { key: 'category', label: 'About', optionsPath: '/portal/feedback-categories' }, { key: 'subject', label: 'Subject', required: true }, { key: 'details', label: 'Details', required: true, multiline: true }], submit: 'Send', done: () => 'Sent. The school office will reply here.' },
      },
      { key: 'messages', title: 'Messages from the school', scope: 'child', kind: 'list', path: (c) => kid(c, '/messages'), row: (r) => ({ title: r.subject ?? r.kind, sub: dot(r.body?.slice(0, 80), niceDate(r.sentAt)) }), empty: 'No messages.' },
    ],
  },
  {
    key: 'other', title: 'Other services',
    screens: [
      { key: 'transport', title: 'Transport', scope: 'child', kind: 'stats', path: (c) => kid(c, '/transport'), auto: true },
      { key: 'notices', title: 'Notices', kind: 'custom', route: 'Notices' },
      {
        key: 'activities', title: 'Activities', scope: 'child', kind: 'list', path: (c) => kid(c, '/activities'), empty: 'Not registered for any activity.',
        row: (r) => ({ title: r.title, sub: dot(r.kindLabel, r.startDate ? niceDate(r.startDate) : null, r.venue), badge: r.consent ? badgeFor(r.consent) : null }),
        actions: ['given', 'declined'].map((consent) => ({
          label: consent === 'given' ? 'Give consent' : 'Decline', tone: consent === 'given' ? 'primary' : 'danger', method: 'PUT', when: (r) => r.requiresConsent && r.consent !== consent,
          path: (r, c) => kid(c, `/activities/${r.activityId ?? r.id}/consent`), body: () => ({ consent }), confirm: consent === 'given' ? 'Allow your child to take part?' : 'Decline this activity?', done: () => 'Saved.',
        })),
      },
      { key: 'password', title: 'Change password', kind: 'custom', route: 'ChangePassword' },
    ],
  },
];

