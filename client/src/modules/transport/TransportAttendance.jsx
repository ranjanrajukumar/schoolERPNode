import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const STATUSES = [['boarded', 'Boarded'], ['absent', 'Absent']];
const TABS = [['all', 'All riders'], ['boarded', 'Boarded'], ['absent', 'Absent']];
const today = () => localDate();

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Bus attendance: who boarded the morning or evening trip of a route on a date. */
export default function TransportAttendance() {
  const canMark = ['admin', 'teacher'].includes(useAuth().user?.role);
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState('');
  const [date, setDate] = useState(today());
  const [trip, setTrip] = useState('morning');
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { api('/transport/routes').then((r) => { setRoutes(r); if (r[0]) setRouteId((id) => id || String(r[0].id)); }).catch(() => {}); }, []);
  useEffect(() => {
    if (!routeId) { setRows([]); return; }
    setError(''); setNotice(''); setPage(1); setDirty(false);
    api(`/transport/attendance?routeId=${routeId}&date=${date}&trip=${trip}`).then(setRows).catch((e) => setError(e.message));
  }, [routeId, date, trip]);

  const mark = (id, status) => { setDirty(true); setRows((rs) => rs.map((r) => (r.studentId === id ? { ...r, status } : r))); };
  const markAll = (status) => { setDirty(true); setRows((rs) => rs.map((r) => ({ ...r, status }))); };
  const save = async () => {
    setError(''); setNotice(''); setBusy(true);
    const records = rows.filter((r) => r.status).map(({ studentId, status }) => ({ studentId, status }));
    try { await api('/transport/attendance', { method: 'POST', body: { date, trip, records } }); setNotice(`Saved ${records.length} records.`); setDirty(false); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || r.status === tab) && (!needle || `${r.name} ${r.admissionNo} ${r.stopName}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const unmarked = rows.filter((r) => !r.status).length;
  const goTab = (t) => { setTab(t); setPage(1); };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Transport attendance</h1>
          <p className="hint">Mark who boarded the bus on each trip of a route.</p>
        </div>
        <div className="head-actions">
          <select value={routeId} onChange={(e) => setRouteId(e.target.value)} aria-label="Route" style={{ minHeight: 44 }}>{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <select value={trip} onChange={(e) => setTrip(e.target.value)} aria-label="Trip" style={{ minHeight: 44 }}><option value="morning">Morning (to school)</option><option value="evening">Evening (home)</option></select>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} aria-label="Date" style={{ minHeight: 44 }} />
          {canMark && <button type="button" className="big-action" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save attendance' : 'Saved'}</button>}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Riders on this route" value={rows.length} />
        <Tile icon="✓" tone="green" label="Boarded" value={count('boarded')} />
        <Tile icon="×" tone="red" label="Absent" value={count('absent')} />
        <Tile icon="◷" tone="amber" label="Not marked yet" value={unmarked} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => goTab(k)}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search rider or stop…" aria-label="Search riders" /></label>
          {canMark && rows.length > 0 && <button type="button" className="ghost" onClick={() => markAll('boarded')}>Mark everyone boarded</button>}
          <span className="showing">{shown.length} riders</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Stop</th><th>Rider</th><th>Status</th></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.studentId}>
                  <td>{r.stopName}</td><td><b>{r.name}</b><small className="block">{r.admissionNo}</small></td>
                  <td>
                    <select className={`att-select ${r.status === 'boarded' ? 'present' : r.status ?? ''}`} value={r.status ?? ''} disabled={!canMark} onChange={(e) => mark(r.studentId, e.target.value || null)} aria-label={`Status of ${r.name}`}>
                      <option value="">Not marked</option>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={3} className="empty-row">{!routeId ? 'Choose a route.' : needle || tab !== 'all' ? 'No riders match.' : 'No students on this route.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
