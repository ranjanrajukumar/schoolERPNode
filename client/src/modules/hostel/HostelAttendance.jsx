import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const STATUSES = [
  ['present', 'Present'],
  ['absent', 'Absent'],
  ['leave', 'On leave'],
];
const TABS = [
  ['all', 'All boarders'],
  ['present', 'Present'],
  ['absent', 'Absent'],
  ['leave', 'On leave'],
];
const today = () => localDate();

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

/** The night roll call: every boarder of a hostel marked present, absent or on leave for a date. */
export default function HostelAttendance() {
  const canMark = ['admin', 'teacher'].includes(useAuth().user?.role);
  const [hostels, setHostels] = useState([]);
  const [hostelId, setHostelId] = useState('');
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api('/hostel/hostels')
      .then((h) => {
        setHostels(h);
        if (h[0]) setHostelId((id) => id || String(h[0].id));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!hostelId) {
      setRows([]);
      return;
    }
    setError('');
    setNotice('');
    setPage(1);
    setDirty(false);
    api(`/hostel/attendance?hostelId=${hostelId}&date=${date}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [hostelId, date]);

  const mark = (id, status) => {
    setDirty(true);
    setRows((rs) => rs.map((r) => (r.studentId === id ? { ...r, status } : r)));
  };
  const markAll = (status) => {
    setDirty(true);
    setRows((rs) => rs.map((r) => ({ ...r, status })));
  };

  const save = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    const records = rows.filter((r) => r.status).map(({ studentId, status }) => ({ studentId, status }));
    try {
      await api('/hostel/attendance', { method: 'POST', body: { date, records } });
      setNotice(`Saved ${records.length} records.`);
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || r.status === tab) &&
      (!needle || `${r.name} ${r.admissionNo} ${r.roomNo}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const unmarked = rows.filter((r) => !r.status).length;
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Hostel attendance</h1>
          <p className="hint">The night roll call: mark each boarder present, absent or on leave.</p>
        </div>
        <div className="head-actions">
          <select
            value={hostelId}
            onChange={(e) => setHostelId(e.target.value)}
            aria-label="Hostel"
            style={{ minHeight: 44 }}
          >
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value || today())}
            aria-label="Date"
            style={{ minHeight: 44 }}
          />
          {canMark && (
            <button type="button" className="big-action" onClick={save} disabled={busy || !dirty}>
              {busy ? 'Saving…' : dirty ? 'Save attendance' : 'Saved'}
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Boarders" value={rows.length} />
        <Tile icon="✓" tone="green" label="Present" value={count('present')} />
        <Tile icon="×" tone="red" label="Absent" value={count('absent')} />
        <Tile
          icon="◷"
          tone="amber"
          label="Not marked yet"
          value={unmarked}
          hint={count('leave') ? `${count('leave')} on leave` : null}
        />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => goTab(k)}
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
              placeholder="Search boarder or room…"
              aria-label="Search boarders"
            />
          </label>
          {canMark && rows.length > 0 && (
            <button type="button" className="ghost" onClick={() => markAll('present')}>
              Mark everyone present
            </button>
          )}
          <span className="showing">{shown.length} boarders</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Boarder</th>
                <th>Room</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.studentId}>
                  <td>
                    <b>{r.name}</b>
                    <small className="block">{r.admissionNo}</small>
                  </td>
                  <td>{r.roomNo}</td>
                  <td>
                    <select
                      className={`att-select ${r.status === 'leave' ? 'late' : (r.status ?? '')}`}
                      value={r.status ?? ''}
                      disabled={!canMark}
                      onChange={(e) => mark(r.studentId, e.target.value || null)}
                      aria-label={`Status of ${r.name}`}
                    >
                      <option value="">Not marked</option>
                      {STATUSES.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={3} className="empty-row">
                    {!hostelId
                      ? 'Choose a hostel.'
                      : needle || tab !== 'all'
                        ? 'No boarders match.'
                        : 'No students in this hostel.'}
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
