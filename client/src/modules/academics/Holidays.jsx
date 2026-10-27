import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const EMPTY = { title: '', startDate: '', endDate: '', audience: 'all', description: '' };
const AUDIENCE = { all: 'Everyone', staff: 'Staff only', parents: 'Parents' };
const day = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00`);
const fmt = (d) => (d ? day(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const weekday = (d) => day(d).toLocaleDateString('en-GB', { weekday: 'short' });
const daysBetween = (from, to) => Math.round((day(to) - day(from)) / 86400000) + 1;

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** The school's holidays for a year, from the academic calendar. Admins add, change and remove them here. */
export default function Holidays() {
  const canWrite = useAuth().user?.role === 'admin';
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [entry, setEntry] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api(`/calendar?from=${year}-01-01&to=${year}-12-31`)
      .then((all) => setRows(all.filter((e) => e.type === 'holiday' && !e.readOnly)))
      .catch((e) => setError(e.message));
  }, [year]);
  useEffect(load, [load]);
  const open = (ev) => { setError(''); setEditId(ev?.id ?? null); setForm(ev ? { ...EMPTY, ...ev, description: ev.description ?? '' } : EMPTY); setEntry(true); };
  useOpenNew(() => open(null), canWrite);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const body = { title: form.title, type: 'holiday', startDate: form.startDate, endDate: form.endDate || form.startDate, audience: form.audience, description: form.description };
      await api(editId ? `/calendar/${editId}` : '/calendar', { method: editId ? 'PUT' : 'POST', body });
      setEntry(false); setNotice(editId ? 'Holiday updated.' : 'Holiday added.'); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (ev) => {
    setError(''); setNotice('');
    try { await api(`/calendar/${ev.id}`, { method: 'DELETE' }); setNotice('Holiday deleted.'); load(); } catch (err) { setError(err.message); }
  };

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => !needle || `${r.title} ${r.description ?? ''} ${AUDIENCE[r.audience]}`.toLowerCase().includes(needle));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const today = localDate();
  const totalDays = rows.reduce((n, r) => n + daysBetween(r.startDate, r.endDate), 0);
  const next = rows.find((r) => r.endDate >= today);
  const years = [thisYear - 2, thisYear - 1, thisYear, thisYear + 1, thisYear + 2];

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>List of holidays</h1>
          <p className="hint">The days the school is closed in {year}. Holidays are also part of the Academic Calendar.</p>
        </div>
        {canWrite && <div className="head-actions"><button type="button" className="big-action" onClick={() => open(null)}>+ Add holiday</button></div>}
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles three">
        <Tile icon="✓" tone="green" label={`Holidays in ${year}`} value={rows.length} />
        <Tile icon="▤" tone="blue" label="Days off" value={totalDays} />
        <Tile icon="◷" tone="amber" label="Next holiday" value={next ? next.title : '—'} hint={next ? fmt(next.startDate) : 'None coming up'} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search holidays…" aria-label="Search holidays" /></label>
          <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }} aria-label="Year">{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <span className="showing">{shown.length} holidays</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Holiday</th><th>From</th><th>To</th><th>Days</th><th>Day</th><th>For</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {pageRows.map((ev) => (
                <tr key={ev.id}>
                  <td><b>{ev.title}</b>{ev.description && <small className="block">{ev.description}</small>}</td>
                  <td>{fmt(ev.startDate)}</td>
                  <td>{ev.endDate !== ev.startDate ? fmt(ev.endDate) : <span className="none">—</span>}</td>
                  <td>{daysBetween(ev.startDate, ev.endDate)}</td>
                  <td>{ev.endDate !== ev.startDate ? `${weekday(ev.startDate)} – ${weekday(ev.endDate)}` : weekday(ev.startDate)}</td>
                  <td>{AUDIENCE[ev.audience]}</td>
                  {canWrite && (
                    <td className="row-actions">
                      <button type="button" onClick={() => open(ev)}>Edit</button>
                      <button type="button" className="ghost danger" onClick={() => remove(ev)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={canWrite ? 7 : 6} className="empty-row">{needle ? 'No holidays match.' : `No holidays listed for ${year}.${canWrite ? ' Add the first with “Add holiday”.' : ''}`}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title={editId ? 'Edit holiday' : 'Add holiday'} wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Holiday *</span><input value={form.title} onChange={set('title')} placeholder="e.g. Diwali" required maxLength={160} /></label>
            <label><span>From *</span><input type="date" value={form.startDate} onChange={set('startDate')} required /></label>
            <label><span>To (blank = one day)</span><input type="date" value={form.endDate ?? ''} min={form.startDate} onChange={set('endDate')} /></label>
            <label><span>For</span>
              <select value={form.audience} onChange={set('audience')}>{Object.entries(AUDIENCE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </label>
            <label className="wide"><span>Note</span><input value={form.description ?? ''} onChange={set('description')} maxLength={500} /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : editId ? 'Update' : 'Add holiday'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
