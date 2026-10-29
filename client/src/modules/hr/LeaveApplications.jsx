import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const EMPTY = { staffId: '', leaveTypeId: '', fromDate: '', toDate: '', reason: '' };
const badge = { approved: 'paid', rejected: 'rejected', pending: 'partial', cancelled: '' };
const TABS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['cancelled', 'Cancelled'],
  ['all', 'All'],
];
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

/** Staff leave, entered by HR on the staff member's behalf. Approval is refused past the yearly allowance. */
export default function LeaveApplications() {
  const isAdmin = useAuth().user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [balance, setBalance] = useState(null);
  const [types, setTypes] = useState([]);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/hr/leaves')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api('/leave-types?kind=staff')
      .then(setTypes)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!form.staffId) {
      setBalance(null);
      return;
    }
    let live = true;
    api(`/hr/leave-balance/${form.staffId}`)
      .then((b) => {
        if (live) setBalance(b);
      })
      .catch(() => {
        if (live) setBalance(null);
      });
    return () => {
      live = false;
    };
  }, [form.staffId, rows]);

  const openNew = () => {
    setNotice('');
    setError('');
    setForm(EMPTY);
    setEntry(true);
  };
  useOpenNew(openNew);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const apply = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const out = await api('/hr/leaves', { method: 'POST', body: form });
      setEntry(false);
      setNotice(
        out.status === 'approved'
          ? 'Leave recorded and approved automatically.'
          : 'Leave recorded; it is waiting for approval.',
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const approve = (l) => run(() => api(`/hr/leaves/${l.id}/approve`, { method: 'POST', body: {} }));
  const reject = (l) => {
    const remarks = prompt(`Reason for rejecting ${l.staffName}'s leave`);
    if (remarks) run(() => api(`/hr/leaves/${l.id}/reject`, { method: 'POST', body: { remarks } }));
  };
  const cancel = (l) => run(() => api(`/hr/leaves/${l.id}/cancel`, { method: 'POST' }));

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || r.status === tab) &&
      (!needle || `${r.staffName} ${r.staffNo} ${r.type} ${r.reason ?? ''}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const today = localDate();
  const away = rows.filter(
    (r) =>
      r.status === 'approved' &&
      String(r.fromDate).slice(0, 10) <= today &&
      String(r.toDate).slice(0, 10) >= today,
  ).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Staff leave</h1>
          <p className="hint">
            {isAdmin
              ? "Entered by HR on the staff member's behalf. "
              : 'You see the requests of your department that you can decide. '}
            Approval is refused if it would exceed the yearly allowance.
          </p>
        </div>
        <div className="head-actions">
          {isAdmin && (
            <button type="button" className="big-action" onClick={openNew}>
              + Apply for leave
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
        <Tile icon="◷" tone="amber" label="Waiting for a decision" value={count('pending')} />
        <Tile icon="✓" tone="green" label="Approved" value={count('approved')} />
        <Tile icon="♙" tone="blue" label="On leave today" value={away} />
        <Tile icon="×" tone="red" label="Rejected" value={count('rejected')} />
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
              placeholder="Search staff, type or reason…"
              aria-label="Search leave"
            />
          </label>
          <span className="showing">{shown.length} applications</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((l) => (
                <tr key={l.id}>
                  <td>
                    <b>{l.staffName}</b>
                    <small className="block">{l.staffNo}</small>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{l.type}</td>
                  <td>
                    {date(l.fromDate)}
                    {l.dayPart === 'time' && (
                      <small className="block">
                        {l.fromTime}–{l.toTime}
                      </small>
                    )}
                  </td>
                  <td>{date(l.toDate)}</td>
                  <td>
                    {l.days}
                    {l.dayPart === 'first_half' && <small className="block">first half</small>}
                    {l.dayPart === 'second_half' && <small className="block">second half</small>}
                    {l.dayPart === 'time' && <small className="block">timely</small>}
                  </td>
                  <td>
                    {l.reason || '—'}
                    {l.remarks && <small className="block">{l.remarks}</small>}
                  </td>
                  <td>
                    <span className={`badge ${badge[l.status]}`}>● {l.status}</span>
                  </td>
                  <td className="row-actions">
                    {l.status === 'pending' && l.canDecide && (
                      <Gate action="approve">
                        <button type="button" onClick={() => approve(l)}>
                          Approve
                        </button>
                      </Gate>
                    )}
                    {l.status === 'pending' && l.canDecide && (
                      <Gate action="approve">
                        <button type="button" className="ghost" onClick={() => reject(l)}>
                          Reject
                        </button>
                      </Gate>
                    )}
                    {l.status === 'pending' && !l.canDecide && (
                      <small className="block">
                        Waiting for the {l.approver === 'department_head' ? 'department head' : 'admin'}
                      </small>
                    )}
                    {isAdmin && ['pending', 'approved'].includes(l.status) && (
                      <button type="button" className="ghost" onClick={() => cancel(l)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {needle || tab !== 'all' ? 'No leave applications match.' : 'No leave applications yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Apply for leave" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={apply} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Staff *</span>
              <TypeaheadSelect
                kind="staff"
                value={form.staffId}
                onChange={(id) => setForm({ ...form, staffId: id })}
                filters={{ status: 'active' }}
                required
              />
            </label>
            {balance && (
              <p className="hint wide" style={{ margin: 0 }}>
                {balance
                  .map(
                    (b) =>
                      `${b.type}: ${b.remaining === null ? 'no cap' : `${b.remaining} left`} (${b.used} used${b.allowance !== null ? ` of ${b.allowance}` : ''})`,
                  )
                  .join(' · ')}
              </p>
            )}
            <label>
              <span>Leave type *</span>
              <select
                value={form.leaveTypeId}
                onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
                required
              >
                <option value="">Choose a type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.paid ? '' : ' (unpaid)'}
                  </option>
                ))}
              </select>
            </label>
            <span />
            <label>
              <span>From *</span>
              <input
                type="date"
                value={form.fromDate}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                required
              />
            </label>
            <label>
              <span>To *</span>
              <input
                type="date"
                value={form.toDate}
                min={form.fromDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                required
              />
            </label>
            <label className="wide">
              <span>Reason</span>
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                maxLength={200}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Apply'}
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
