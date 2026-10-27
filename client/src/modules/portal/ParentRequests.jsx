import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const BADGE = { pending: 'partial', requested: 'partial', approved: 'paid', accepted: 'paid', issued: 'paid', rejected: 'rejected', cancelled: '' };
const TABS = [['open', 'Waiting for a decision'], ['all', 'All'], ['Leave', 'Leave'], ['Certificate', 'Certificates'], ['Revaluation', 'Revaluation']];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Requests sent from the parent portal; each is decided on its own page. */
export default function ParentRequests() {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => { api('/login-activity/parent-requests').then(setRows).catch((e) => setError(e.message)); }, []);

  const inTab = (r, k) => k === 'all' || (k === 'open' ? r.open : r.kind === k);
  const count = (k) => rows.filter((r) => inTab(r, k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => inTab(r, tab) && (!needle || `${r.parentName} ${r.studentName} ${r.admissionNo} ${r.summary}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Parent requests</h1>
          <p className="hint">Leave applications, certificate requests and mark-revaluation queries sent from the parent portal. Decide each one on its own page.</p>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="◷" tone="amber" label="Waiting for a decision" value={count('open')} />
        <Tile icon="▤" tone="blue" label="Leave" value={count('Leave')} />
        <Tile icon="✎" tone="violet" label="Certificates" value={count('Certificate')} />
        <Tile icon="★" tone="green" label="Revaluation" value={count('Revaluation')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search parent, student or request…" aria-label="Search requests" /></label>
          <span className="showing">{shown.length} requests</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Sent</th><th>Type</th><th>Parent</th><th>Student</th><th>Request</th><th>Status</th><th /></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.key}>
                  <td>{String(r.createdAt).slice(0, 10)}</td><td>{r.kind}</td><td>{r.parentName}</td>
                  <td><b>{r.studentName}</b><small className="block">{r.admissionNo}</small></td><td>{r.summary}</td>
                  <td><span className={`badge ${BADGE[r.status]}`}>● {r.status}</span></td>
                  <td className="row-actions">{r.open && <Link className="btn" to={r.link}>Review</Link>}</td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={7} className="empty-row">{needle || tab !== 'all' ? 'No requests match.' : 'No requests yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
