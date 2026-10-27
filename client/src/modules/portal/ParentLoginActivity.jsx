import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const TABS = [['all', 'All parents'], ['idle', 'Not active this week'], ['never', 'Never signed in']];
const stamp = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : 'never');

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Which parents are using the portal, and which have never signed in. */
export default function ParentLoginActivity() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { api('/login-activity/parents').then(setRows).catch((e) => setError(e.message)); }, []);

  const inTab = (r, k) => k === 'all' || (k === 'idle' ? !r.activeThisWeek : !r.logins);
  const count = (k) => rows.filter((r) => inTab(r, k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => inTab(r, tab) && (!needle || `${r.name} ${r.email} ${r.children.join(' ')}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Parent login activity</h1>
          <p className="hint">Sign-ins are recorded from when this feature was added, so older accounts may show "never" until their next visit.</p>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Parent accounts" value={rows.length} />
        <Tile icon="✓" tone="green" label="Active this week" value={rows.length - count('idle')} />
        <Tile icon="◷" tone="amber" label="Not active this week" value={count('idle')} />
        <Tile icon="!" tone="red" label="Never signed in" value={count('never')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search parent, email or child…" aria-label="Search parents" /></label>
          <span className="showing">{shown.length} parents</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Parent</th><th>Email</th><th>Children</th><th>Last sign-in</th><th>Sign-ins</th></tr></thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td><td>{p.email}</td><td>{p.children.join(', ')}</td>
                  <td>{p.logins ? stamp(p.lastLogin) : <span className="badge rejected">never</span>}</td><td>{p.logins}</td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={5} className="empty-row">{needle || tab !== 'all' ? 'No parents match.' : 'No parent accounts.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
