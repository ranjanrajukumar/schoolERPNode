import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const STATUSES = ['pending', 'submitted', 'late', 'missing'];
const TABS = [['all', 'All students'], ...STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)])];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Roster of one homework: who handed it in, with marks and remarks. */
export default function HomeworkTracker() {
  const { id } = useParams();
  const canWrite = ['admin', 'teacher'].includes(useAuth().user?.role);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { api(`/homework/${id}/submissions`).then(setData).catch((e) => setError(e.message)); }, [id]);
  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;

  const { homework: h, students } = data;
  const update = (studentId, patch) => setData({ ...data, students: students.map((s) => (s.studentId === studentId ? { ...s, ...patch } : s)) });

  const markAll = (status) => setData({ ...data, students: students.map((s) => (s.status === 'pending' ? { ...s, status } : s)) });

  const save = async () => {
    setError(''); setNotice('');
    const records = students.map((s) => ({ studentId: s.studentId, status: s.status, marks: s.marks ?? '', remarks: s.remarks ?? '' }));
    try {
      const r = await api(`/homework/${id}/submissions`, { method: 'POST', body: { records } });
      setNotice(`Saved ${r.saved} records.`);
    } catch (err) { setError(err.message); }
  };

  const count = (k) => (k === 'all' ? students.length : students.filter((s) => s.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = students.filter((s) => (tab === 'all' || s.status === tab) && (!needle || `${s.name} ${s.admissionNo}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{h.title}</h1>
          <p className="hint">{h.className} · {h.subjectName} · due {h.dueDate}{h.maxMarks && ` · out of ${h.maxMarks}`}{h.description && ` — ${h.description}`}</p>
        </div>
        <div className="head-actions">
          <Link className="btn ghost" to="/homework">Back</Link>
          {canWrite && <button type="button" className="big-action" onClick={save}>Save</button>}
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Students" value={students.length} />
        <Tile icon="✓" tone="green" label="Submitted" value={count('submitted')} />
        <Tile icon="◷" tone="amber" label="Pending or late" value={count('pending') + count('late')} />
        <Tile icon="×" tone="red" label="Missing" value={count('missing')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student or admission no…" aria-label="Search students" /></label>
          {canWrite && <button type="button" className="ghost" onClick={() => markAll('submitted')}>Mark remaining as submitted</button>}
          <span className="showing">{shown.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Adm. no</th><th>Student</th><th>Status</th><th>Marks</th><th>Remarks</th></tr></thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.studentId}>
                  <td>{s.admissionNo}</td><td><b>{s.name}</b></td>
                  <td>
                    <select disabled={!canWrite} value={s.status} onChange={(e) => update(s.studentId, { status: e.target.value })} aria-label={`Status of ${s.name}`}>
                      {STATUSES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </td>
                  <td><input className="mark" type="number" min="0" max={h.maxMarks ?? undefined} step="0.5" disabled={!canWrite} value={s.marks ?? ''} onChange={(e) => update(s.studentId, { marks: e.target.value })} aria-label={`Marks of ${s.name}`} /></td>
                  <td><input disabled={!canWrite} value={s.remarks ?? ''} onChange={(e) => update(s.studentId, { remarks: e.target.value })} aria-label={`Remarks for ${s.name}`} /></td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={5} className="empty-row">{needle || tab !== 'all' ? 'No students match.' : 'No active students in this class.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
