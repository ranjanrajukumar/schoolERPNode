import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const EMPTY = { studentId: '', leaveTypeId: '', fromDate: '', toDate: '', reason: '' };
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

/** Student leave: recorded by staff or sent from the parent portal. Approved leave excuses the absence on the attendance sheet. */
export default function StudentLeaves() {
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/student-leaves')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api('/leave-types?kind=student')
      .then(setTypes)
      .catch(() => {});
  }, []);
  useOpenNew(() => {
    setForm(EMPTY);
    setEntry(true);
  });

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
      await api('/student-leaves', { method: 'POST', body: form });
      setEntry(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const approve = (l) => run(() => api(`/student-leaves/${l.id}/approve`, { method: 'POST', body: {} }));
  const reject = (l) => {
    const remarks = prompt(`Reason for rejecting ${l.studentName}'s leave`);
    if (remarks) run(() => api(`/student-leaves/${l.id}/reject`, { method: 'POST', body: { remarks } }));
  };
  const cancel = (l) => run(() => api(`/student-leaves/${l.id}/cancel`, { method: 'POST' }));

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || r.status === tab) &&
      (!needle ||
        `${r.studentName} ${r.admissionNo} ${r.className} ${r.reason}`.toLowerCase().includes(needle)),
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
          <h1>Student leave</h1>
          <p className="hint">
            Students and parents can apply from the portal; staff can also record a request received by phone
            or letter. The class teacher (or an admin) approves or rejects each one and the family is
            notified. Approved leave shows on the attendance sheet so an absence is known to be excused.
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="big-action"
            onClick={() => {
              setError('');
              setForm(EMPTY);
              setEntry(true);
            }}
          >
            + Record leave
          </button>
        </div>
      </div>
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
              placeholder="Search student, class or reason…"
              aria-label="Search leave"
            />
          </label>
          <span className="showing">{shown.length} applications</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Applied by</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((l) => (
                <tr key={l.id}>
                  <td>
                    <b>{l.studentName}</b>
                    <small className="block">{l.admissionNo}</small>
                  </td>
                  <td>{l.className}</td>
                  <td>{l.leaveType ?? <span className="none">—</span>}</td>
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
                    {l.reason}
                    {l.remarks && <small className="block">{l.remarks}</small>}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {l.appliedBy ?? <span className="none">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${badge[l.status]}`}>● {l.status}</span>
                    {l.decidedByName && (
                      <small className="block">
                        by {l.decidedByName}
                        {l.decidedOn ? ` · ${date(l.decidedOn)}` : ''}
                      </small>
                    )}
                    {l.status === 'pending' && !l.canDecide && (
                      <small className="block">Waiting for the approver</small>
                    )}
                  </td>
                  <td className="row-actions">
                    {l.status === 'pending' && l.canDecide && (
                      <button type="button" onClick={() => approve(l)}>
                        Approve
                      </button>
                    )}
                    {l.status === 'pending' && l.canDecide && (
                      <button type="button" className="ghost" onClick={() => reject(l)}>
                        Reject
                      </button>
                    )}
                    {['pending', 'approved'].includes(l.status) && (
                      <button type="button" className="ghost" onClick={() => cancel(l)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={10} className="empty-row">
                    {needle || tab !== 'all' ? 'No leave applications match.' : 'No leave applications yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Record leave" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={apply} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Student *</span>
              <TypeaheadSelect
                kind="students"
                value={form.studentId}
                onChange={(id) => setForm({ ...form, studentId: id })}
                filters={{ status: 'active' }}
                required
              />
            </label>
            <label className="wide">
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
                    {t.yearlyDays !== null ? ` (${t.yearlyDays} days a year)` : ''}
                  </option>
                ))}
              </select>
            </label>
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
              <span>Reason *</span>
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
                maxLength={200}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Record leave'}
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
