import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </div>
  );
}

/** Audit trail of changes to saved attendance marks. */
export default function AttendanceCorrections() {
  const [rows, setRows] = useState([]);
  const [range, setRange] = useState({ from: '', to: '' });
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(range).filter(([, v]) => v));
    api(`/attendance/corrections?${qs}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [range]);

  // Tabs are the new status the mark was changed to.
  const statuses = [...new Set(rows.map((r) => r.newStatus))].sort();
  const tabs = [['all', 'All'], ...statuses.map((s) => [s, s[0].toUpperCase() + s.slice(1)])];
  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.newStatus === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || r.newStatus === tab) &&
      (!needle ||
        `${r.studentName} ${r.admissionNo} ${r.reason ?? ''} ${r.correctedByName}`
          .toLowerCase()
          .includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const withReason = rows.filter((r) => r.reason).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Attendance corrections</h1>
          <p className="hint">
            Every time a saved attendance mark is changed it is recorded here: the old and new value, who
            changed it and why. Corrections are made on the Attendance page.
          </p>
        </div>
        <div className="head-actions">
          <input
            type="date"
            value={range.from}
            onChange={(e) => {
              setRange({ ...range, from: e.target.value });
              setPage(1);
            }}
            aria-label="From"
            style={{ minHeight: 44 }}
          />
          <input
            type="date"
            value={range.to}
            onChange={(e) => {
              setRange({ ...range, to: e.target.value });
              setPage(1);
            }}
            aria-label="To"
            style={{ minHeight: 44 }}
          />
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Corrections" value={rows.length} />
        <Tile
          icon="♙"
          tone="violet"
          label="Students affected"
          value={new Set(rows.map((r) => r.admissionNo)).size}
        />
        <Tile icon="✓" tone="green" label="With a reason" value={withReason} />
        <Tile icon="◷" tone="amber" label="Same day, no reason" value={rows.length - withReason} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
            >
              {l}
              <span className="count">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, reason or staff…"
              aria-label="Search corrections"
            />
          </label>
          <span className="showing">{shown.length} corrections</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Attendance date</th>
                <th>Student</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Changed by</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id}>
                  <td>{date(c.date)}</td>
                  <td>
                    <b>{c.studentName}</b>
                    <small className="block">{c.admissionNo}</small>
                  </td>
                  <td>
                    {c.oldStatus} → <b>{c.newStatus}</b>
                  </td>
                  <td>{c.reason ?? <small>same day, no reason needed</small>}</td>
                  <td>{c.correctedByName}</td>
                  <td className="muted-cell">{String(c.correctedAt).replace('T', ' ').slice(0, 16)}</td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    {needle || tab !== 'all' ? 'No corrections match.' : 'No corrections recorded.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
