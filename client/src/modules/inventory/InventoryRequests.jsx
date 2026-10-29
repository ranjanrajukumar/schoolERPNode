import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const TABS = [
  ['all', 'All requests'],
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['cancelled', 'Withdrawn'],
];
const PILL = { pending: 'partial', approved: 'paid', rejected: 'rejected', cancelled: '' };
const LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Withdrawn' };
const EMPTY = { itemId: '', quantity: '', reason: '' };
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, hint, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="tile card tile-button" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="tile card">{body}</div>
  );
}

/** Staff ask for items; an admin approves (which issues the stock) or rejects. Everyone sees their own requests. */
export default function InventoryRequests() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [popup, setPopup] = useState(null); // { kind: 'new' | 'approve' | 'reject', row? }
  const [decision, setDecision] = useState('');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), true); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/inventory-requests')
      .then(setRows)
      .catch((e) => setError(e.message));
    api('/inventory-requests/catalog')
      .then(setCatalog)
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
    setPopup({ kind: 'new' });
  };
  const item = catalog.find((i) => String(i.id) === String(form.itemId));
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const close = () => setPopup(null);
  const run = async (fn, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (message) setNotice(message);
      load();
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run(
      () => api('/inventory-requests', { method: 'POST', body: form }),
      'Request sent. You will see the decision here.',
    );
  };
  const openApprove = (r) => {
    setError('');
    setDecision(String(Math.min(r.quantity, r.inStock)));
    setPopup({ kind: 'approve', row: r });
  };
  const openReject = (r) => {
    setError('');
    setDecision('');
    setPopup({ kind: 'reject', row: r });
  };
  const approve = (e) => {
    e.preventDefault();
    run(
      () =>
        api(`/inventory-requests/${popup.row.id}/approve`, { method: 'POST', body: { quantity: decision } }),
      'Approved and issued from stock.',
    );
  };
  const reject = (e) => {
    e.preventDefault();
    run(
      () =>
        api(`/inventory-requests/${popup.row.id}/reject`, { method: 'POST', body: { remarks: decision } }),
      'Request rejected.',
    );
  };
  const cancel = async (r) => {
    setError('');
    setNotice('');
    try {
      await api(`/inventory-requests/${r.id}/cancel`, { method: 'POST' });
      setNotice('Request withdrawn.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || r.status === tab) &&
      (!needle ||
        `${r.itemName} ${r.requestedByName ?? ''} ${r.reason ?? ''}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const exportCsv = () => {
    const head = [
      'Date',
      ...(isAdmin ? ['Requested by'] : []),
      'Item',
      'Quantity',
      'Approved',
      'Needed for',
      'Status',
      'Decided by',
    ];
    const lines = shown.map((r) =>
      [
        String(r.createdAt).slice(0, 10),
        ...(isAdmin ? [r.requestedByName] : []),
        r.itemName,
        `${r.quantity} ${r.unit}`,
        r.approvedQuantity,
        r.reason,
        r.status,
        r.decidedByName,
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const l = document.createElement('a');
    l.href = url;
    l.download = 'inventory-requests.csv';
    document.body.appendChild(l);
    l.click();
    l.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Inventory requests</h1>
          <p className="hint">
            {isAdmin
              ? 'Requests from staff. Approving issues the items from stock straight away; you can approve fewer than were asked for.'
              : 'Ask the school office for items. You can see and withdraw your own requests.'}
          </p>
        </div>
        <div className="head-actions">
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          <button type="button" className="big-action" onClick={openNew}>
            ＋ New request
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !popup && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="▤"
          tone="blue"
          label={isAdmin ? 'Requests' : 'My requests'}
          value={rows.length}
          onClick={() => goTab('all')}
        />
        <Tile
          icon="◷"
          tone="amber"
          label="Pending"
          value={count('pending')}
          hint={isAdmin && count('pending') ? 'Waiting for your decision' : null}
          onClick={() => goTab('pending')}
        />
        <Tile
          icon="✓"
          tone="green"
          label="Approved"
          value={count('approved')}
          onClick={() => goTab('approved')}
        />
        <Tile
          icon="×"
          tone="red"
          label="Rejected"
          value={count('rejected')}
          onClick={() => goTab('rejected')}
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
              placeholder="Search item, person or reason…"
              aria-label="Search requests"
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
                <th>Date</th>
                {isAdmin && <th>Requested by</th>}
                <th>Item</th>
                <th>Quantity</th>
                <th>Needed for</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>{date(r.createdAt)}</td>
                  {isAdmin && <td>{r.requestedByName}</td>}
                  <td>
                    <b>{r.itemName}</b>
                    {r.status === 'pending' && (
                      <small className="block">
                        {r.inStock} {r.unit} in stock
                      </small>
                    )}
                  </td>
                  <td>
                    {r.quantity} {r.unit}
                    {r.approvedQuantity !== null && r.approvedQuantity !== r.quantity && (
                      <small className="block">approved {r.approvedQuantity}</small>
                    )}
                  </td>
                  <td>
                    {r.reason}
                    {r.remarks && <small className="block">{r.remarks}</small>}
                  </td>
                  <td>
                    <span className={`badge ${PILL[r.status]}`}>● {LABEL[r.status]}</span>
                    {r.decidedByName && <small className="block">by {r.decidedByName}</small>}
                  </td>
                  <td className="row-actions">
                    {r.status === 'pending' && isAdmin && (
                      <Gate action="approve">
                        <button type="button" onClick={() => openApprove(r)}>
                          Approve
                        </button>
                      </Gate>
                    )}
                    {r.status === 'pending' && isAdmin && (
                      <Gate action="approve">
                        <button type="button" className="ghost danger" onClick={() => openReject(r)}>
                          Reject
                        </button>
                      </Gate>
                    )}
                    {r.status === 'pending' && r.requestedBy === user.id && (
                      <button type="button" className="ghost" onClick={() => cancel(r)}>
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="empty-row">
                    {needle || tab !== 'all' ? 'No requests match.' : 'No requests yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal
        open={Boolean(popup)}
        title={
          { new: 'New request', approve: 'Approve request', reject: 'Reject request' }[popup?.kind] ?? ''
        }
        wide={false}
        onClose={close}
      >
        {popup?.kind === 'new' && (
          <form onSubmit={submit} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              <label className="wide">
                <span>Item *</span>
                <select value={form.itemId} onChange={set('itemId')} required>
                  <option value="">Choose an item</option>
                  {catalog.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.inStock} {i.unit} in stock)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Quantity{item && ` (${item.unit})`} *</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={set('quantity')}
                  required
                />
              </label>
              <label className="wide">
                <span>Needed for *</span>
                <input
                  value={form.reason}
                  onChange={set('reason')}
                  placeholder="e.g. Class 6 science practical"
                  required
                  maxLength={255}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send request'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'approve' && (
          <form onSubmit={approve} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              {popup.row.requestedByName} asked for{' '}
              <b>
                {popup.row.quantity} {popup.row.unit}
              </b>{' '}
              of {popup.row.itemName}. {popup.row.inStock} {popup.row.unit} are in stock.
            </p>
            <div className="enq-grid">
              <label>
                <span>Quantity to issue *</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  max={Math.min(popup.row.quantity, popup.row.inStock)}
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Issuing…' : 'Approve and issue'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'reject' && (
          <form onSubmit={reject} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              Tell {popup.row.requestedByName} why the request for {popup.row.itemName} is being turned down.
            </p>
            <div className="enq-grid">
              <label className="wide">
                <span>Reason *</span>
                <input
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  required
                  maxLength={255}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="danger" disabled={busy}>
                {busy ? 'Saving…' : 'Reject request'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
