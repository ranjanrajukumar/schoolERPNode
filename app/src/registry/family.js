import { niceDate } from '../ui';
import { badgeFor, dateTime } from './format';

const dot = (...xs) => xs.filter((x) => x !== null && x !== undefined && x !== '').join(' · ');
const kid = (c, tail) => `/portal/children/${c?.id}${tail}`;
const partActions = [0, 1, 2, 3, 4, 5].flatMap((i) => [{ kind: 'file', label: `Download part ${i + 1}`, path: (r, c) => kid(c, `/lms/parts/${r.parts[i].id}/file`), name: (r) => r.parts[i].attachmentName, when: (r) => r.parts?.[i]?.kind === 'file' && r.parts[i].hasAttachment }, { kind: 'link', label: `Open part ${i + 1}`, url: (r) => r.parts[i].url, when: (r) => Boolean(r.parts?.[i]?.url) }]);
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
        { key: 'lms', title: 'Courses & lessons', scope: 'child', kind: 'list', path: (c) => kid(c, '/lms/lessons'), row: (r) => ({ title: r.title, sub: dot(r.courseTitle, r.subjectName, r.moduleTitle, `${r.viewCount ?? 0} reads`), badge: r.completedAt ? { text: 'Completed', tone: 'green' } : r.viewedAt ? { text: 'Read', tone: 'amber' } : { text: 'To do', tone: 'amber' } }), detail: [['Course', 'courseTitle'], ['Module', 'moduleTitle'], ['Subject', 'subjectName'], ['Lesson notes', 'content'], ['Video', 'videoUrl'], ['Resource', 'resourceUrl'], ['Document', (r) => r.attachmentName], ['Parts, in order', (r) => (r.parts ?? []).map((p, i) => `${i + 1}. ${p.title} (${p.kind === 'video' ? 'video link' : p.kind === 'link' ? 'web link' : p.kind === 'file' ? 'file' : 'text'})${p.kind === 'text' ? '\n' + p.content : p.kind === 'file' && p.content ? '\n' + p.content : ''}`).join('\n\n') || null]], actions: [...partActions, { kind: 'file', label: 'Download lesson document', path: (r, c) => kid(c, `/lms/lessons/${r.id}/file`), name: (r) => r.attachmentName, when: (r) => r.hasAttachment }, { kind: 'link', label: 'Open video', url: (r) => r.videoUrl, when: (r) => Boolean(r.videoUrl) }, { kind: 'link', label: 'Open resource', url: (r) => r.resourceUrl, when: (r) => Boolean(r.resourceUrl) }, { kind: 'action', label: 'Mark complete', roles: ['student'], method: 'POST', path: (r, c) => kid(c, `/lms/lessons/${r.id}/complete`), body: () => ({}), when: (r) => !r.completedAt, done: () => 'Lesson marked complete.' }], empty: 'No published lessons yet.' },
        { key: 'lmsannouncements', title: 'Course announcements', scope: 'child', kind: 'list', path: (c) => kid(c, '/lms/announcements'), row: (r) => ({ title: r.title, sub: dot(r.courseTitle, r.subjectName, r.createdByName), badge: { text: niceDate(String(r.createdAt).slice(0, 10)), tone: 'blue' } }), detail: [['Course', 'courseTitle'], ['Message', 'body'], ['Posted by', 'createdByName']], empty: 'No course announcements.' },
        { key: 'lmsassignments', title: 'Course assignments', scope: 'child', kind: 'list', path: (c) => kid(c, '/lms/assignments'), row: (r) => ({ title: r.title, sub: dot(r.courseTitle, r.subjectName, r.dueOn ? `due ${niceDate(r.dueOn)}` : null), badge: r.submission?.gradedAt ? { text: `${r.submission.score}/${r.maxScore}${r.submission.isLate ? ' · Late' : ''}`, tone: r.submission.isLate ? 'red' : 'green' } : r.submission ? { text: r.submission.isLate ? 'Submitted late' : 'Submitted', tone: r.submission.isLate ? 'red' : 'amber' } : r.overdue ? { text: 'Overdue', tone: 'red' } : null }), detail: [['Course', 'courseTitle'], ['Instructions', 'instructions'], ['Due', 'dueOn'], ['Maximum score', 'maxScore'], ['Submission status', (r) => r.submission?.isLate ? 'Submitted late' : r.submission ? 'Submitted' : r.overdue ? 'Overdue' : 'Not submitted'], ['Feedback', (r) => r.submission?.feedback], ['Submitted document', (r) => r.submission?.attachmentName]], actions: [{ kind: 'file', label: 'Download submitted document', path: (r, c) => kid(c, `/lms/assignments/${r.id}/file`), name: (r) => r.submission?.attachmentName, when: (r) => Boolean(r.submission?.attachmentName) }, { kind: 'upload', label: 'Attach work document', roles: ['student'], path: (r, c) => kid(c, `/lms/assignments/${r.id}/file`), when: (r) => !r.submission?.gradedAt, done: () => 'File submitted.' }, { kind: 'action', label: 'Submit work', roles: ['student'], method: 'POST', path: (r, c) => kid(c, `/lms/assignments/${r.id}/submit`), fields: [{ key: 'response', label: 'Your response', multiline: true }, { key: 'resourceUrl', label: 'Work link' }], body: (v) => v, when: (r) => !r.submission?.gradedAt, done: () => 'Assignment submitted.' }], empty: 'No published assignments.' },
      { key: 'lmsquizzes', title: 'Course quizzes', scope: 'child', kind: 'list', path: (c) => kid(c, '/lms/quizzes'), row: (r) => ({ title: r.title, sub: dot(r.courseTitle, r.subjectName, r.dueOn ? `due ${niceDate(r.dueOn)}` : null, `${r.attemptCount}/${r.maxAttempts} attempts`), badge: r.bestScore == null ? null : { text: `Best ${r.bestScore}/${r.maxScore}`, tone: 'green' } }), detail: [['Course', 'courseTitle'], ['Description', 'description'], ['Due', 'dueOn'], ['Questions', (r) => r.questions.map((q, i) => `${i + 1}. ${q.prompt}${q.choices?.length ? `\n${q.choices.map((c, n) => `${n + 1}) ${c}`).join('\n')}` : ' (written response)'}`).join('\n\n')], ['Latest result', (r) => r.latestAttempt ? `${r.latestAttempt.score}/${r.latestAttempt.maxScore} · ${r.latestAttempt.reviewStatus}` : 'No attempt yet'], ['Teacher feedback', (r) => r.latestAttempt?.feedback]], actions: [{ kind: 'action', label: 'Take quiz', roles: ['student'], method: 'POST', path: (r, c) => kid(c, `/lms/quizzes/${r.id}/attempts`), fields: (r) => r.questions.map((q) => ({ key: q.id, label: q.prompt, ...(q.type === 'short_answer' ? { multiline: true } : { options: q.choices.map((choice, i) => ({ value: String(i), label: choice })), multi: q.type === 'multiple_choice' }), required: true })), body: (values) => ({ answers: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value.map(Number) : Number(value)])) }), when: (r) => r.attemptCount < r.maxAttempts, done: (result) => `Score: ${result.score}/${result.maxScore}${result.reviewStatus === 'pending_review' ? ' · awaiting teacher review' : ''}` }], empty: 'No published quizzes.' },
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

