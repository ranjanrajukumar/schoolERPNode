import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const TABS = [['active', 'Active'], ['fulfilled', 'Fulfilled'], ['cancelled', 'Cancelled'], ['all', 'All']];
const PILL = { active: 'partial', fulfilled: 'paid', cancelled: '' };
const LABEL = { active: 'Active', fulfilled: 'Fulfilled', cancelled: 'Cancelled' };
const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Tile({ icon, tone, label, value, hint, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </>
  );
  return onClick ? <button type="button" className="tile card tile-button" onClick={onClick}>{body}</button> : <div className="tile card">{body}</div>;
}

/** Book reservations: only a book with no free copy can be reserved; a returned copy is held for the first in the queue. */
export default function Reservations() {
  const { user } = useAuth();
  const canWrite = ['admin', 'teacher'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ bookId: '', studentId: '' });
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('active');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), canWrite); // eslint-disable-line no-use-before-define

  const load = useCallback(() => { api('/library/reservations').then(setRows).catch((e) => setError(e.message)); api('/library/books').then(setBooks).catch(() => {}); }, []);
  useEffect(load, [load]);

  const openNew = () => { setError(''); setNotice(''); setForm({ bookId: '', studentId: '' }); setEntry(true); };
  const reserve = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api('/library/reservations', { method: 'POST', body: form }); setNotice('Reservation made.'); setEntry(false); load(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const cancel = async (r) => {
    setError(''); setNotice('');
    try { await api(`/library/reservations/${r.id}/cancel`, { method: 'POST' }); setNotice('Reservation cancelled.'); load(); } catch (err) { setError(err.message); }
  };

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || r.status === tab) && (!needle || `${r.bookTitle} ${r.studentName} ${r.admissionNo}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const ready = rows.filter((r) => r.status === 'active' && r.queuePosition && r.available > 0 && r.queuePosition <= r.available);
  const goTab = (t) => { setTab(t); setPage(1); };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Book reservations</h1>
          <p className="hint">Only books with no free copy can be reserved. Returned copies are held for the first reservation in the queue.</p>
        </div>
        <div className="head-actions">{canWrite && <button type="button" className="big-action" onClick={openNew}>＋ Reserve a book</button>}</div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Reservations" value={rows.length} onClick={() => goTab('all')} />
        <Tile icon="◷" tone="amber" label="Waiting" value={count('active')} onClick={() => goTab('active')} />
        <Tile icon="✓" tone="green" label="Copy ready to collect" value={ready.length} hint={ready.length ? 'A copy is being held' : null} onClick={() => goTab('active')} />
        <Tile icon="×" tone="red" label="Cancelled" value={count('cancelled')} onClick={() => goTab('cancelled')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => goTab(k)}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search book or student…" aria-label="Search reservations" /></label>
          <span className="showing">Showing <b>{from}–{Math.min(page * PAGE_SIZE, shown.length)}</b> of <b>{shown.length}</b></span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Book</th><th>Student</th><th>Reserved</th><th>Queue</th><th>Status</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.bookTitle}</b></td><td>{r.studentName}<small className="block">{r.admissionNo}</small></td><td>{date(r.reservedOn)}</td>
                  <td>{r.queuePosition ? <>#{r.queuePosition}{r.available > 0 && r.queuePosition <= r.available && <span className="badge paid" style={{ marginLeft: 6 }}>copy ready</span>}</> : '—'}</td>
                  <td><span className={`badge ${PILL[r.status]}`}>● {LABEL[r.status]}</span></td>
                  {canWrite && <td className="row-actions">{r.status === 'active' && <button type="button" className="ghost danger" onClick={() => cancel(r)}>Cancel</button>}</td>}
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={canWrite ? 6 : 5} className="empty-row">{needle || tab !== 'all' ? 'No reservations here.' : 'No reservations yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Reserve a book" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={reserve} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Book (all copies out) *</span>
              <select value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })} required><option value="">Choose a book</option>{books.filter((b) => b.available < 1).map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
              {!books.some((b) => b.available < 1) && <small className="field-note">Every book has a free copy, so there is nothing to reserve.</small>}
            </label>
            <label className="wide"><span>Student *</span><TypeaheadSelect kind="students" value={form.studentId} onChange={(id) => setForm({ ...form, studentId: id })} filters={{ status: 'active' }} required /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Reserve'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
