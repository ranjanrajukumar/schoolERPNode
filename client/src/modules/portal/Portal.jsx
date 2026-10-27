import TableCard from '../../components/TableCard.jsx';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSchoolBrand } from '../../hooks/useSchoolBrand.js';
import { QualificationTable, SiblingsTable } from '../admissions/AdmissionSections.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PushToggle from '../../components/PushToggle.jsx';
import { BusMap, ago } from '../transport/BusTracking.jsx';
import { GrievanceLadder, Timeline } from '../../components/GrievanceLadder.jsx';
import { localDate } from '../../utils/dates.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TABS = ['Overview', 'Profile', 'Attendance', 'Timetable', 'Homework', 'OnlineClasses', 'Materials', 'Results', 'Fees', 'Library', 'Activities', 'Notices', 'Messages', 'Calendar', 'Transport', 'Leave', 'Feedback', 'Documents', 'Help'];
// Answering activity consents stays with parents; a student's portal is read-only (leave requests and certificates can be read, not made).
const STUDENT_TABS = TABS.filter((t) => t !== 'Activities');
const LABELS = { Overview: 'Dashboard', Attendance: 'Attendance', Timetable: 'Class Timetable', Homework: 'Homework & Assignments', OnlineClasses: 'Online Classes', Materials: 'Learning Materials', Results: 'Exams & Results', Fees: 'Fees & Payments', Notices: 'Notices & Announcements', Calendar: 'Events & Calendar', Transport: 'Transport Tracking', Documents: 'Certificates & Documents', Feedback: 'Feedback & Grievance', Help: 'Help & Support' };
const label = (t, isStudent) => (t === 'Leave' ? (isStudent ? 'Leave Requests' : 'Apply for Leave') : t === 'Profile' ? (isStudent ? 'My Profile' : 'Child Profile') : LABELS[t] ?? t);

/** The class teacher: who to ask about the class, with a way to call or write. */
function ClassTeacher({ teacher }) {
  if (!teacher) return <div className="card"><span>Class teacher</span><b>Not assigned yet</b><small>The school office will assign one.</small></div>;
  return (
    <div className="card">
      <span>Class teacher</span>
      <b>{teacher.name}</b>
      {teacher.designation && <small>{teacher.designation}</small>}
      {teacher.phone && <small>Phone: <a href={`tel:${teacher.phone}`}>{teacher.phone}</a></small>}
      {teacher.email && <small>Email: <a href={`mailto:${teacher.email}`}>{teacher.email}</a></small>}
    </div>
  );
}

function Overview({ base }) {
  const [d, setD] = useState(null);
  useEffect(() => { api(`${base}/overview`).then(setD); }, [base]);
  if (!d) return <p>Loading…</p>;
  const { attendance: a, fees: f } = d;
  return (
    <div className="stats">
      <div className="card"><span>Attendance, last 30 days</span><b>{a.percentage === null ? 'no records' : `${a.percentage}%`}</b>
        <small>{a.present} present · {a.late} late · {a.absent} absent</small></div>
      <div className="card"><span>Fees outstanding</span><b>{f.outstanding}</b>
        {f.overdueItems > 0 && <small className="error">{f.overdueItems} overdue item(s)</small>}</div>
      <ClassTeacher teacher={d.classTeacher} />
    </div>
  );
}

function Fees({ base }) {
  const [d, setD] = useState(null);
  useEffect(() => { api(`${base}/fees`).then(setD); }, [base]);
  if (!d) return <p>Loading…</p>;
  return (
    <>
      <TableCard>
        <thead><tr><th>Fee</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due</th><th>Status</th></tr></thead>
        <tbody>
          {d.fees.map((f) => (
            <tr key={f.id}>
              <td>{f.title}</td><td>{f.amount}</td><td>{f.paidAmount}</td><td>{f.balance}</td><td>{f.dueDate}</td>
              <td><span className={`badge ${f.status}`}>{f.status}</span></td>
            </tr>
          ))}
          {!d.fees.length && <tr><td colSpan={6}>No fees</td></tr>}
        </tbody>
      </TableCard>
      <h2>Payments made</h2>
      <TableCard>
        <thead><tr><th>Receipt</th><th>Date</th><th>For</th><th>Method</th><th>Amount</th></tr></thead>
        <tbody>
          {d.payments.map((p) => <tr key={p.id}><td>{p.receiptNo}</td><td>{p.paidOn}</td><td>{p.feeTitle}</td><td>{p.method}</td><td>{p.amount}</td></tr>)}
          {!d.payments.length && <tr><td colSpan={5}>No payments yet</td></tr>}
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
      <div className="card form"><label>Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label></div>
      <TableCard>
        <thead><tr><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.date}><td>{r.date}</td>
              <td><span className={`badge ${r.status === 'present' ? 'paid' : r.status === 'late' ? 'partial' : 'overdue'}`}>{r.status}</span></td></tr>
          ))}
          {rows && !rows.length && <tr><td colSpan={2}>No attendance recorded this month</td></tr>}
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
  const loadRequests = () => api(`${base}/revaluations`).then(setRequests).catch(() => {});
  useEffect(() => { api(`${base}/results`).then(setRows); setCard(null); loadRequests(); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = async (subject) => {
    const reason = prompt(`Why should the ${subject.subject} mark be rechecked?`);
    if (!reason) return;
    setError(''); setNotice('');
    try {
      await api(`${base}/revaluations`, { method: 'POST', body: { examId: card.exam.id, subjectId: subject.subjectId, reason } });
      setNotice(`Revaluation requested for ${subject.subject}. The school will review it.`);
      loadRequests();
    } catch (err) { setError(err.message); }
  };

  if (card) {
    return (
      <div className="card report-card">
        <h2>{card.exam.name}</h2>
        <TableCard>
          <thead><tr><th>Subject</th><th>Marks</th><th>Out of</th><th>Grade</th><th className="no-print" /></tr></thead>
          <tbody>
            {card.subjects.map((s) => (
              <tr key={s.subject} className={s.passed === false ? 'failed' : ''}>
                <td>{s.subject}</td><td>{s.marks ?? '—'}</td><td>{s.maxMarks}</td><td>{s.grade ?? '—'}</td>
                <td className="no-print">{s.marks !== null && <button onClick={() => query(s)}>Ask for recheck</button>}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}
        {card.summary && <p>Total <b>{card.summary.total} / {card.summary.outOf}</b> · {card.summary.percentage}% · Grade <b>{card.summary.grade}</b> · Rank <b>{card.summary.rank}</b> of {card.classSize} · <b>{card.summary.result}</b></p>}
        <button className="no-print" onClick={() => window.print()}>Print</button>
        <button className="no-print" onClick={() => setCard(null)}>Back</button>
      </div>
    );
  }

  return (
    <>
    <TableCard>
      <thead><tr><th>Exam</th><th>Total</th><th>%</th><th>Grade</th><th>Rank</th><th>Result</th><th /></tr></thead>
      <tbody>
        {(rows ?? []).map((r) => (
          <tr key={r.examId}>
            <td>{r.name}</td><td>{r.total} / {r.outOf}</td><td>{r.percentage}</td><td>{r.grade}</td><td>{r.rank}</td>
            <td><span className={`badge ${r.result}`}>{r.result}</span></td>
            <td><button onClick={() => api(`${base}/report-card/${r.examId}`).then(setCard)}>Report card</button></td>
          </tr>
        ))}
        {rows && !rows.length && <tr><td colSpan={7}>No published results yet</td></tr>}
      </tbody>
    </TableCard>
    {requests.length > 0 && (
      <>
        <h2>Recheck requests</h2>
        <TableCard>
          <thead><tr><th>Exam</th><th>Subject</th><th>Original</th><th>Revised</th><th>Status</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.examName}</td><td>{r.subjectName}</td><td>{r.originalMarks}</td><td>{r.newMarks ?? '—'}</td>
                <td><span className={`badge ${r.status === 'accepted' ? 'paid' : r.status === 'rejected' ? 'overdue' : 'partial'}`}>{r.status}</span>{r.remarks && <><br /><small>{r.remarks}</small></>}</td>
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
  useEffect(() => { api(`${base}/timetable`).then(setSlots); }, [base]);
  if (!slots) return <p>Loading…</p>;
  const periods = [...new Set(slots.map((s) => s.period))].sort((a, b) => a - b);
  const days = [...new Set(slots.map((s) => s.day))].sort((a, b) => a - b);
  if (!slots.length) return <p className="hint">The timetable has not been set up yet.</p>;
  return (
    <table className="card grid">
      <thead><tr><th>Period</th>{days.map((d) => <th key={d}>{DAYS[d - 1]}</th>)}</tr></thead>
      <tbody>
        {periods.map((p) => (
          <tr key={p}><th>{p}</th>
            {days.map((d) => {
              const s = slots.find((x) => x.day === d && x.period === p);
              return <td key={d}>{s && <><b>{s.subjectName}</b><br /><small>{s.teacherName}</small></>}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const DOC_TYPES = [
  ['bonafide', 'Bonafide certificate'], ['character', 'Character certificate'],
  ['fee', 'Fee certificate'], ['transfer', 'Transfer certificate'],
];

function Documents({ base, childId, readOnly }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ type: 'bonafide', purpose: '' });
  const [error, setError] = useState('');
  const load = () => api(`${base}/documents`).then(setRows);
  useEffect(() => { load(); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const request = async (e) => {
    e.preventDefault();
    setError('');
    try { await api(`${base}/documents`, { method: 'POST', body: form }); setForm({ ...form, purpose: '' }); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <p className="hint">{readOnly ? 'Ask for a certificate here. The school office issues it (or tells you why not) and you will be notified. A transfer certificate is requested by your parent or at the school office.' : 'The school office issues each certificate or tells you why not, and you will be notified.'}</p>
      <form className="card form" onSubmit={request}>
        <label>Certificate
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {DOC_TYPES.filter(([v]) => !(readOnly && v === 'transfer')).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Purpose<input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Bank account" /></label>
        <button type="submit">Request</button>
      </form>
      {error && <p className="error">{error}</p>}
      <TableCard>
        <thead><tr><th>Certificate</th><th>Purpose</th><th>Requested by</th><th>Status</th><th /></tr></thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.id}>
              <td>{r.typeLabel}</td><td>{r.purpose}{r.status === 'rejected' && r.remarks && <><br /><small>{r.remarks}</small></>}</td>
              <td style={{ textTransform: 'capitalize' }}>{r.appliedBy ?? '—'}</td>
              <td><span className={`badge ${r.status === 'issued' ? 'paid' : r.status === 'rejected' ? 'overdue' : 'partial'}`}>{r.status}</span>{r.decidedByName && <small className="block">{r.status === 'issued' ? 'Issued' : 'Decided'} by {r.decidedByName}{r.decidedOn ? ` · ${String(r.decidedOn).slice(0, 10)}` : ''}</small>}</td>
              <td>{r.status === 'issued' && <Link className="btn" to={`/portal-print/${childId}/${r.id}`}>View / print</Link>}</td>
            </tr>
          ))}
          {rows && !rows.length && <tr><td colSpan={5}>No requests yet</td></tr>}
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
  const load = () => api(`${base}/leaves`).then(setRows).catch(() => setRows([]));
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState([]);
  useEffect(() => { api('/portal/leave-types').then(setTypes).catch(() => {}); }, []);
  useEffect(() => { api(`${base}/leave-balance`).then(setBalance).catch(() => setBalance([])); }, [base, rows]);
  useEffect(() => { setRows(null); load(); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps
  const badge = { approved: 'paid', rejected: 'overdue', pending: 'partial', cancelled: '' };

  const apply = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(''); setBusy(true);
    try { await api(`${base}/leaves`, { method: 'POST', body: form }); setForm({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' }); load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const withdraw = async (l) => {
    try { await api(`${base}/leaves/${l.id}/cancel`, { method: 'POST' }); load(); } catch (err) { setError(err.message); }
  };

  return (
    <>
      <p className="hint">{isStudent ? 'Your request goes to your class teacher, who approves or rejects it. You will get a notification and can see the decision here. Your parents can see it too.' : 'The class teacher (or an admin) approves or rejects each request. You will be notified of the decision, and you can see it here.'}</p>
      {balance.some((b) => b.yearlyDays !== null) && <p className="hint">Leave used this year: {balance.map((b) => `${b.name} ${b.used}${b.yearlyDays !== null ? ` of ${b.yearlyDays} days` : ' days'}`).join(' · ')}</p>}
      <form className="card form" onSubmit={apply}>
        <label>Type<select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} required><option value="">Choose</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>From<input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} required /></label>
        <label>To<input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} required /></label>
        <label>Reason<input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required /></label>
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Apply for leave'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <TableCard>
        <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Applied by</th><th>Status</th><th /></tr></thead>
        <tbody>
          {(rows ?? []).map((l) => (
            <tr key={l.id}>
              <td>{l.leaveType ?? '—'}</td><td>{l.fromDate}</td><td>{l.toDate}</td><td>{l.days}</td>
              <td>{l.reason}{l.remarks && <><br /><small>{l.remarks}</small></>}</td>
              <td style={{ textTransform: 'capitalize' }}>{l.appliedBy ?? '—'}</td>
              <td><span className={`badge ${badge[l.status]}`}>{l.status}</span>{l.decidedByName && <small className="block">{l.status === 'approved' ? 'Approved' : l.status === 'rejected' ? 'Rejected' : 'Decided'} by {l.decidedByName}{l.decidedOn ? ` · ${String(l.decidedOn).slice(0, 10)}` : ''}</small>}</td>
              <td>{['pending', 'approved'].includes(l.status) && <button onClick={() => withdraw(l)}>Withdraw</button>}</td>
            </tr>
          ))}
          {rows && !rows.length && <tr><td colSpan={8}>No leave requests</td></tr>}
        </tbody>
      </TableCard>
    </>
  );
}

function Homework({ base }) {
  const [hw, setHw] = useState(null);
  useEffect(() => { api(`${base}/homework`).then(setHw); }, [base]);
  if (!hw) return <p>Loading…</p>;
  const badge = { submitted: 'paid', late: 'partial', missing: 'overdue', pending: '' };
  return (
    <>
      <TableCard>
        <thead><tr><th>Subject</th><th>Homework</th><th>Due</th><th>Status</th><th>Marks</th></tr></thead>
        <tbody>
          {hw.map((h) => (
            <tr key={h.id} className={h.overdue && h.submission.status === 'pending' ? 'failed' : ''}>
              <td>{h.subjectName}</td>
              <td>{h.title}{h.description && <><br /><small>{h.description}</small></>}</td>
              <td>{h.dueDate}</td>
              <td><span className={`badge ${badge[h.submission.status]}`}>{h.submission.status}</span>{h.submission.remarks && <><br /><small>{h.submission.remarks}</small></>}</td>
              <td>{h.submission.marks !== null ? `${h.submission.marks}${h.maxMarks ? ` / ${h.maxMarks}` : ''}` : ''}</td>
            </tr>
          ))}
          {!hw.length && <tr><td colSpan={5}>No assignments set</td></tr>}
        </tbody>
      </TableCard>
    </>
  );
}

function Materials({ base }) {
  const [materials, setMaterials] = useState(null);
  useEffect(() => { api(`${base}/materials`).then(setMaterials).catch(() => setMaterials([])); }, [base]);
  return (
    <TableCard>
      <thead><tr><th>Subject</th><th>Material</th></tr></thead>
      <tbody>
        {(materials ?? []).map((m) => <tr key={m.id}><td>{m.subjectName}</td><td><a href={m.url} target="_blank" rel="noopener noreferrer">{m.title}</a>{m.description && <><br /><small>{m.description}</small></>}</td></tr>)}
        {materials && !materials.length && <tr><td colSpan={2}>Nothing shared yet</td></tr>}
        {!materials && <tr><td colSpan={2}>Loading…</td></tr>}
      </tbody>
    </TableCard>
  );
}

function Activities({ base }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const load = () => api(`${base}/activities`).then(setRows);
  useEffect(() => { load(); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = async (a, consent) => {
    setError('');
    try { await api(`${base}/activities/${a.activityId}/consent`, { method: 'PUT', body: { consent } }); load(); } catch (err) { setError(err.message); }
  };
  const consentBadge = { given: 'paid', declined: 'overdue', pending: 'partial' };

  return (
    <>
      {error && <p className="error">{error}</p>}
      <TableCard>
        <thead><tr><th>Activity</th><th>When</th><th>Fee</th><th>Your consent</th><th>Took part</th><th>Result</th></tr></thead>
        <tbody>
          {(rows ?? []).map((a) => (
            <tr key={a.activityId}>
              <td><b>{a.title}</b><br /><small>{a.kindLabel}{a.venue && ` · ${a.venue}`}</small></td>
              <td>{a.startDate}{a.endDate !== a.startDate && ` → ${a.endDate}`}</td>
              <td>{Number(a.fee) > 0 ? a.fee : '—'}</td>
              <td>
                {a.requiresConsent ? (
                  <>
                    <span className={`badge ${consentBadge[a.consent]}`}>{a.consent}</span>
                    {!['completed', 'cancelled'].includes(a.activityStatus) && a.status !== 'attended' && (
                      <>
                        {a.consent !== 'given' && <button onClick={() => answer(a, 'given')}>I agree</button>}
                        {a.consent !== 'declined' && <button className="danger" onClick={() => answer(a, 'declined')}>Decline</button>}
                      </>
                    )}
                  </>
                ) : <small>not needed</small>}
              </td>
              <td>{a.status === 'attended' ? 'Yes' : a.status === 'absent' ? 'No' : '—'}</td>
              <td>{a.result ?? ''}</td>
            </tr>
          ))}
          {rows && !rows.length && <tr><td colSpan={6}>Your child is not registered for any activity yet.</td></tr>}
        </tbody>
      </TableCard>
    </>
  );
}

const fmt = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const daysIn = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000) + 1;

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
  useEffect(() => { api(`/portal/calendar?from=${year}-01-01&to=${year}-12-31`).then((all) => setRows(all.filter((e) => e.type === 'holiday'))).catch(() => setRows([])); }, [year]);
  return (
    <>
      <div className="card form"><label>Year<select value={year} onChange={(e) => setYear(Number(e.target.value))}>{[thisYear - 1, thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}</select></label></div>
      <TableCard>
        <thead><tr><th>Holiday</th><th>From</th><th>To</th><th>Days</th></tr></thead>
        <tbody>
          {(rows ?? []).map((e) => (
            <tr key={e.id}><td><b>{e.title}</b>{e.description && <small className="block">{e.description}</small>}</td><td>{fmt(e.startDate)}</td><td>{e.endDate !== e.startDate ? fmt(e.endDate) : '—'}</td><td>{daysIn(e.startDate, e.endDate)}</td></tr>
          ))}
          {rows && !rows.length && <tr><td colSpan={4} className="empty-row">No holidays listed for {year}.</td></tr>}
          {!rows && <tr><td colSpan={4}>Loading…</td></tr>}
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
    api(`/portal/calendar?from=${month}-01&to=${last}`).then(setRows).catch(() => setRows([]));
  }, [month]);
  return (
    <>
      <div className="card form"><label>Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value || month)} /></label></div>
      <TableCard>
        <thead><tr><th>Date</th><th>Event</th><th>Type</th></tr></thead>
        <tbody>
          {(rows ?? []).map((e) => (
            <tr key={e.id}><td>{fmt(e.startDate)}{e.endDate !== e.startDate && ` → ${fmt(e.endDate)}`}</td><td><b>{e.title}</b>{e.description && <small className="block">{e.description}</small>}</td><td><span className="badge">{e.type}</span></td></tr>
          ))}
          {rows && !rows.length && <tr><td colSpan={3} className="empty-row">Nothing scheduled this month.</td></tr>}
          {!rows && <tr><td colSpan={3}>Loading…</td></tr>}
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
  useEffect(() => { api(`${base}/online-classes`).then(setRows).catch(() => setRows([])); }, [base]);
  if (!rows) return <p>Loading…</p>;
  const today = localDate();
  const upcoming = rows.filter((r) => r.classDate >= today);
  const earlier = rows.filter((r) => r.classDate < today).reverse();
  const table = (list, join) => (
    <TableCard>
      <thead><tr><th>Date</th><th>Time</th><th>Topic</th><th>Subject</th><th>Teacher</th><th /></tr></thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id}>
            <td>{fmt(c.classDate)}{c.today && <span className="badge paid" style={{ marginLeft: 6 }}>today</span>}</td>
            <td>{c.startTime}{c.endTime ? ` – ${c.endTime}` : ''}</td>
            <td><b>{c.title}</b>{c.notes && <small className="block">{c.notes}</small>}</td>
            <td>{c.subjectName ?? '—'}</td>
            <td>{c.teacherName ?? '—'}</td>
            <td>{join && <a className="btn" href={c.link} target="_blank" rel="noopener noreferrer">Join class</a>}</td>
          </tr>
        ))}
        {!list.length && <tr><td colSpan={6} className="empty-row">{join ? 'No online classes are scheduled.' : 'Nothing in the last week.'}</td></tr>}
      </tbody>
    </TableCard>
  );
  return (
    <>
      <h2>Upcoming</h2>
      {table(upcoming, true)}
      {earlier.length > 0 && <><h2>Last week</h2>{table(earlier, false)}</>}
    </>
  );
}

const FAQ = [
  ['How do I see my homework?', 'Open Homework & Assignments. Anything overdue is marked, and your teacher’s marks and remarks appear there once checked.'],
  ['Where do I join my online class?', 'Open Online Classes. On the day of the class a Join class button opens the video link. The link works only for the class it was made for.'],
  ['I think my attendance or marks are wrong.', 'Tell your class teacher. For marks, your parent can ask for a recheck under Exams & Results.'],
  ['How do I change my password?', 'Use Settings & Change Password in the menu. Choose something only you know, and never share it.'],
  ['I forgot my password.', 'Ask the school office to reset it. You will be given a temporary password and asked to choose a new one when you sign in.'],
  ['How do I apply for leave or get a certificate?', 'Your parent or guardian applies from their own login. You can see the status of leave requests and any certificates issued under Leave Requests and Certificates & Documents.'],
];

/** Answers to the common questions, and how to reach the school. */
function Help() {
  const school = useSchoolBrand();
  return (
    <>
      {FAQ.map(([q, a]) => (
        <div className="card" key={q}><b>{q}</b><p style={{ margin: '6px 0 0' }}>{a}</p></div>
      ))}
      <section className="details-section">
        <h4>Contact the school</h4>
        <dl>
          <div><dt>School</dt><dd>{school.name}</dd></div>
          {school.phone && <div><dt>Phone</dt><dd>{school.phone}</dd></div>}
          {school.email && <div><dt>Email</dt><dd>{school.email}</dd></div>}
          {school.address && <div><dt>Address</dt><dd>{school.address}</dd></div>}
        </dl>
        <p className="hint">Need to change your password? <Link to="/change-password">Open Settings & Change Password</Link>.</p>
      </section>
    </>
  );
}

const KIND = { absence: 'Absence alert', fee_reminder: 'Fee reminder', direct: 'Message', broadcast: 'Announcement' };

/** Who the student is, for reading. */
function Profile({ base }) {
  const [p, setP] = useState(null);
  useEffect(() => { api(`${base}/profile`).then(setP).catch(() => setP({ name: '', sections: [], qualifications: [], siblings: [] })); }, [base]);
  if (!p) return <p>Loading…</p>;
  return (
    <div className="student-details">
      <div className="details-head"><div><h3>{p.name}</h3></div></div>
      <div className="stats"><ClassTeacher teacher={p.classTeacher} /></div>
      {p.sections.map((s) => (
        <section key={s.title} className="details-section">
          <h4>{s.title}</h4>
          <dl>{s.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{/^\d{4}-\d{2}-\d{2}/.test(String(v)) ? fmt(v) : String(v)}</dd></div>)}</dl>
        </section>
      ))}
      <section className="details-section"><h4>Qualifications</h4><QualificationTable rows={p.qualifications} /></section>
      <section className="details-section"><h4>Brothers and sisters</h4><SiblingsTable rows={p.siblings} /></section>
      <p className="hint">If something here is wrong, please tell your class teacher or the school office.</p>
    </div>
  );
}

/** The library card and the books borrowed. */
function Library({ base }) {
  const [d, setD] = useState(null);
  useEffect(() => { api(`${base}/library`).then(setD).catch(() => setD({ card: null, loans: [] })); }, [base]);
  if (!d) return <p>Loading…</p>;
  const onLoan = d.loans.filter((l) => !l.returnedOn);
  return (
    <>
      <div className="stats">
        <div className="card"><span>Library card</span><b>{d.card ? d.card.cardNo : 'No card'}</b>{d.card && <small>{d.card.status === 'active' ? 'Active' : 'Suspended'} · up to {d.card.maxBooks} books{d.card.validUntil ? ` · valid until ${fmt(d.card.validUntil)}` : ''}</small>}</div>
        <div className="card"><span>Books on loan</span><b>{onLoan.length}</b>{onLoan.some((l) => l.overdue) && <small className="error">{onLoan.filter((l) => l.overdue).length} overdue</small>}</div>
      </div>
      <TableCard>
        <thead><tr><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Fine</th></tr></thead>
        <tbody>
          {d.loans.map((l) => (
            <tr key={l.id}>
              <td><b>{l.title}</b>{l.author && <small className="block">{l.author}</small>}</td>
              <td>{fmt(l.issuedOn)}</td>
              <td>{fmt(l.dueOn)}{l.overdue && <span className="badge overdue" style={{ marginLeft: 6 }}>overdue</span>}</td>
              <td>{l.returnedOn ? fmt(l.returnedOn) : <span className="badge partial">on loan</span>}</td>
              <td>{Number(l.fine) > 0 ? l.fine : '—'}</td>
            </tr>
          ))}
          {!d.loans.length && <tr><td colSpan={5} className="empty-row">No books borrowed yet.</td></tr>}
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
    setT(undefined); setBus(null); // another child: forget the last one's bus
    api(`${base}/transport`).then((x) => { if (live) setT(x); }).catch(() => { if (live) setT(null); });
    return () => { live = false; };
  }, [base]);
  useEffect(() => {
    if (!t) return undefined;
    let live = true;
    const load = () => api(`${base}/bus-location`).then((b) => { if (live) setBus(b); }).catch(() => {}); // a failed poll keeps the last position
    load();
    const timer = setInterval(load, 15000);
    return () => { live = false; clearInterval(timer); };
  }, [base, t]);
  if (t === undefined) return <p>Loading…</p>;
  if (!t) return <p className="hint">This student does not use school transport.</p>;
  const rows = [['Route', t.route], ['Pickup stop', t.stop], ['Pickup time', t.pickupTime], ['Trips', { both: 'Pickup and drop', pickup: 'Pickup only', drop: 'Drop only' }[t.tripType] ?? t.tripType], ['Monthly fee', t.monthlyFee && Number(t.monthlyFee) > 0 ? t.monthlyFee : null], ['Using the bus since', t.startDate && fmt(t.startDate)], ['Authorised to collect', [t.authorizedPickupName, t.authorizedPickupPhone].filter(Boolean).join(' · ')]]
    .filter(([, v]) => v);
  return (
    <>
      <section className="details-section">
        <h4>Live bus location</h4>
        {bus ? (
          <>
            <BusMap latitude={bus.latitude} longitude={bus.longitude} height={280} />
            <p className="hint">{bus.regNo} · {bus.live ? 'live' : 'last seen'} {ago(bus.recordedAt)}{bus.speed != null && bus.live ? ` · ${bus.speed} km/h` : ''}</p>
          </>
        ) : <p className="hint">The bus has not reported its location yet.</p>}
      </section>
      <section className="details-section">
        <h4>Bus details</h4>
        <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </section>
    </>
  );
}

/** What the school has sent about this student: absence alerts, fee reminders and messages. */
function Messages({ base }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api(`${base}/messages`).then(setRows).catch(() => setRows([])); }, [base]);
  if (!rows) return <p>Loading…</p>;
  return (
    <>
      {rows.map((m) => (
        <div className="card" key={m.id}>
          <b>{m.subject || KIND[m.kind] || 'Message'}</b> <small>· {KIND[m.kind] ?? 'Message'} · {String(m.sentAt).slice(0, 10)} · {m.channel === 'sms' ? 'SMS' : 'Email'}</small>
          <p>{m.body}</p>
        </div>
      ))}
      {!rows.length && <p className="hint">No messages from the school yet.</p>}
    </>
  );
}

const KIND_OPTIONS = [['grievance', 'Grievance (a complaint)'], ['feedback', 'Feedback (suggestion or praise)']];
const FB_STATUS = { open: ['partial', 'Open'], in_progress: ['applied', 'Being looked into'], resolved: ['paid', 'Resolved'], closed: ['', 'Closed'] };

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
  const load = () => api(`${base}/feedback`).then(setRows).catch(() => setRows([]));
  useEffect(() => { setRows(null); load(); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api('/portal/feedback-categories').then(setCategories).catch(() => {}); api('/portal/feedback-meta').then(setMeta).catch(() => {}); }, []);

  const send = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(''); setNotice(''); setBusy(true);
    try { const out = await api(`${base}/feedback`, { method: 'POST', body: form }); setNotice(`Sent. Your reference is ${out.ticketNo}.`); setForm(empty); load(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <p className="hint">Tell the school what is going well, what could be better, or raise a problem. The school office replies here and you get a notification. Tick the box to keep your name from the office. A grievance starts with the class teacher and moves up to the school office and the principal if it is not settled{meta.escalateAfterDays > 0 ? ` (after ${meta.escalateAfterDays} day${meta.escalateAfterDays === 1 ? '' : 's'} without a reply)` : ''}.</p>
      <form className="card form" onSubmit={send}>
        <label>Type<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{KIND_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required><option value="">Choose</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Subject<input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required maxLength={150} /></label>
        <label>Details<textarea rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} required maxLength={3000} /></label>
        {form.kind === 'feedback' && <label>Rating<select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}><option value="">No rating</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></label>}
        <label className="check"><input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} /> Keep my name from the school office</label>
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
      </form>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error">{error}</p>}
      {(rows ?? []).map((f) => (
        <div className="card" key={f.id}>
          <b>{f.subject}</b> <small>· {f.ticketNo} · {f.kind === 'grievance' ? 'Grievance' : 'Feedback'} · {f.category} · {String(f.createdAt).slice(0, 10)}</small>{' '}
          <span className={`badge ${FB_STATUS[f.status][0]}`}>{FB_STATUS[f.status][1]}</span>
          {f.kind === 'grievance' && <GrievanceLadder levels={meta.levels} level={f.level} settled={['resolved', 'closed'].includes(f.status)} />}
          <p>{f.details}</p>
          {f.response && <p><b>Reply{f.respondedByName ? ` from ${f.respondedByName}` : ''}:</b> {f.response}</p>}
          {f.timeline?.length > 1 && <details><summary>History</summary><Timeline items={f.timeline} /></details>}
        </div>
      ))}
      {rows && !rows.length && <p className="hint">You have not sent anything yet.</p>}
    </>
  );
}

const VIEWS = { Overview, Profile, Fees, Attendance, Leave, Results, Homework, Materials, Library, Transport, Messages, Feedback, Activities, Timetable, Documents, Notices, Calendar, OnlineClasses, Help };

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
    api('/portal/children').then((c) => { setChildren(c); setChildId(c[0]?.id ?? null); }).catch((e) => setError(e.message));
    api('/portal/notices').then(setNotices).catch(() => {});
    api('/portal/calendar').then(setEvents).catch(() => {});
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!children) return <p>Loading…</p>;

  const View = VIEWS[tab];
  const child = children.find((c) => c.id === childId);

  return (
    <>
      <h1>{tab === 'Overview' ? (isStudent ? 'My school' : 'Parent portal') : label(tab, isStudent)}</h1>
      <PushToggle />
      {!children.length && <p className="hint">{isStudent ? 'Your student record could not be found.' : 'No children are linked to your account yet.'} Please contact the school office.</p>}
      {children.length > 0 && (
        <>
          {!isStudent && <div className="card form">
            <label>Child
              <select value={childId ?? ''} onChange={(e) => setChildId(Number(e.target.value))}>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.className ?? 'no class'})</option>)}
              </select>
            </label>
            {child && <span className="hint">Adm. no {child.admissionNo} · {child.relation}</span>}
          </div>}
          {isStudent && child && <p className="hint">{child.name} · {child.className ?? 'no class'} · Adm. no {child.admissionNo}</p>}
          <View base={`/portal/children/${childId}`} childId={childId} notices={notices} readOnly={isStudent} />
        </>
      )}

      {tab === 'Overview' && <>
      <h2>Coming up at school</h2>
      <TableCard>
        <tbody>
          {events.slice(0, 8).map((e) => (
            <tr key={e.id}><td>{e.startDate}{e.endDate !== e.startDate && ` → ${e.endDate}`}</td><td>{e.title}</td><td><span className="badge">{e.type}</span></td></tr>
          ))}
          {!events.length && <tr><td>Nothing scheduled in the next two months.</td></tr>}
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
      </>}
    </>
  );
}
