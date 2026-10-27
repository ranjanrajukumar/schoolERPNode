import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
const BADGE = { open: 'partial', in_progress: 'partial', resolved: 'paid' };
const EMPTY = { subject: '', category: 'question', message: '' };
const TABS = [['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['all', 'All']];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Questions, problems and suggestions sent to the administrator, who replies here. */
export default function SupportRequests() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' && !user?.customRole;
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [reply, setReply] = useState({});
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => { api('/support').then(setRows).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);
  const openNew = () => { setError(''); setNotice(''); setForm(EMPTY); setEntry(true); };
  useOpenNew(openNew);

  const run = async (fn, message) => {
    setError(''); setNotice('');
    try { await fn(); if (message) setNotice(message); load(); } catch (err) { setError(err.message); }
  };
  const send = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      await api('/support', { method: 'POST', body: form });
      setEntry(false); setForm(EMPTY); setNotice('Your request was sent to the administrator.'); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const answer = (t, status) => run(() => api(`/support/${t.id}`, { method: 'PUT', body: { status, response: reply[t.id] ?? t.response ?? '' } }), 'Saved.');

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || r.status === tab) && (!needle || `${r.subject} ${r.message} ${r.category} ${r.createdByName}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const t = rows.find((r) => r.id === viewId);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Support requests</h1>
          <p className="hint">{isAdmin ? 'Requests sent by staff. Reply and mark each one as it is dealt with.' : 'Send a question, problem or suggestion to the administrator and see their replies here.'}</p>
        </div>
        <div className="head-actions"><button type="button" className="big-action" onClick={openNew}>+ New request</button></div>
      </div>
      {error && !entry && !t && <p className="error" role="alert">{error}</p>}
      {notice && !t && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="◷" tone="amber" label="Open" value={count('open')} />
        <Tile icon="✎" tone="blue" label="In progress" value={count('in_progress')} />
        <Tile icon="✓" tone="green" label="Resolved" value={count('resolved')} />
        <Tile icon="▤" tone="violet" label={isAdmin ? 'All requests' : 'My requests'} value={rows.length} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search subject or details…" aria-label="Search requests" /></label>
          <span className="showing">{shown.length} requests</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Subject</th><th>Type</th><th>From</th><th>Sent</th><th>Status</th><th /></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.subject}</b>{r.response && <small className="block">Replied{r.respondedByName && ` by ${r.respondedByName}`}</small>}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                  <td>{r.createdByName}</td>
                  <td>{String(r.createdAt).slice(0, 10)}</td>
                  <td><span className={`badge ${BADGE[r.status]}`}>● {LABEL[r.status]}</span></td>
                  <td className="row-actions"><button type="button" className="ghost" onClick={() => { setError(''); setNotice(''); setViewId(r.id); }}>{isAdmin ? 'Open / reply' : 'View'}</button></td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={6} className="empty-row">{needle || tab !== 'all' ? 'No requests match.' : 'No requests yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="New support request" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={send} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Subject *</span><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required maxLength={160} /></label>
            <label className="wide"><span>Type</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="question">Question</option><option value="problem">Problem</option><option value="suggestion">Suggestion</option>
              </select>
            </label>
            <label className="wide"><span>Details *</span><textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={5000} /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(t)} title={t?.subject ?? 'Request'} wide={false} onClose={() => setViewId(null)}>
        {t && (
          <div className="enquiry-form">
            {error && <p className="error" role="alert">{error}</p>}
            {notice && <p className="success">{notice}</p>}
            <p><span className={`badge ${BADGE[t.status]}`}>● {LABEL[t.status]}</span> <small>· {t.category} · {t.createdByName} · {String(t.createdAt).slice(0, 10)}</small></p>
            <p style={{ whiteSpace: 'pre-line' }}>{t.message}</p>
            {t.response && <p className="success" style={{ whiteSpace: 'pre-line' }}><b>Reply{t.respondedByName && ` from ${t.respondedByName}`}:</b> {t.response}</p>}
            {isAdmin && (
              <>
                <div className="enq-grid">
                  <label className="wide"><span>Reply</span><textarea rows={3} value={reply[t.id] ?? t.response ?? ''} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} /></label>
                </div>
                <div className="form-actions">
                  {['open', 'in_progress', 'resolved'].filter((s) => s !== t.status).map((s) => <button key={s} type="button" onClick={() => answer(t, s)}>Mark {LABEL[s].toLowerCase()}</button>)}
                  {t.status === 'resolved' && <button type="button" onClick={() => answer(t, 'resolved')}>Save reply</button>}
                  <button type="button" className="ghost" onClick={() => setViewId(null)}>Close</button>
                </div>
              </>
            )}
            {!isAdmin && <div className="form-actions"><button type="button" className="ghost" onClick={() => setViewId(null)}>Close</button></div>}
          </div>
        )}
      </Modal>
    </>
  );
}
