import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const PAGE_SIZE = 25;
const CONSENT_BADGE = { given: 'paid', declined: 'rejected', pending: 'partial', not_required: '' };
const STATUS_BADGE = { planned: 'partial', open: 'paid', completed: '', cancelled: 'rejected' };
const TABS = [['all', 'Everyone'], ['registered', 'Registered'], ['attended', 'Attended'], ['absent', 'Absent']];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** One activity: its details, who is registered, attendance, parent consent and results. */
export default function ActivityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = ['admin', 'teacher'].includes(user?.role);
  const canBill = ['admin', 'accountant'].includes(user?.role);
  const [data, setData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [pick, setPick] = useState('');
  const [classPick, setClassPick] = useState('');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api(`/activities/${id}/participants`).then(setData).catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => { api('/classes').then(setClasses);  }, []);
  useEffect(load, [load]);

  const run = async (fn, message) => {
    setError(''); setNotice('');
    try { const r = await fn(); if (message) setNotice(message(r)); load(); } catch (err) { setError(err.message); }
  };

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const { activity: a, participants } = data;
  const open = ['planned', 'open'].includes(a.status);

  const register = (body) => run(() => api(`/activities/${id}/participants`, { method: 'POST', body }), (r) => `${r.registered} registered, ${r.skipped} already on the list.`);
  const attendance = (studentId, status) => run(() => api(`/activities/${id}/attendance`, { method: 'POST', body: { records: [{ studentId, status }] } }));
  const consent = (studentId, value) => run(() => api(`/activities/${id}/participants/${studentId}/consent`, { method: 'PUT', body: { consent: value } }));
  const withdraw = (p) => run(() => api(`/activities/${id}/participants/${p.studentId}`, { method: 'DELETE' }));
  const result = (p) => {
    const value = prompt(`Result or award for ${p.name} (e.g. 1st place, Participation)`, p.result ?? '');
    if (value === null) return;
    run(() => api(`/activities/${id}/participants/${p.studentId}/result`, { method: 'PUT', body: { result: value } }));
  };
  const bill = () => run(() => api(`/activities/${id}/bill`, { method: 'POST' }), (r) => `Fee billed to ${r.created} student(s); ${r.skipped} already billed. Collect it under Fees & payments.`);
  const markAll = (status) => run(() => api(`/activities/${id}/attendance`, {
    method: 'POST',
    body: { records: participants.filter((p) => p.status === 'registered' && (!a.requiresConsent || p.consent === 'given')).map((p) => ({ studentId: p.studentId, status })) },
  }));

  const count = (k) => (k === 'all' ? participants.length : participants.filter((p) => p.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = participants.filter((p) => (tab === 'all' || p.status === tab) && (!needle || `${p.name} ${p.admissionNo} ${p.className} ${p.result ?? ''}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const consentPending = participants.filter((p) => p.consent === 'pending').length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{a.title}</h1>
          <p className="hint">
            {a.kindLabel} · {a.startDate}{a.endDate !== a.startDate && ` → ${a.endDate}`}{a.venue && ` · ${a.venue}`} · {a.className ?? 'whole school'}
            {a.capacity && ` · ${a.registered}/${a.capacity} places`}{Number(a.fee) > 0 && ` · fee ${a.fee}`} · <span className={`badge ${STATUS_BADGE[a.status]}`}>● {a.status}</span>
          </p>
          {a.description && <p className="hint">{a.description}</p>}
        </div>
        <div className="head-actions">
          <Link className="btn ghost" to="/activities">← All activities</Link>
          {canBill && Number(a.fee) > 0 && a.status !== 'cancelled' && <button type="button" className="ghost" onClick={bill}>Bill the fee to those going</button>}
          {canWrite && a.status !== 'planned' && a.status !== 'cancelled' && <button type="button" className="big-action" onClick={() => markAll('attended')}>Mark all attended</button>}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Registered" value={participants.length} hint={a.capacity ? `of ${a.capacity} places` : null} />
        <Tile icon="✓" tone="green" label="Attended" value={count('attended')} />
        <Tile icon="×" tone="red" label="Absent" value={count('absent')} />
        <Tile icon="◷" tone="amber" label="Consent pending" value={a.requiresConsent ? consentPending : 0} hint={a.requiresConsent ? null : 'not required'} />
      </div>

      {canWrite && open && (
        <section className="card enquiry-card">
          <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Register students</h2><small>Add one student{a.classId ? ' or the whole class' : ', or a whole class'}</small></span></header>
          <div className="toolbar">
            <label>Add a student
              <TypeaheadSelect kind="students" value={pick} onChange={(id) => setPick(id)} filters={{ status: 'active', ...(a.classId && { classId: a.classId }) }} exclude={participants.map((p) => p.studentId)} />
            </label>
            <button type="button" disabled={!pick} onClick={() => { register({ studentIds: [Number(pick)] }); setPick(''); }}>Register</button>
            {!a.classId && (
              <>
                <label>Or a whole class
                  <select value={classPick} onChange={(e) => setClassPick(e.target.value)}><option value="">--</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}</select>
                </label>
                <button type="button" className="ghost" disabled={!classPick} onClick={() => { register({ classId: Number(classPick) }); setClassPick(''); }}>Register class</button>
              </>
            )}
            {a.classId && <button type="button" className="ghost" onClick={() => register({ classId: a.classId })}>Register the whole class</button>}
          </div>
        </section>
      )}

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student, class or result…" aria-label="Search participants" /></label>
          <span className="showing">{shown.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Student</th><th>Class</th>{a.requiresConsent && <th>Parent consent</th>}<th>Attendance</th><th>Result</th><th /></tr></thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.studentId}>
                  <td><b>{p.name}</b><small className="block">{p.admissionNo}</small></td>
                  <td>{p.className}</td>
                  {a.requiresConsent && (
                    <td>
                      <span className={`badge ${CONSENT_BADGE[p.consent]}`}>● {p.consent}</span>
                      {canWrite && ['planned', 'open'].includes(a.status) && p.consent !== 'given' && <button type="button" className="ghost" style={{ marginLeft: 6 }} onClick={() => consent(p.studentId, 'given')}>Form received</button>}
                    </td>
                  )}
                  <td>
                    {['attended', 'absent'].map((s) => (
                      <label key={s} className="inline">
                        <input type="radio" name={`at${p.studentId}`} disabled={!canWrite || !['open', 'completed'].includes(a.status)} checked={p.status === s} onChange={() => attendance(p.studentId, s)} /> {s}
                      </label>
                    ))}
                  </td>
                  <td>{p.result ?? ''}{p.remarks && <small className="block">{p.remarks}</small>}</td>
                  <td className="row-actions">
                    {canWrite && p.status === 'attended' && <button type="button" onClick={() => result(p)}>Result</button>}
                    {canWrite && p.status === 'registered' && ['planned', 'open'].includes(a.status) && <button type="button" className="ghost" onClick={() => withdraw(p)}>Remove</button>}
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={a.requiresConsent ? 6 : 5} className="empty-row">{needle || tab !== 'all' ? 'No students match.' : 'Nobody registered yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
