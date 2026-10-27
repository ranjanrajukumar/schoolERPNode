import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const SKILLS = [['work', 'Quality of work'], ['punctuality', 'Punctuality'], ['teamwork', 'Teamwork'], ['initiative', 'Initiative']];
const EMPTY = { staffId: '', period: '', reviewDate: '', reviewer: '', work: 3, punctuality: 3, teamwork: 3, initiative: 3, strengths: '', improvements: '' };
const TABS = [['draft', 'Drafts'], ['final', 'Final'], ['all', 'All']];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Staff performance reviews: a draft can be edited; finalising makes it permanent. */
export default function PerformanceReviews() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [entry, setEntry] = useState(false);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState('draft');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/performance-reviews${filter ? `?staffId=${filter}` : ''}`).then(setRows).catch((e) => setError(e.message));
  }, [filter]);
  useEffect(load, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const run = async (fn) => { setError(''); try { await fn(); load(); } catch (err) { setError(err.message); } };
  const openNew = () => { setError(''); setForm(EMPTY); setEditId(null); setEntry(true); };
  useOpenNew(() => { setForm(EMPTY); setEditId(null); setEntry(true); });

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api(editId ? `/performance-reviews/${editId}` : '/performance-reviews', { method: editId ? 'PUT' : 'POST', body: form });
      setEntry(false); setForm(EMPTY); setEditId(null);
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || r.status === tab) && (!needle || `${r.staffName} ${r.staffNo} ${r.period} ${r.reviewer ?? ''}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const finals = rows.filter((r) => r.status === 'final');
  const avg = finals.length ? (finals.reduce((n, r) => n + Number(r.overall), 0) / finals.length).toFixed(2) : '—';

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Performance reviews</h1>
          <p className="hint">Rate 1 (poor) to 5 (excellent). A draft can be edited; finalising makes it a permanent record that cannot be changed or deleted.</p>
        </div>
        <div className="head-actions"><button type="button" className="big-action" onClick={openNew}>+ New review</button></div>
      </div>
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="≡" tone="blue" label="Reviews" value={rows.length} />
        <Tile icon="✎" tone="amber" label="Drafts" value={count('draft')} />
        <Tile icon="✓" tone="green" label="Finalised" value={count('final')} />
        <Tile icon="★" tone="violet" label="Average overall (final)" value={avg} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search staff, period or reviewer…" aria-label="Search reviews" /></label>
          <label className="inline"><span>Staff member </span><TypeaheadSelect kind="staff" value={filter} onChange={(id) => { setFilter(id); setPage(1); }} placeholder="All staff: type to filter" /></label>
          <span className="showing">{shown.length} reviews</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Date</th><th>Staff</th><th>Period</th><th>Work</th><th>Punctual</th><th>Team</th><th>Initiative</th><th>Overall</th><th>Status</th><th /></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.reviewDate}</td><td><b>{r.staffName}</b><small className="block">{r.staffNo}</small></td><td>{r.period}</td>
                  <td>{r.work}</td><td>{r.punctuality}</td><td>{r.teamwork}</td><td>{r.initiative}</td><td><b>{r.overall.toFixed(2)}</b></td>
                  <td><span className={`badge ${r.status === 'final' ? 'paid' : 'partial'}`}>● {r.status}</span></td>
                  <td className="row-actions">
                    {r.status === 'draft' && (
                      <>
                        <button type="button" onClick={() => { setError(''); setEditId(r.id); setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, r[k] ?? '']))); setEntry(true); }}>Edit</button>
                        <button type="button" className="ghost" onClick={() => run(() => api(`/performance-reviews/${r.id}/finalize`, { method: 'POST' }))}>Finalise</button>
                        <button type="button" className="ghost" onClick={() => run(() => api(`/performance-reviews/${r.id}`, { method: 'DELETE' }))}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={10} className="empty-row">{needle || tab !== 'all' ? 'No reviews match.' : 'No reviews yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title={editId ? 'Edit review' : 'New review'} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Staff member *</span>
              <TypeaheadSelect kind="staff" value={form.staffId} onChange={(id) => setForm({ ...form, staffId: id })} filters={{ status: 'active' }} disabled={Boolean(editId)} required />
            </label>
            <label><span>Period (e.g. 2026 Term 1) *</span><input value={form.period} onChange={set('period')} required /></label>
            <label><span>Review date *</span><input type="date" value={form.reviewDate} onChange={set('reviewDate')} required /></label>
            <label className="wide"><span>Reviewer</span><input value={form.reviewer} onChange={set('reviewer')} /></label>
            {SKILLS.map(([k, label]) => (
              <label key={k}><span>{label}</span><select value={form[k]} onChange={set(k)}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
            ))}
            <label className="wide"><span>Strengths</span><input value={form.strengths} onChange={set('strengths')} /></label>
            <label className="wide"><span>To improve</span><input value={form.improvements} onChange={set('improvements')} /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : editId ? 'Update draft' : 'Save draft'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
