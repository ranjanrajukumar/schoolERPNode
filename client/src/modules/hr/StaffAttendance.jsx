import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const STATUSES = ['present', 'late', 'absent', 'leave'];
const today = () => localDate();

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Daily staff attendance sheet. Staff on approved leave come pre-set to "leave". */
export default function StaffAttendance() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { api(`/hr/attendance?date=${date}`).then(setRows).catch((e) => setError(e.message)); }, [date]);

  const mark = (id, status) => setRows(rows.map((r) => (r.staffId === id ? { ...r, status } : r)));
  const markAllPresent = () => setRows(rows.map((r) => (r.status ? r : { ...r, status: 'present' })));

  const save = async () => {
    setError(''); setNotice('');
    const records = rows.filter((r) => r.status).map(({ staffId, status }) => ({ staffId, status }));
    try {
      await api('/hr/attendance', { method: 'POST', body: { date, records } });
      setNotice(`Saved ${records.length} records.`);
    } catch (err) { setError(err.message); }
  };

  const TABS = [['all', 'All'], ...STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)]), ['unmarked', 'Not marked']];
  const count = (k) => (k === 'all' ? rows.length : k === 'unmarked' ? rows.filter((r) => !r.status).length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || (tab === 'unmarked' ? !r.status : r.status === tab)) && (!needle || `${r.staffNo} ${r.name}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Staff attendance</h1>
          <p className="hint">Staff on approved leave are pre-set to "leave". Unmarked staff are left as they are; "Mark rest present" fills only the blanks.</p>
        </div>
        <div className="head-actions">
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value || today()); setPage(1); }} aria-label="Date" style={{ minHeight: 44 }} />
          <button type="button" className="big-action" onClick={save}>Save attendance</button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Active staff" value={rows.length} />
        <Tile icon="✓" tone="green" label="Present" value={count('present')} hint={count('late') ? `${count('late')} late` : null} />
        <Tile icon="×" tone="red" label="Absent" value={count('absent')} />
        <Tile icon="◷" tone="amber" label="On leave / not marked" value={`${count('leave')} / ${count('unmarked')}`} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search staff name or number…" aria-label="Search staff" /></label>
          {rows.length > 0 && <button type="button" className="ghost" onClick={markAllPresent}>Mark rest present</button>}
          <span className="showing">{shown.length} staff</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Staff no</th><th>Name</th><th>Status</th></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.staffId}>
                  <td>{r.staffNo}</td>
                  <td><b>{r.name}</b>{r.onApprovedLeave && <> <span className="badge partial">approved leave</span></>}</td>
                  <td>
                    <select className={`att-select ${r.status ?? ''}`} value={r.status ?? ''} onChange={(e) => mark(r.staffId, e.target.value || null)} aria-label={`Status of ${r.name}`}>
                      <option value="">Not marked</option>
                      {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={3} className="empty-row">{needle || tab !== 'all' ? 'No staff match.' : 'No active staff.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
