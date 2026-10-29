import TableCard from '../../components/TableCard.jsx';
import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSchoolBrand } from '../../hooks/useSchoolBrand.js';
import { QualificationTable, SiblingsTable } from '../admissions/AdmissionSections.jsx';
import { api, fetchBlob, uploadFile } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PushToggle from '../../components/PushToggle.jsx';
import { BusMap, ago } from '../transport/BusTracking.jsx';
import { GrievanceLadder, Timeline } from '../../components/GrievanceLadder.jsx';
import { localDate } from '../../utils/dates.js';
import '../academics/lms.css';
import LmsStudentHome from '../academics/LmsStudentHome.jsx';
import LmsCourseOutline from '../academics/LmsCourseOutline.jsx';
import LmsCertificate from '../academics/LmsCertificate.jsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TABS = [
  'Overview',
  'Profile',
  'Attendance',
  'Timetable',
  'LMS',
  'Homework',
  'OnlineClasses',
  'Materials',
  'Results',
  'Fees',
  'Library',
  'Activities',
  'Notices',
  'Messages',
  'Calendar',
  'Transport',
  'Leave',
  'Feedback',
  'Documents',
  'Help',
];
// Answering activity consents stays with parents; a student's portal is read-only (leave requests and certificates can be read, not made).
const STUDENT_TABS = TABS.filter((t) => t !== 'Activities');
const LABELS = {
  Overview: 'Dashboard',
  Attendance: 'Attendance',
  Timetable: 'Class Timetable',
  LMS: 'Courses & Lessons',
  Homework: 'Homework & Assignments',
  OnlineClasses: 'Online Classes',
  Materials: 'Learning Materials',
  Results: 'Exams & Results',
  Fees: 'Fees & Payments',
  Notices: 'Notices & Announcements',
  Calendar: 'Events & Calendar',
  Transport: 'Transport Tracking',
  Documents: 'Certificates & Documents',
  Feedback: 'Feedback & Grievance',
  Help: 'Help & Support',
};
const label = (t, isStudent) =>
  t === 'Leave'
    ? isStudent
      ? 'Leave Requests'
      : 'Apply for Leave'
    : t === 'Profile'
      ? isStudent
        ? 'My Profile'
        : 'Child Profile'
      : (LABELS[t] ?? t);

/** The class teacher: who to ask about the class, with a way to call or write. */
function ClassTeacher({ teacher }) {
  if (!teacher)
    return (
      <div className="card">
        <span>Class teacher</span>
        <b>Not assigned yet</b>
        <small>The school office will assign one.</small>
      </div>
    );
  return (
    <div className="card">
      <span>Class teacher</span>
      <b>{teacher.name}</b>
      {teacher.designation && <small>{teacher.designation}</small>}
      {teacher.phone && (
        <small>
          Phone: <a href={`tel:${teacher.phone}`}>{teacher.phone}</a>
        </small>
      )}
      {teacher.email && (
        <small>
          Email: <a href={`mailto:${teacher.email}`}>{teacher.email}</a>
        </small>
      )}
    </div>
  );
}

function Overview({ base }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    api(`${base}/overview`).then(setD);
  }, [base]);
  if (!d) return <p>Loading…</p>;
  const { attendance: a, fees: f } = d;
  return (
    <div className="stats">
      <div className="card">
        <span>Attendance, last 30 days</span>
        <b>{a.percentage === null ? 'no records' : `${a.percentage}%`}</b>
        <small>
          {a.present} present · {a.late} late · {a.absent} absent
        </small>
      </div>
      <div className="card">
        <span>Fees outstanding</span>
        <b>{f.outstanding}</b>
        {f.overdueItems > 0 && <small className="error">{f.overdueItems} overdue item(s)</small>}
      </div>
      <ClassTeacher teacher={d.classTeacher} />
    </div>
  );
}

function Fees({ base }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    api(`${base}/fees`).then(setD);
  }, [base]);
  if (!d) return <p>Loading…</p>;
  return (
    <>
      <TableCard>
        <thead>
          <tr>
            <th>Fee</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {d.fees.map((f) => (
            <tr key={f.id}>
              <td>{f.title}</td>
              <td>{f.amount}</td>
              <td>{f.paidAmount}</td>
              <td>{f.balance}</td>
              <td>{f.dueDate}</td>
              <td>
                <span className={`badge ${f.status}`}>{f.status}</span>
              </td>
            </tr>
          ))}
          {!d.fees.length && (
            <tr>
              <td colSpan={6}>No fees</td>
            </tr>
          )}
        </tbody>
      </TableCard>
      <h2>Payments made</h2>
      <TableCard>
        <thead>
          <tr>
            <th>Receipt</th>
            <th>Date</th>
            <th>For</th>
            <th>Method</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {d.payments.map((p) => (
            <tr key={p.id}>
              <td>{p.receiptNo}</td>
              <td>{p.paidOn}</td>
              <td>{p.feeTitle}</td>
              <td>{p.method}</td>
              <td>{p.amount}</td>
            </tr>
          ))}
          {!d.payments.length && (
            <tr>
              <td colSpan={5}>No payments yet</td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}

function Attendance({ base }) {
  const [rows, setRows] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  useEffect(() => {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    api(`${base}/attendance?from=${month}-01&to=${month}-${String(last).padStart(2, '0')}`).then(setRows);
  }, [base, month]);
  return (
    <>
      <div className="card form">
        <label>
          Month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
      </div>
      <TableCard>
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.date}>
              <td>{r.date}</td>
              <td>
                <span
                  className={`badge ${r.status === 'present' ? 'paid' : r.status === 'late' ? 'partial' : 'overdue'}`}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
          {rows && !rows.length && (
            <tr>
              <td colSpan={2}>No attendance recorded this month</td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}

function Results({ base }) {
  const [rows, setRows] = useState(null);
  const [card, setCard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loadRequests = () =>
    api(`${base}/revaluations`)
      .then(setRequests)
      .catch(() => {});
  useEffect(() => {
    api(`${base}/results`).then(setRows);
    setCard(null);
    loadRequests();
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = async (subject) => {
    const reason = prompt(`Why should the ${subject.subject} mark be rechecked?`);
    if (!reason) return;
    setError('');
    setNotice('');
    try {
      await api(`${base}/revaluations`, {
        method: 'POST',
        body: { examId: card.exam.id, subjectId: subject.subjectId, reason },
      });
      setNotice(`Revaluation requested for ${subject.subject}. The school will review it.`);
      loadRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  if (card) {
    return (
      <div className="card report-card">
        <h2>{card.exam.name}</h2>
        <TableCard>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Marks</th>
              <th>Out of</th>
              <th>Grade</th>
              <th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {card.subjects.map((s) => (
              <tr key={s.subject} className={s.passed === false ? 'failed' : ''}>
                <td>{s.subject}</td>
                <td>{s.marks ?? '—'}</td>
                <td>{s.maxMarks}</td>
                <td>{s.grade ?? '—'}</td>
                <td className="no-print">
                  {s.marks !== null && <button onClick={() => query(s)}>Ask for recheck</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>
        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}
        {card.summary && (
          <p>
            Total{' '}
            <b>
              {card.summary.total} / {card.summary.outOf}
            </b>{' '}
            · {card.summary.percentage}% · Grade <b>{card.summary.grade}</b> · Rank <b>{card.summary.rank}</b>{' '}
            of {card.classSize} · <b>{card.summary.result}</b>
          </p>
        )}
        <button className="no-print" onClick={() => window.print()}>
          Print
        </button>
        <button className="no-print" onClick={() => setCard(null)}>
          Back
        </button>
      </div>
    );
  }

  return (
    <>
      <TableCard>
        <thead>
          <tr>
            <th>Exam</th>
            <th>Total</th>
            <th>%</th>
            <th>Grade</th>
            <th>Rank</th>
            <th>Result</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.examId}>
              <td>{r.name}</td>
              <td>
                {r.total} / {r.outOf}
              </td>
              <td>{r.percentage}</td>
              <td>{r.grade}</td>
              <td>{r.rank}</td>
              <td>
                <span className={`badge ${r.result}`}>{r.result}</span>
              </td>
              <td>
                <button onClick={() => api(`${base}/report-card/${r.examId}`).then(setCard)}>
                  Report card
                </button>
              </td>
            </tr>
          ))}
          {rows && !rows.length && (
            <tr>
              <td colSpan={7}>No published results yet</td>
            </tr>
          )}
        </tbody>
      </TableCard>
      {requests.length > 0 && (
        <>
          <h2>Recheck requests</h2>
          <TableCard>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Subject</th>
                <th>Original</th>
                <th>Revised</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.examName}</td>
                  <td>{r.subjectName}</td>
                  <td>{r.originalMarks}</td>
                  <td>{r.newMarks ?? '—'}</td>
                  <td>
                    <span
                      className={`badge ${r.status === 'accepted' ? 'paid' : r.status === 'rejected' ? 'overdue' : 'partial'}`}
                    >
                      {r.status}
                    </span>
                    {r.remarks && (
                      <>
                        <br />
                        <small>{r.remarks}</small>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </>
      )}
    </>
  );
}

function Timetable({ base }) {
  const [slots, setSlots] = useState(null);
  useEffect(() => {
    api(`${base}/timetable`).then(setSlots);
  }, [base]);
  if (!slots) return <p>Loading…</p>;
  const periods = [...new Set(slots.map((s) => s.period))].sort((a, b) => a - b);
  const days = [...new Set(slots.map((s) => s.day))].sort((a, b) => a - b);
  if (!slots.length) return <p className="hint">The timetable has not been set up yet.</p>;
  return (
    <table className="card grid">
      <thead>
        <tr>
          <th>Period</th>
          {days.map((d) => (
            <th key={d}>{DAYS[d - 1]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => (
          <tr key={p}>
            <th>{p}</th>
            {days.map((d) => {
              const s = slots.find((x) => x.day === d && x.period === p);
              return (
                <td key={d}>
                  {s && (
                    <>
                      <b>{s.subjectName}</b>
                      <br />
                      <small>{s.teacherName}</small>
                    </>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const DOC_TYPES = [
  ['bonafide', 'Bonafide certificate'],
  ['character', 'Character certificate'],
  ['fee', 'Fee certificate'],
  ['transfer', 'Transfer certificate'],
];

function Documents({ base, childId, readOnly }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ type: 'bonafide', purpose: '' });
  const [error, setError] = useState('');
  const load = () => api(`${base}/documents`).then(setRows);
  useEffect(() => {
    load();
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const request = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`${base}/documents`, { method: 'POST', body: form });
      setForm({ ...form, purpose: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <p className="hint">
        {readOnly
          ? 'Ask for a certificate here. The school office issues it (or tells you why not) and you will be notified. A transfer certificate is requested by your parent or at the school office.'
          : 'The school office issues each certificate or tells you why not, and you will be notified.'}
      </p>
      <form className="card form" onSubmit={request}>
        <label>
          Certificate
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {DOC_TYPES.filter(([v]) => !(readOnly && v === 'transfer')).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Purpose
          <input
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            placeholder="e.g. Bank account"
          />
        </label>
        <button type="submit">Request</button>
      </form>
      {error && <p className="error">{error}</p>}
      <TableCard>
        <thead>
          <tr>
            <th>Certificate</th>
            <th>Purpose</th>
            <th>Requested by</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.id}>
              <td>{r.typeLabel}</td>
              <td>
                {r.purpose}
                {r.status === 'rejected' && r.remarks && (
                  <>
                    <br />
                    <small>{r.remarks}</small>
                  </>
                )}
              </td>
              <td style={{ textTransform: 'capitalize' }}>{r.appliedBy ?? '—'}</td>
              <td>
                <span
                  className={`badge ${r.status === 'issued' ? 'paid' : r.status === 'rejected' ? 'overdue' : 'partial'}`}
                >
                  {r.status}
                </span>
                {r.decidedByName && (
                  <small className="block">
                    {r.status === 'issued' ? 'Issued' : 'Decided'} by {r.decidedByName}
                    {r.decidedOn ? ` · ${String(r.decidedOn).slice(0, 10)}` : ''}
                  </small>
                )}
              </td>
              <td>
                {r.status === 'issued' && (
                  <Link className="btn" to={`/portal-print/${childId}/${r.id}`}>
                    View / print
                  </Link>
                )}
              </td>
            </tr>
          ))}
          {rows && !rows.length && (
            <tr>
              <td colSpan={5}>No requests yet</td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}

function Leave({ base, readOnly: isStudent }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' });
  const [types, setTypes] = useState([]);
  const [error, setError] = useState('');
  const load = () =>
    api(`${base}/leaves`)
      .then(setRows)
      .catch(() => setRows([]));
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState([]);
  useEffect(() => {
    api('/portal/leave-types')
      .then(setTypes)
      .catch(() => {});
  }, []);
  useEffect(() => {
    api(`${base}/leave-balance`)
      .then(setBalance)
      .catch(() => setBalance([]));
  }, [base, rows]);
  useEffect(() => {
    setRows(null);
    load();
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps
  const badge = { approved: 'paid', rejected: 'overdue', pending: 'partial', cancelled: '' };

  const apply = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await api(`${base}/leaves`, { method: 'POST', body: form });
      setForm({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async (l) => {
    try {
      await api(`${base}/leaves/${l.id}/cancel`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <p className="hint">
        {isStudent
          ? 'Your request goes to your class teacher, who approves or rejects it. You will get a notification and can see the decision here. Your parents can see it too.'
          : 'The class teacher (or an admin) approves or rejects each request. You will be notified of the decision, and you can see it here.'}
      </p>
      {balance.some((b) => b.yearlyDays !== null) && (
        <p className="hint">
          Leave used this year:{' '}
          {balance
            .map((b) => `${b.name} ${b.used}${b.yearlyDays !== null ? ` of ${b.yearlyDays} days` : ' days'}`)
            .join(' · ')}
        </p>
      )}
      <form className="card form" onSubmit={apply}>
        <label>
          Type
          <select
            value={form.leaveTypeId}
            onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
            required
          >
            <option value="">Choose</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={form.fromDate}
            onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
            required
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={form.toDate}
            onChange={(e) => setForm({ ...form, toDate: e.target.value })}
            required
          />
        </label>
        <label>
          Reason
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Apply for leave'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <TableCard>
        <thead>
          <tr>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Days</th>
            <th>Reason</th>
            <th>Applied by</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((l) => (
            <tr key={l.id}>
              <td>{l.leaveType ?? '—'}</td>
              <td>{l.fromDate}</td>
              <td>{l.toDate}</td>
              <td>{l.days}</td>
              <td>
                {l.reason}
                {l.remarks && (
                  <>
                    <br />
                    <small>{l.remarks}</small>
                  </>
                )}
              </td>
              <td style={{ textTransform: 'capitalize' }}>{l.appliedBy ?? '—'}</td>
              <td>
                <span className={`badge ${badge[l.status]}`}>{l.status}</span>
                {l.decidedByName && (
                  <small className="block">
                    {l.status === 'approved' ? 'Approved' : l.status === 'rejected' ? 'Rejected' : 'Decided'}{' '}
                    by {l.decidedByName}
                    {l.decidedOn ? ` · ${String(l.decidedOn).slice(0, 10)}` : ''}
                  </small>
                )}
              </td>
              <td>
                {['pending', 'approved'].includes(l.status) && (
                  <button onClick={() => withdraw(l)}>Withdraw</button>
                )}
              </td>
            </tr>
          ))}
          {rows && !rows.length && (
            <tr>
              <td colSpan={8}>No leave requests</td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}

function Homework({ base }) {
  const [hw, setHw] = useState(null);
  useEffect(() => {
    api(`${base}/homework`).then(setHw);
  }, [base]);
  if (!hw) return <p>Loading…</p>;
  const badge = { submitted: 'paid', late: 'partial', missing: 'overdue', pending: '' };
  return (
    <>
      <TableCard>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Homework</th>
            <th>Due</th>
            <th>Status</th>
            <th>Marks</th>
          </tr>
        </thead>
        <tbody>
          {hw.map((h) => (
            <tr key={h.id} className={h.overdue && h.submission.status === 'pending' ? 'failed' : ''}>
              <td>{h.subjectName}</td>
              <td>
                {h.title}
                {h.description && (
                  <>
                    <br />
                    <small>{h.description}</small>
                  </>
                )}
              </td>
              <td>{h.dueDate}</td>
              <td>
                <span className={`badge ${badge[h.submission.status]}`}>{h.submission.status}</span>
                {h.submission.remarks && (
                  <>
                    <br />
                    <small>{h.submission.remarks}</small>
                  </>
                )}
              </td>
              <td>
                {h.submission.marks !== null
                  ? `${h.submission.marks}${h.maxMarks ? ` / ${h.maxMarks}` : ''}`
                  : ''}
              </td>
            </tr>
          ))}
          {!hw.length && (
            <tr>
              <td colSpan={5}>No assignments set</td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}

function Materials({ base }) {
  const [materials, setMaterials] = useState(null);
  useEffect(() => {
    api(`${base}/materials`)
      .then(setMaterials)
      .catch(() => setMaterials([]));
  }, [base]);
  return (
    <TableCard>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Material</th>
        </tr>
      </thead>
      <tbody>
        {(materials ?? []).map((m) => (
          <tr key={m.id}>
            <td>{m.subjectName}</td>
            <td>
              <a href={m.url} target="_blank" rel="noopener noreferrer">
                {m.title}
              </a>
              {m.description && (
                <>
                  <br />
                  <small>{m.description}</small>
                </>
              )}
            </td>
          </tr>
        ))}
        {materials && !materials.length && (
          <tr>
            <td colSpan={2}>Nothing shared yet</td>
          </tr>
        )}
        {!materials && (
          <tr>
            <td colSpan={2}>Loading…</td>
          </tr>
        )}
      </tbody>
    </TableCard>
  );
}

// One part of a topic: text, a video or web link, or a protected file (videos play in the page).
function LessonPart({ base, part, onError }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const blob = () => fetchBlob(`${base}/lms/parts/${part.id}/file`);
  const download = async () => {
    try {
      const url = URL.createObjectURL(await blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = part.attachmentName || 'lesson-file';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      onError(e.message);
    }
  };
  const watch = async () => {
    try {
      setVideoUrl(URL.createObjectURL(await blob()));
    } catch (e) {
      onError(e.message);
    }
  };
  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );
  return (
    <div>
      <b>{part.title}</b>
      {part.kind === 'text' && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{part.content}</p>}
      {part.kind === 'video' && (
        <div className="link-buttons">
          <a className="btn" href={part.url} target="_blank" rel="noopener noreferrer">
            Watch video
          </a>
        </div>
      )}
      {part.kind === 'link' && (
        <div className="link-buttons">
          <a className="btn" href={part.url} target="_blank" rel="noopener noreferrer">
            Open link
          </a>
        </div>
      )}
      {part.kind === 'file' && (
        <div>
          {part.content && <p>{part.content}</p>}
          {part.hasAttachment ? (
            <>
              <button type="button" className="ghost" onClick={download}>
                Download {part.attachmentName}
              </button>
              {part.attachmentMime?.startsWith('video/') && (
                <button type="button" onClick={watch}>
                  Play video
                </button>
              )}
              {videoUrl && (
                <video
                  controls
                  playsInline
                  src={videoUrl}
                  style={{ display: 'block', width: '100%', maxHeight: 420, marginTop: 10 }}
                />
              )}
            </>
          ) : (
            <small className="hint">File coming soon.</small>
          )}
        </div>
      )}
    </div>
  );
}

function LmsCourses({ base, readOnly }) {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');
  const [assignmentValues, setAssignmentValues] = useState({});
  const [quizValues, setQuizValues] = useState({});
  const [quizScores, setQuizScores] = useState({});
  const [videoSource, setVideoSource] = useState(null);
  const [uploading, setUploading] = useState(null);
  const load = () =>
    api(`${base}/lms`)
      .then(setCourses)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps
  const complete = async (lesson) => {
    try {
      await api(`${base}/lms/lessons/${lesson.id}/complete`, { method: 'POST', body: {} });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const markRead = async (lesson) => {
    try {
      await api(`${base}/lms/lessons/${lesson.id}/view`, { method: 'POST', body: {} });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const submitAssignment = async (assignment) => {
    const values = assignmentValues[assignment.id] ?? {};
    try {
      await api(`${base}/lms/assignments/${assignment.id}/submit`, { method: 'POST', body: values });
      setError('');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const submitQuiz = async (quiz) => {
    try {
      const result = await api(`${base}/lms/quizzes/${quiz.id}/attempts`, {
        method: 'POST',
        body: { answers: quizValues[quiz.id] ?? {} },
      });
      setQuizScores({ ...quizScores, [quiz.id]: result });
      setError('');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const uploadAssignment = async (assignment, file) => {
    if (!file) return;
    setUploading(assignment.id);
    setError('');
    try {
      await uploadFile(
        `${base}/lms/assignments/${assignment.id}/file?name=${encodeURIComponent(file.name)}`,
        file,
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };
  const downloadAssignment = async (assignment) => {
    try {
      const blob = await fetchBlob(`${base}/lms/assignments/${assignment.id}/file`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = assignment.submission.attachmentName || 'submission';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };
  const downloadLesson = async (lesson) => {
    try {
      const blob = await fetchBlob(`${base}/lms/lessons/${lesson.id}/file`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = lesson.attachmentName || 'lesson-document';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  };
  const downloadMaterial = async (m) => {
    try {
      const blob = await fetchBlob(`${base}/lms/materials/${m.id}/file`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = m.attachmentName || 'material';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  };
  const watchUploadedVideo = async (lesson) => {
    try {
      if (videoSource?.url) URL.revokeObjectURL(videoSource.url);
      const blob = await fetchBlob(`${base}/lms/lessons/${lesson.id}/file`);
      setVideoSource({ id: lesson.id, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="lms-ns">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!courses && !error && <p>Loading courses…</p>}
      {courses?.length > 0 && <LmsStudentHome courses={courses} base={base} readOnly={readOnly} />}
      {courses?.map((course) => (
        <section className="card" id={`lms-course-${course.id}`} key={course.id} style={{ marginBottom: 14 }}>
          <div className="profile-head">
            <div>
              <h2>{course.title}</h2>
              <p className="hint">
                {course.subjectName} · {course.completed}/{course.total} lessons complete · {course.status}
              </p>
            </div>
            <span className="badge">{course.completionPercent}%</span>
          </div>
          {course.description && <p>{course.description}</p>}
          <LmsCertificate course={course} />
          {course.announcements?.length > 0 && (
            <section>
              <h3>Course announcements</h3>
              {course.announcements.map((a) => (
                <article
                  className="card"
                  key={`announcement-${a.id}`}
                  style={{ margin: '10px 0', padding: 16 }}
                >
                  <b>{a.title}</b>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p>
                  <small>
                    {a.createdByName} · {new Date(a.createdAt).toLocaleString()}
                  </small>
                </article>
              ))}
            </section>
          )}
          {course.materials?.length > 0 && (
            <section>
              <h3>Course materials</h3>
              {course.materials.map((m) => (
                <div className="lms-row" key={`material-${m.id}`}>
                  <span className="lms-icon file">
                    {m.kind === 'file'
                      ? (m.attachmentName?.split('.').pop() || 'FILE').slice(0, 4).toUpperCase()
                      : m.kind === 'video'
                        ? 'LINK'
                        : 'WEB'}
                  </span>
                  <div>
                    <b>{m.title}</b>
                    {m.description && <small className="block">{m.description}</small>}
                    {m.kind === 'file' && <small className="block">{m.attachmentName}</small>}
                  </div>
                  {m.kind === 'file' ? (
                    m.hasAttachment && (
                      <button type="button" className="ghost" onClick={() => downloadMaterial(m)}>
                        Download
                      </button>
                    )
                  ) : (
                    <a className="btn" href={m.url} target="_blank" rel="noopener noreferrer">
                      Open
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}
          <div className="lms-course-layout">
            <LmsCourseOutline course={course} />
            <div>
              {!course.lessons.length && <p className="hint">No published lessons yet.</p>}
              {course.lessons.map((lesson, index) => (
                <Fragment key={lesson.id}>
                  {lesson.moduleTitle && lesson.moduleTitle !== course.lessons[index - 1]?.moduleTitle && (
                    <h3 style={{ marginTop: 18 }}>
                      Section {lesson.moduleSequence}: {lesson.moduleTitle}
                    </h3>
                  )}
                  <article
                    className="card"
                    id={`lms-lesson-${lesson.id}`}
                    style={{ margin: '10px 0', padding: 16 }}
                  >
                    <div className="profile-head">
                      <div>
                        <h3>
                          {lesson.sequence}. {lesson.title}
                        </h3>
                        <small>
                          {lesson.viewCount ?? 0} reads
                          {lesson.viewedAt
                            ? ` · last read ${new Date(lesson.viewedAt).toLocaleDateString()}`
                            : ''}
                        </small>
                      </div>
                      {readOnly ? (
                        <span className={`badge ${lesson.completedAt ? 'active' : 'partial'}`}>
                          {lesson.completedAt ? 'Completed' : 'Not completed'}
                        </span>
                      ) : (
                        <div className="row-actions">
                          <button type="button" className="ghost" onClick={() => markRead(lesson)}>
                            {lesson.viewCount ? 'Record another read' : 'Mark as read'}
                          </button>
                          {lesson.completedAt ? (
                            <span className="badge active">Completed</span>
                          ) : (
                            <button type="button" onClick={() => complete(lesson)}>
                              Mark complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {lesson.content && <p style={{ whiteSpace: 'pre-wrap' }}>{lesson.content}</p>}
                    <div className="link-buttons">
                      {lesson.videoUrl && (
                        <a className="btn" href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">
                          Watch lesson
                        </a>
                      )}
                      {lesson.resourceUrl && (
                        <a
                          className="btn"
                          href={lesson.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open resource
                        </a>
                      )}
                    </div>
                    {lesson.hasAttachment && (
                      <div>
                        <button type="button" className="ghost" onClick={() => downloadLesson(lesson)}>
                          Download {lesson.attachmentName || 'lesson resource'}
                        </button>
                        {lesson.attachmentMime?.startsWith('video/') && (
                          <button type="button" onClick={() => watchUploadedVideo(lesson)}>
                            Watch uploaded video
                          </button>
                        )}
                        {videoSource?.id === lesson.id && (
                          <video
                            controls
                            playsInline
                            src={videoSource.url}
                            style={{ display: 'block', width: '100%', maxHeight: 420, marginTop: 10 }}
                          />
                        )}
                      </div>
                    )}
                    {lesson.parts?.length > 0 && (
                      <ol style={{ paddingLeft: 20, marginTop: 12 }}>
                        {lesson.parts.map((part) => (
                          <li key={part.id} style={{ margin: '12px 0' }}>
                            <LessonPart base={base} part={part} onError={setError} />
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>
                </Fragment>
              ))}
              {course.assignments?.length > 0 && (
                <>
                  <h3>Assignments</h3>
                  {course.assignments.map((a) => (
                    <article
                      className="card"
                      id={`lms-assignment-${a.id}`}
                      key={`a${a.id}`}
                      style={{ margin: '10px 0', padding: 16 }}
                    >
                      <h3>
                        {a.title}{' '}
                        <small>
                          · out of {a.maxScore}
                          {a.dueOn ? ` · due ${a.dueOn}` : ''}
                        </small>
                        {a.overdue && (
                          <span className="badge rejected" style={{ marginLeft: 8 }}>
                            Overdue
                          </span>
                        )}
                        {a.submission?.isLate && (
                          <span className="badge rejected" style={{ marginLeft: 8 }}>
                            Submitted late
                          </span>
                        )}
                      </h3>
                      {a.instructions && <p style={{ whiteSpace: 'pre-wrap' }}>{a.instructions}</p>}
                      {a.submission?.score != null && (
                        <p>
                          <b>Score:</b> {a.submission.score}/{a.maxScore}
                          {a.submission.feedback && (
                            <>
                              {' '}
                              · <b>Feedback:</b> {a.submission.feedback}
                            </>
                          )}
                        </p>
                      )}
                      {a.submission?.submittedAt && (
                        <p className="hint">
                          Last submitted {new Date(a.submission.submittedAt).toLocaleString()}
                        </p>
                      )}
                      {a.submission?.attachmentName && (
                        <button type="button" className="ghost" onClick={() => downloadAssignment(a)}>
                          Download {a.submission.attachmentName}
                        </button>
                      )}
                      {!readOnly && a.submission?.gradedAt == null && (
                        <div className="enq-grid">
                          <label className="wide">
                            <span>Your response</span>
                            <textarea
                              rows={3}
                              value={assignmentValues[a.id]?.response ?? a.submission?.response ?? ''}
                              onChange={(e) =>
                                setAssignmentValues({
                                  ...assignmentValues,
                                  [a.id]: { ...assignmentValues[a.id], response: e.target.value },
                                })
                              }
                            />
                          </label>
                          <label className="wide">
                            <span>Work link (optional)</span>
                            <input
                              type="url"
                              placeholder="https://"
                              value={assignmentValues[a.id]?.resourceUrl ?? a.submission?.resourceUrl ?? ''}
                              onChange={(e) =>
                                setAssignmentValues({
                                  ...assignmentValues,
                                  [a.id]: { ...assignmentValues[a.id], resourceUrl: e.target.value },
                                })
                              }
                            />
                          </label>
                          <label className="wide">
                            <span>Attach PDF or image (max 5 MB)</span>
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/webp"
                              disabled={uploading === a.id}
                              onChange={(e) => uploadAssignment(a, e.target.files?.[0])}
                            />
                            {uploading === a.id && <small>Uploading…</small>}
                          </label>
                          <button type="button" onClick={() => submitAssignment(a)}>
                            {a.submission ? 'Update submission' : 'Submit assignment'}
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </>
              )}
              {course.quizzes?.length > 0 && (
                <>
                  <h3>Quizzes</h3>
                  {course.quizzes.map((q) => (
                    <article
                      className="card"
                      id={`lms-quiz-${q.id}`}
                      key={`q${q.id}`}
                      style={{ margin: '10px 0', padding: 16 }}
                    >
                      <h3>
                        {q.title}{' '}
                        <small>
                          · {q.questions.length} questions · {q.attemptCount}/{q.maxAttempts} attempts
                          {q.dueOn ? ` · due ${q.dueOn}` : ''}
                        </small>
                        {q.overdue && (
                          <span className="badge rejected" style={{ marginLeft: 8 }}>
                            Past due
                          </span>
                        )}
                      </h3>
                      {q.description && <p>{q.description}</p>}
                      {q.latestAttempt && (
                        <>
                          <p>
                            <b>Latest:</b> {q.latestAttempt.score}/{q.latestAttempt.maxScore} ·{' '}
                            {q.latestAttempt.reviewStatus === 'pending_review'
                              ? 'Awaiting teacher review'
                              : 'Reviewed'}
                            {q.bestScore != null && ` · best ${q.bestScore}/${q.maxScore}`}
                          </p>
                          {q.latestAttempt.feedback && (
                            <p>
                              <b>Teacher feedback:</b> {q.latestAttempt.feedback}
                            </p>
                          )}
                          {q.latestAttempt.questions?.map((result) => (
                            <p key={result.id}>
                              {result.prompt}:{' '}
                              {Array.isArray(result.answer)
                                ? result.answer
                                    .map(
                                      (i) =>
                                        q.questions.find((question) => question.id === result.id)?.choices[i],
                                    )
                                    .join(', ')
                                : result.type === 'single_choice' || result.type === 'true_false'
                                  ? q.questions.find((question) => question.id === result.id)?.choices[
                                      result.answer
                                    ]
                                  : result.answer}{' '}
                              · {result.awarded}/{result.points}
                              {result.correct === false && result.correctAnswer !== null
                                ? ` · Correct answer: ${Array.isArray(result.correctAnswer) ? result.correctAnswer.map((i) => q.questions.find((question) => question.id === result.id)?.choices[i]).join(', ') : q.questions.find((question) => question.id === result.id)?.choices[result.correctAnswer]}`
                                : ''}
                            </p>
                          ))}
                        </>
                      )}
                      {!readOnly && q.attemptCount < q.maxAttempts && (
                        <>
                          <div className="enq-grid">
                            {q.questions.map((question) => {
                              const type = question.type || 'single_choice';
                              const value = quizValues[q.id]?.[question.id];
                              return (
                                <fieldset className="wide" key={question.id}>
                                  <legend>{question.prompt}</legend>
                                  {type === 'short_answer' ? (
                                    <textarea
                                      rows={3}
                                      maxLength={2000}
                                      value={value ?? ''}
                                      onChange={(e) =>
                                        setQuizValues({
                                          ...quizValues,
                                          [q.id]: { ...quizValues[q.id], [question.id]: e.target.value },
                                        })
                                      }
                                    />
                                  ) : (
                                    question.choices.map((choice, index) => (
                                      <label key={index} style={{ display: 'block', margin: '6px 0' }}>
                                        <input
                                          type={type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                          name={`quiz-${q.id}-${question.id}`}
                                          checked={
                                            type === 'multiple_choice'
                                              ? (value ?? []).includes(index)
                                              : Number(value) === index
                                          }
                                          onChange={(e) =>
                                            setQuizValues({
                                              ...quizValues,
                                              [q.id]: {
                                                ...quizValues[q.id],
                                                [question.id]:
                                                  type === 'multiple_choice'
                                                    ? [
                                                        ...new Set([
                                                          ...(value ?? []).filter((x) => x !== index),
                                                          ...(e.target.checked ? [index] : []),
                                                        ]),
                                                      ]
                                                    : index,
                                              },
                                            })
                                          }
                                        />{' '}
                                        {choice}
                                      </label>
                                    ))
                                  )}
                                </fieldset>
                              );
                            })}
                          </div>
                          <button type="button" onClick={() => submitQuiz(q)}>
                            Submit quiz
                          </button>
                        </>
                      )}
                      {quizScores[q.id] && (
                        <p className="success">
                          Attempt score: {quizScores[q.id].score}/{quizScores[q.id].maxScore}
                        </p>
                      )}
                    </article>
                  ))}
                </>
              )}
            </div>
          </div>
        </section>
      ))}
      {courses?.length === 0 && <p className="hint">No courses have been published for this class yet.</p>}
    </div>
  );
}

function Activities({ base }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const load = () => api(`${base}/activities`).then(setRows);
  useEffect(() => {
    load();
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = async (a, consent) => {
    setError('');
    try {
      await api(`${base}/activities/${a.activityId}/consent`, { method: 'PUT', body: { consent } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const consentBadge = { given: 'paid', declined: 'overdue', pending: 'partial' };

  return (
    <>
      {error && <p className="error">{error}</p>}
      <TableCard>
        <thead>
          <tr>
            <th>Activity</th>
            <th>When</th>
            <th>Fee</th>
            <th>Your consent</th>
            <th>Took part</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((a) => (
            <tr key={a.activityId}>
              <td>
                <b>{a.title}</b>
                <br />
                <small>
                  {a.kindLabel}
                  {a.venue && ` · ${a.venue}`}
                </small>
              </td>
              <td>
                {a.startDate}
                {a.endDate !== a.startDate && ` → ${a.endDate}`}
              </td>
              <td>{Number(a.fee) > 0 ? a.fee : '—'}</td>
              <td>
                {a.requiresConsent ? (
                  <>
                    <span className={`badge ${consentBadge[a.consent]}`}>{a.consent}</span>
                    {!['completed', 'cancelled'].includes(a.activityStatus) && a.status !== 'attended' && (
                      <>
                        {a.consent !== 'given' && <button onClick={() => answer(a, 'given')}>I agree</button>}
                        {a.consent !== 'declined' && (
                          <button className="danger" onClick={() => answer(a, 'declined')}>
                            Decline
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <small>not needed</small>
                )}
              </td>
              <td>{a.status === 'attended' ? 'Yes' : a.status === 'absent' ? 'No' : '—'}</td>
              <td>{a.result ?? ''}</td>
            </tr>
          ))}
          {rows && !rows.length && (
            <tr>
              <td colSpan={6}>Your child is not registered for any activity yet.</td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}

const fmt = (d) =>
  new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
const daysIn = (from, to) =>
  Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000) + 1;

function Notices({ notices }) {
  return (
    <>
      <h2>Notices from school</h2>
      {notices.map((n) => (
        <div className="card" key={n.id}>
          <b>{n.title}</b> <small>· {String(n.createdAt).slice(0, 10)}</small>
          <p>{n.body}</p>
        </div>
      ))}
      {!notices.length && <p className="hint">No notices.</p>}
    </>
  );
}

/** The days the school is closed in a year. */
function Holidays() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api(`/portal/calendar?from=${year}-01-01&to=${year}-12-31`)
      .then((all) => setRows(all.filter((e) => e.type === 'holiday')))
      .catch(() => setRows([]));
  }, [year]);
  return (
    <>
      <div className="card form">
        <label>
          Year
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TableCard>
        <thead>
          <tr>
            <th>Holiday</th>
            <th>From</th>
            <th>To</th>
            <th>Days</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((e) => (
            <tr key={e.id}>
              <td>
                <b>{e.title}</b>
                {e.description && <small className="block">{e.description}</small>}
              </td>
              <td>{fmt(e.startDate)}</td>
              <td>{e.endDate !== e.startDate ? fmt(e.endDate) : '—'}</td>
              <td>{daysIn(e.startDate, e.endDate)}</td>
            </tr>
          ))}
          {rows && !rows.length && (
            <tr>
              <td colSpan={4} className="empty-row">
                No holidays listed for {year}.
              </td>
            </tr>
          )}
          {!rows && (
            <tr>
              <td colSpan={4}>Loading…</td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}

/** Holidays, exams and events for one month, and the year's holidays below. */
function Calendar() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const [y, m] = month.split('-').map(Number);
    const last = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    api(`/portal/calendar?from=${month}-01&to=${last}`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [month]);
  return (
    <>
      <div className="card form">
        <label>
          Month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value || month)} />
        </label>
      </div>
      <TableCard>
        <thead>
          <tr>
            <th>Date</th>
            <th>Event</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((e) => (
            <tr key={e.id}>
              <td>
                {fmt(e.startDate)}
                {e.endDate !== e.startDate && ` → ${fmt(e.endDate)}`}
              </td>
              <td>
                <b>{e.title}</b>
                {e.description && <small className="block">{e.description}</small>}
              </td>
              <td>
                <span className="badge">{e.type}</span>
              </td>
            </tr>
          ))}
          {rows && !rows.length && (
            <tr>
              <td colSpan={3} className="empty-row">
                Nothing scheduled this month.
              </td>
            </tr>
          )}
          {!rows && (
            <tr>
              <td colSpan={3}>Loading…</td>
            </tr>
          )}
        </tbody>
      </TableCard>
      <h2>Holidays</h2>
      <Holidays />
    </>
  );
}

/** The live classes of the student's class, with a Join button on the day. */
function OnlineClasses({ base }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api(`${base}/online-classes`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [base]);
  if (!rows) return <p>Loading…</p>;
  const today = localDate();
  const upcoming = rows.filter((r) => r.classDate >= today);
  const earlier = rows.filter((r) => r.classDate < today).reverse();
  const table = (list, join) => (
    <TableCard>
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Topic</th>
          <th>Subject</th>
          <th>Teacher</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id}>
            <td>
              {fmt(c.classDate)}
              {c.today && (
                <span className="badge paid" style={{ marginLeft: 6 }}>
                  today
                </span>
              )}
            </td>
            <td>
              {c.startTime}
              {c.endTime ? ` – ${c.endTime}` : ''}
            </td>
            <td>
              <b>{c.title}</b>
              {c.notes && <small className="block">{c.notes}</small>}
            </td>
            <td>{c.subjectName ?? '—'}</td>
            <td>{c.teacherName ?? '—'}</td>
            <td>
              {join && (
                <a className="btn" href={c.link} target="_blank" rel="noopener noreferrer">
                  Join class
                </a>
              )}
            </td>
          </tr>
        ))}
        {!list.length && (
          <tr>
            <td colSpan={6} className="empty-row">
              {join ? 'No online classes are scheduled.' : 'Nothing in the last week.'}
            </td>
          </tr>
        )}
      </tbody>
    </TableCard>
  );
  return (
    <>
      <h2>Upcoming</h2>
      {table(upcoming, true)}
      {earlier.length > 0 && (
        <>
          <h2>Last week</h2>
          {table(earlier, false)}
        </>
      )}
    </>
  );
}

const FAQ = [
  [
    'How do I see my homework?',
    'Open Homework & Assignments. Anything overdue is marked, and your teacher’s marks and remarks appear there once checked.',
  ],
  [
    'Where do I join my online class?',
    'Open Online Classes. On the day of the class a Join class button opens the video link. The link works only for the class it was made for.',
  ],
  [
    'I think my attendance or marks are wrong.',
    'Tell your class teacher. For marks, your parent can ask for a recheck under Exams & Results.',
  ],
  [
    'How do I change my password?',
    'Use Settings & Change Password in the menu. Choose something only you know, and never share it.',
  ],
  [
    'I forgot my password.',
    'Ask the school office to reset it. You will be given a temporary password and asked to choose a new one when you sign in.',
  ],
  [
    'How do I apply for leave or get a certificate?',
    'Your parent or guardian applies from their own login. You can see the status of leave requests and any certificates issued under Leave Requests and Certificates & Documents.',
  ],
];

/** Answers to the common questions, and how to reach the school. */
function Help() {
  const school = useSchoolBrand();
  return (
    <>
      {FAQ.map(([q, a]) => (
        <div className="card" key={q}>
          <b>{q}</b>
          <p style={{ margin: '6px 0 0' }}>{a}</p>
        </div>
      ))}
      <section className="details-section">
        <h4>Contact the school</h4>
        <dl>
          <div>
            <dt>School</dt>
            <dd>{school.name}</dd>
          </div>
          {school.phone && (
            <div>
              <dt>Phone</dt>
              <dd>{school.phone}</dd>
            </div>
          )}
          {school.email && (
            <div>
              <dt>Email</dt>
              <dd>{school.email}</dd>
            </div>
          )}
          {school.address && (
            <div>
              <dt>Address</dt>
              <dd>{school.address}</dd>
            </div>
          )}
        </dl>
        <p className="hint">
          Need to change your password? <Link to="/change-password">Open Settings & Change Password</Link>.
        </p>
      </section>
    </>
  );
}

const KIND = {
  absence: 'Absence alert',
  fee_reminder: 'Fee reminder',
  direct: 'Message',
  broadcast: 'Announcement',
};

/** Who the student is, for reading. */
function Profile({ base }) {
  const [p, setP] = useState(null);
  useEffect(() => {
    api(`${base}/profile`)
      .then(setP)
      .catch(() => setP({ name: '', sections: [], qualifications: [], siblings: [] }));
  }, [base]);
  if (!p) return <p>Loading…</p>;
  return (
    <div className="student-details">
      <div className="details-head">
        <div>
          <h3>{p.name}</h3>
        </div>
      </div>
      <div className="stats">
        <ClassTeacher teacher={p.classTeacher} />
      </div>
      {p.sections.map((s) => (
        <section key={s.title} className="details-section">
          <h4>{s.title}</h4>
          <dl>
            {s.rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{/^\d{4}-\d{2}-\d{2}/.test(String(v)) ? fmt(v) : String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section className="details-section">
        <h4>Qualifications</h4>
        <QualificationTable rows={p.qualifications} />
      </section>
      <section className="details-section">
        <h4>Brothers and sisters</h4>
        <SiblingsTable rows={p.siblings} />
      </section>
      <p className="hint">If something here is wrong, please tell your class teacher or the school office.</p>
    </div>
  );
}

/** The library card and the books borrowed. */
function Library({ base }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    api(`${base}/library`)
      .then(setD)
      .catch(() => setD({ card: null, loans: [] }));
  }, [base]);
  if (!d) return <p>Loading…</p>;
  const onLoan = d.loans.filter((l) => !l.returnedOn);
  return (
    <>
      <div className="stats">
        <div className="card">
          <span>Library card</span>
          <b>{d.card ? d.card.cardNo : 'No card'}</b>
          {d.card && (
            <small>
              {d.card.status === 'active' ? 'Active' : 'Suspended'} · up to {d.card.maxBooks} books
              {d.card.validUntil ? ` · valid until ${fmt(d.card.validUntil)}` : ''}
            </small>
          )}
        </div>
        <div className="card">
          <span>Books on loan</span>
          <b>{onLoan.length}</b>
          {onLoan.some((l) => l.overdue) && (
            <small className="error">{onLoan.filter((l) => l.overdue).length} overdue</small>
          )}
        </div>
      </div>
      <TableCard>
        <thead>
          <tr>
            <th>Book</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Returned</th>
            <th>Fine</th>
          </tr>
        </thead>
        <tbody>
          {d.loans.map((l) => (
            <tr key={l.id}>
              <td>
                <b>{l.title}</b>
                {l.author && <small className="block">{l.author}</small>}
              </td>
              <td>{fmt(l.issuedOn)}</td>
              <td>
                {fmt(l.dueOn)}
                {l.overdue && (
                  <span className="badge overdue" style={{ marginLeft: 6 }}>
                    overdue
                  </span>
                )}
              </td>
              <td>{l.returnedOn ? fmt(l.returnedOn) : <span className="badge partial">on loan</span>}</td>
              <td>{Number(l.fine) > 0 ? l.fine : '—'}</td>
            </tr>
          ))}
          {!d.loans.length && (
            <tr>
              <td colSpan={5} className="empty-row">
                No books borrowed yet.
              </td>
            </tr>
          )}
        </tbody>
      </TableCard>
    </>
  );
}

/** The school bus: route, stop and pickup time. */
function Transport({ base }) {
  const [t, setT] = useState(undefined);
  const [bus, setBus] = useState(null);
  useEffect(() => {
    let live = true;
    setT(undefined);
    setBus(null); // another child: forget the last one's bus
    api(`${base}/transport`)
      .then((x) => {
        if (live) setT(x);
      })
      .catch(() => {
        if (live) setT(null);
      });
    return () => {
      live = false;
    };
  }, [base]);
  useEffect(() => {
    if (!t) return undefined;
    let live = true;
    const load = () =>
      api(`${base}/bus-location`)
        .then((b) => {
          if (live) setBus(b);
        })
        .catch(() => {}); // a failed poll keeps the last position
    load();
    const timer = setInterval(load, 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [base, t]);
  if (t === undefined) return <p>Loading…</p>;
  if (!t) return <p className="hint">This student does not use school transport.</p>;
  const rows = [
    ['Route', t.route],
    ['Pickup stop', t.stop],
    ['Pickup time', t.pickupTime],
    [
      'Trips',
      { both: 'Pickup and drop', pickup: 'Pickup only', drop: 'Drop only' }[t.tripType] ?? t.tripType,
    ],
    ['Monthly fee', t.monthlyFee && Number(t.monthlyFee) > 0 ? t.monthlyFee : null],
    ['Using the bus since', t.startDate && fmt(t.startDate)],
    ['Authorised to collect', [t.authorizedPickupName, t.authorizedPickupPhone].filter(Boolean).join(' · ')],
  ].filter(([, v]) => v);
  return (
    <>
      <section className="details-section">
        <h4>Live bus location</h4>
        {bus ? (
          <>
            <BusMap latitude={bus.latitude} longitude={bus.longitude} height={280} />
            <p className="hint">
              {bus.regNo} · {bus.live ? 'live' : 'last seen'} {ago(bus.recordedAt)}
              {bus.speed != null && bus.live ? ` · ${bus.speed} km/h` : ''}
            </p>
          </>
        ) : (
          <p className="hint">The bus has not reported its location yet.</p>
        )}
      </section>
      <section className="details-section">
        <h4>Bus details</h4>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

/** What the school has sent about this student: absence alerts, fee reminders and messages. */
function Messages({ base }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api(`${base}/messages`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [base]);
  if (!rows) return <p>Loading…</p>;
  return (
    <>
      {rows.map((m) => (
        <div className="card" key={m.id}>
          <b>{m.subject || KIND[m.kind] || 'Message'}</b>{' '}
          <small>
            · {KIND[m.kind] ?? 'Message'} · {String(m.sentAt).slice(0, 10)} ·{' '}
            {m.channel === 'sms' ? 'SMS' : 'Email'}
          </small>
          <p>{m.body}</p>
        </div>
      ))}
      {!rows.length && <p className="hint">No messages from the school yet.</p>}
    </>
  );
}

const KIND_OPTIONS = [
  ['grievance', 'Grievance (a complaint)'],
  ['feedback', 'Feedback (suggestion or praise)'],
];
const FB_STATUS = {
  open: ['partial', 'Open'],
  in_progress: ['applied', 'Being looked into'],
  resolved: ['paid', 'Resolved'],
  closed: ['', 'Closed'],
};

/** Send feedback or a grievance to the school and follow its reply. It can be kept anonymous from the school office. */
function Feedback({ base }) {
  const empty = { kind: 'grievance', category: '', subject: '', details: '', rating: '', anonymous: false };
  const [rows, setRows] = useState(null);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState({ levels: [], escalateAfterDays: 0 });
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () =>
    api(`${base}/feedback`)
      .then(setRows)
      .catch(() => setRows([]));
  useEffect(() => {
    setRows(null);
    load();
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api('/portal/feedback-categories')
      .then(setCategories)
      .catch(() => {});
    api('/portal/feedback-meta')
      .then(setMeta)
      .catch(() => {});
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const out = await api(`${base}/feedback`, { method: 'POST', body: form });
      setNotice(`Sent. Your reference is ${out.ticketNo}.`);
      setForm(empty);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="hint">
        Tell the school what is going well, what could be better, or raise a problem. The school office
        replies here and you get a notification. Tick the box to keep your name from the office. A grievance
        starts with the class teacher and moves up to the school office and the principal if it is not settled
        {meta.escalateAfterDays > 0
          ? ` (after ${meta.escalateAfterDays} day${meta.escalateAfterDays === 1 ? '' : 's'} without a reply)`
          : ''}
        .
      </p>
      <form className="card form" onSubmit={send}>
        <label>
          Type
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KIND_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          >
            <option value="">Choose</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Subject
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
            maxLength={150}
          />
        </label>
        <label>
          Details
          <textarea
            rows={4}
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            required
            maxLength={3000}
          />
        </label>
        {form.kind === 'feedback' && (
          <label>
            Rating
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {'★'.repeat(n)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={form.anonymous}
            onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
          />{' '}
          Keep my name from the school office
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </form>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error">{error}</p>}
      {(rows ?? []).map((f) => (
        <div className="card" key={f.id}>
          <b>{f.subject}</b>{' '}
          <small>
            · {f.ticketNo} · {f.kind === 'grievance' ? 'Grievance' : 'Feedback'} · {f.category} ·{' '}
            {String(f.createdAt).slice(0, 10)}
          </small>{' '}
          <span className={`badge ${FB_STATUS[f.status][0]}`}>{FB_STATUS[f.status][1]}</span>
          {f.kind === 'grievance' && (
            <GrievanceLadder
              levels={meta.levels}
              level={f.level}
              settled={['resolved', 'closed'].includes(f.status)}
            />
          )}
          <p>{f.details}</p>
          {f.response && (
            <p>
              <b>Reply{f.respondedByName ? ` from ${f.respondedByName}` : ''}:</b> {f.response}
            </p>
          )}
          {f.timeline?.length > 1 && (
            <details>
              <summary>History</summary>
              <Timeline items={f.timeline} />
            </details>
          )}
        </div>
      ))}
      {rows && !rows.length && <p className="hint">You have not sent anything yet.</p>}
    </>
  );
}

const VIEWS = {
  Overview,
  Profile,
  Fees,
  Attendance,
  Leave,
  Results,
  Homework,
  Materials,
  Lms: LmsCourses,
  Library,
  Transport,
  Messages,
  Feedback,
  Activities,
  Timetable,
  Documents,
  Notices,
  Calendar,
  OnlineClasses,
  Help,
};

export default function Portal() {
  const isStudent = useAuth().user?.role === 'student';
  const [children, setChildren] = useState(null);
  const [childId, setChildId] = useState(null);
  const [params] = useSearchParams();
  const tabs = isStudent ? STUDENT_TABS : TABS;
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : 'Overview'; // the menu opens each section by its address
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/portal/children')
      .then((c) => {
        setChildren(c);
        setChildId(c[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
    api('/portal/notices')
      .then(setNotices)
      .catch(() => {});
    api('/portal/calendar')
      .then(setEvents)
      .catch(() => {});
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!children) return <p>Loading…</p>;

  const View = VIEWS[tab];
  const child = children.find((c) => c.id === childId);

  return (
    <>
      <h1>{tab === 'Overview' ? (isStudent ? 'My school' : 'Parent portal') : label(tab, isStudent)}</h1>
      <PushToggle />
      {!children.length && (
        <p className="hint">
          {isStudent
            ? 'Your student record could not be found.'
            : 'No children are linked to your account yet.'}{' '}
          Please contact the school office.
        </p>
      )}
      {children.length > 0 && (
        <>
          {!isStudent && (
            <div className="card form">
              <label>
                Child
                <select value={childId ?? ''} onChange={(e) => setChildId(Number(e.target.value))}>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.className ?? 'no class'})
                    </option>
                  ))}
                </select>
              </label>
              {child && (
                <span className="hint">
                  Adm. no {child.admissionNo} · {child.relation}
                </span>
              )}
            </div>
          )}
          {isStudent && child && (
            <p className="hint">
              {child.name} · {child.className ?? 'no class'} · Adm. no {child.admissionNo}
            </p>
          )}
          {tab === 'LMS' ? (
            <View base={`/portal/children/${childId}`} readOnly={!isStudent} />
          ) : (
            <View
              base={`/portal/children/${childId}`}
              childId={childId}
              notices={notices}
              readOnly={isStudent}
            />
          )}
        </>
      )}

      {tab === 'Overview' && (
        <>
          <h2>Coming up at school</h2>
          <TableCard>
            <tbody>
              {events.slice(0, 8).map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.startDate}
                    {e.endDate !== e.startDate && ` → ${e.endDate}`}
                  </td>
                  <td>{e.title}</td>
                  <td>
                    <span className="badge">{e.type}</span>
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td>Nothing scheduled in the next two months.</td>
                </tr>
              )}
            </tbody>
          </TableCard>

          <h2>Notices from school</h2>
          {notices.map((n) => (
            <div className="card" key={n.id}>
              <b>{n.title}</b> <small>· {String(n.createdAt).slice(0, 10)}</small>
              <p>{n.body}</p>
            </div>
          ))}
          {!notices.length && <p className="hint">No notices.</p>}
        </>
      )}
    </>
  );
}
