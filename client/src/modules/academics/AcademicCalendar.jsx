import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const TYPES = ['holiday', 'exam', 'event', 'meeting', 'other'];
const TABS = [['all', 'All'], ...TYPES.map((t) => [t, t[0].toUpperCase() + t.slice(1)])];
const badge = { holiday: 'paid', exam: 'rejected', event: 'partial', meeting: '', other: '' };
const EMPTY = { title: '', type: 'event', startDate: '', endDate: '', audience: 'all', description: '' };
const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const monthEnd = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Holidays, exams, events and meetings for a month. */
export default function AcademicCalendar() {
  const canWrite = useAuth().user?.role === 'admin';
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/calendar?from=${month}-01&to=${monthEnd(month)}`).then(setRows).catch((e) => setError(e.message));
  }, [month]);
  useEffect(load, [load]);
  useOpenNew(() => { setEditId(null); setForm(EMPTY); setEntry(true); }, canWrite);

  const reset = () => { setForm(EMPTY); setEditId(null); };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api(editId ? `/calendar/${editId}` : '/calendar', { method: editId ? 'PUT' : 'POST', body: form });
      reset(); setEntry(false); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async (ev) => {
    try { await api(`/calendar/${ev.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  };

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.type === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || r.type === tab) && (!needle || `${r.title} ${r.description ?? ''} ${r.audience}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Academic calendar</h1>
          <p className="hint">Holidays, exams, events and meetings, one month at a time.</p>
        </div>
        {canWrite && <div className="head-actions"><button type="button" className="big-action" onClick={() => { setError(''); reset(); setEntry(true); }}>+ Add event</button></div>}
      </div>
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Events this month" value={rows.length} />
        <Tile icon="✓" tone="green" label="Holidays" value={count('holiday')} />
        <Tile icon="!" tone="red" label="Exams" value={count('exam')} />
        <Tile icon="◷" tone="amber" label="Events & meetings" value={count('event') + count('meeting')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search events…" aria-label="Search events" /></label>
          <input type="month" value={month} onChange={(e) => { setMonth(e.target.value || month); setPage(1); }} aria-label="Month" />
          <span className="showing">{shown.length} events</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Date</th><th>Event</th><th>Type</th><th>For</th><th /></tr></thead>
            <tbody>
              {pageRows.map((ev) => (
                <tr key={ev.id}>
                  <td>{date(ev.startDate)}{ev.endDate !== ev.startDate && ` → ${date(ev.endDate)}`}</td>
                  <td><b>{ev.title}</b>{ev.description && <small className="block">{ev.description}</small>}</td>
                  <td><span className={`badge ${badge[ev.type]}`}>● {ev.type}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{ev.audience}</td>
                  <td className="row-actions">
                    {canWrite && <button type="button" onClick={() => { setError(''); setEditId(ev.id); setForm({ ...EMPTY, ...ev, description: ev.description ?? '' }); setEntry(true); }}>Edit</button>}
                    {canWrite && <button type="button" className="ghost" onClick={() => remove(ev)}>Delete</button>}
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={5} className="empty-row">{needle || tab !== 'all' ? 'No events match.' : 'Nothing scheduled this month.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title={editId ? 'Edit event' : 'Add event'} wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Title *</span><input value={form.title} onChange={set('title')} required /></label>
            <label><span>Type</span><select value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
            <label><span>For</span>
              <select value={form.audience} onChange={set('audience')}>
                <option value="all">Everyone</option><option value="staff">Staff only</option><option value="parents">Parents</option>
              </select>
            </label>
            <label><span>From *</span><input type="date" value={form.startDate} onChange={set('startDate')} required /></label>
            <label><span>To (blank = one day)</span><input type="date" value={form.endDate ?? ''} min={form.startDate} onChange={set('endDate')} /></label>
            <label className="wide"><span>Details</span><input value={form.description ?? ''} onChange={set('description')} /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : editId ? 'Update' : 'Add event'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
