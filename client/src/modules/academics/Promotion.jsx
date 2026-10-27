import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const label = (c) => `${c.name}-${c.section}`;

function Tile({ icon, tone, label: text, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{text}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Year-end promotion: move a class up to the next one, or graduate it. Untick students who repeat the year. */
export default function Promotion() {
  const [classes, setClasses] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { api('/classes').then(setClasses).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    setQ(''); setPage(1);
    if (!from) { setStudents([]); setSelected(new Set()); return; }
    api(`/students?classId=${from}&status=active`).then((r) => {
      const rows = Array.isArray(r) ? r : r.rows ?? [];
      setStudents(rows);
      setSelected(new Set(rows.map((s) => s.id)));
    }).catch((e) => setError(e.message));
  }, [from]);

  const toggle = (id) => setSelected((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const target = to ? classes.find((c) => String(c.id) === String(to)) : null;
  const from_ = classes.find((c) => String(c.id) === String(from));

  const needle = q.trim().toLowerCase();
  const shown = students.filter((s) => !needle || `${s.firstName} ${s.lastName} ${s.admissionNo}`.toLowerCase().includes(needle));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allShownTicked = shown.length > 0 && shown.every((s) => selected.has(s.id));
  const toggleShown = () => setSelected((cur) => { const next = new Set(cur); for (const s of shown) { if (allShownTicked) next.delete(s.id); else next.add(s.id); } return next; });

  const submit = async () => {
    const what = target ? `move ${selected.size} students to ${label(target)}` : `graduate ${selected.size} students (they become inactive)`;
    setError(''); setNotice(''); setBusy(true);
    try {
      const r = await api('/promotion', { method: 'POST', body: { fromClassId: from, toClassId: to || null, studentIds: [...selected] } });
      setNotice(`${r.moved} students ${r.graduated ? 'graduated' : 'promoted'}.`);
      setFrom('');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Year-end promotion</h1>
          <p className="hint">Move a class up to the next class, or leave the target empty to graduate them. Untick students who should repeat the year.</p>
        </div>
        <div className="head-actions">
          <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From class" style={{ minHeight: 44 }}>
            <option value="">From class…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="To class" style={{ minHeight: 44 }}>
            <option value="">Graduate (leave school)</option>
            {classes.filter((c) => String(c.id) !== String(from)).map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}
          </select>
          <button type="button" className="big-action" data-sure disabled={!from || !selected.size || busy} onClick={submit}>{busy ? 'Working…' : `${target ? 'Promote' : 'Graduate'} ${selected.size}`}</button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="From" value={from_ ? label(from_) : '—'} />
        <Tile icon="♙" tone="green" label={target ? 'Moving up' : 'Graduating'} value={selected.size} />
        <Tile icon="↺" tone="amber" label="Repeating the year" value={students.length - selected.size} />
        <Tile icon="→" tone="violet" label="To" value={target ? label(target) : 'Leave school'} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student…" aria-label="Search students" disabled={!from} /></label>
          <span className="showing">{from ? `${shown.length} students` : 'Choose a class'}</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th style={{ width: 40 }}><input type="checkbox" checked={allShownTicked} onChange={toggleShown} disabled={!shown.length} aria-label="Select all shown" /></th><th>Admission no</th><th>Student</th><th>Outcome</th></tr></thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.id}>
                  <td><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Include ${s.firstName} ${s.lastName}`} /></td>
                  <td>{s.admissionNo}</td>
                  <td><b>{s.firstName} {s.lastName}</b></td>
                  <td>{selected.has(s.id) ? <span className="badge paid">● {target ? `To ${label(target)}` : 'Graduates'}</span> : <span className="badge partial">● Repeats {from_ ? label(from_) : ''}</span>}</td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={4} className="empty-row">{!from ? 'Choose the class to promote.' : needle ? 'No students match.' : 'No active students in this class.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
