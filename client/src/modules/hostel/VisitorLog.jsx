import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const EMPTY = { studentId: '', visitorName: '', relation: '', phone: '', purpose: '' };
const TABS = [
  ['inside', 'Inside now'],
  ['all', 'All visitors'],
];
const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

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

/** The hostel visitor log: who came to see which boarder, when they came in and when they left. */
export default function VisitorLog() {
  const canWrite = ['admin', 'teacher'].includes(useAuth().user?.role);
  const [rows, setRows] = useState([]);
  const [boarders, setBoarders] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('inside');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), canWrite); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/hostel/visitors')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    api('/hostel/allocations')
      .then(setBoarders)
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
    setEntry(true);
  };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/hostel/visitors', { method: 'POST', body: form });
      setNotice('Visitor checked in.');
      setEntry(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const checkOut = async (v) => {
    setError('');
    setNotice('');
    try {
      await api(`/hostel/visitors/${v.id}/checkout`, { method: 'POST' });
      setNotice(`${v.visitorName} checked out.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inside = rows.filter((v) => !v.checkOut);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = rows.filter((v) => new Date(v.checkIn) >= startOfToday);
  const needle = q.trim().toLowerCase();
  const shown = (tab === 'inside' ? inside : rows).filter(
    (v) =>
      !needle ||
      `${v.visitorName} ${v.studentName} ${v.admissionNo} ${v.phone ?? ''}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const exportCsv = () => {
    const head = ['Visitor', 'Relation', 'Phone', 'Visiting', 'Admission no', 'Purpose', 'In', 'Out'];
    const lines = shown.map((v) =>
      [v.visitorName, v.relation, v.phone, v.studentName, v.admissionNo, v.purpose, v.checkIn, v.checkOut]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const l = document.createElement('a');
    l.href = url;
    l.download = 'hostel-visitors.csv';
    document.body.appendChild(l);
    l.click();
    l.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Visitor log</h1>
          <p className="hint">
            Check visitors in when they arrive and out when they leave. Only boarders can be visited.
          </p>
        </div>
        <div className="head-actions">
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          {canWrite && (
            <button type="button" className="big-action" onClick={openNew}>
              ＋ Check in a visitor
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="♙"
          tone="amber"
          label="Inside now"
          value={inside.length}
          hint={inside.length ? 'Remember to check them out' : 'Nobody inside'}
        />
        <Tile icon="▤" tone="blue" label="Visits today" value={today.length} />
        <Tile icon="≡" tone="violet" label="Visits recorded" value={rows.length} />
        <Tile icon="✓" tone="green" label="Boarders" value={boarders.length} />
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
              <span className="count">{k === 'inside' ? inside.length : rows.length}</span>
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
              placeholder="Search visitor or student…"
              aria-label="Search visitors"
            />
          </label>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, shown.length)}
            </b>{' '}
            of <b>{shown.length}</b>
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Visiting</th>
                <th>Purpose</th>
                <th>In</th>
                <th>Out</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((v) => (
                <tr key={v.id}>
                  <td>
                    <b>{v.visitorName}</b>
                    {v.relation && <small> ({v.relation})</small>}
                    {v.phone && <small className="block">{v.phone}</small>}
                  </td>
                  <td>
                    {v.studentName}
                    <small className="block">{v.admissionNo}</small>
                  </td>
                  <td>{v.purpose ?? '—'}</td>
                  <td>{fmt(v.checkIn)}</td>
                  <td>{v.checkOut ? fmt(v.checkOut) : <span className="badge partial">● Inside</span>}</td>
                  {canWrite && (
                    <td className="row-actions">
                      {!v.checkOut && (
                        <button type="button" onClick={() => checkOut(v)}>
                          Check out
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={canWrite ? 6 : 5} className="empty-row">
                    {needle
                      ? 'No visitors match.'
                      : tab === 'inside'
                        ? 'Nobody is inside.'
                        : 'No visitors recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Check in a visitor" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Visiting *</span>
              <select value={form.studentId} onChange={set('studentId')} required>
                <option value="">Choose a boarder</option>
                {boarders.map((b) => (
                  <option key={b.studentId} value={b.studentId}>
                    {b.admissionNo} · {b.studentName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Visitor name *</span>
              <input value={form.visitorName} onChange={set('visitorName')} required maxLength={100} />
            </label>
            <label>
              <span>Relation</span>
              <input
                value={form.relation}
                onChange={set('relation')}
                maxLength={40}
                placeholder="e.g. Father"
              />
            </label>
            <label>
              <span>Phone</span>
              <input type="tel" value={form.phone} onChange={set('phone')} maxLength={20} />
            </label>
            <label>
              <span>Purpose</span>
              <input value={form.purpose} onChange={set('purpose')} maxLength={160} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Check in'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
