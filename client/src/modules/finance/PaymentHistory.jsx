import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const money = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

/** Every fee payment with its receipt, plus refunds. */
export default function PaymentHistory() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api('/fees/payments')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const refund = async (p) => {
    const amount = prompt(`Refund how much? (up to ${p.refundable})`, p.refundable);
    if (!amount) return;
    const reason = prompt('Reason for the refund');
    if (!reason) return;
    setError('');
    setNotice('');
    try {
      await api(`/fees/payments/${p.id}/refund`, { method: 'POST', body: { amount, reason } });
      setNotice(`Refunded ${amount} on ${p.receiptNo}. The fee balance is owed again.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const show = (p) =>
    api(`/fees/receipts/${p.id}`)
      .then(setReceipt)
      .catch((e) => setError(e.message));

  const isRefunded = (r) => Number(r.refunded) > 0;
  const TABS = [
    ['all', 'All', rows.length],
    ['refunded', 'Refunded', rows.filter(isRefunded).length],
  ];
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || isRefunded(r)) &&
      (!needle ||
        [r.studentName, r.admissionNo, r.receiptNo, r.feeTitle].some((v) =>
          v.toLowerCase().includes(needle),
        )),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const today = localDate();
  const collected = rows.reduce((n, r) => n + Number(r.amount), 0);
  const refunded = rows.reduce((n, r) => n + Number(r.refunded), 0);
  const todays = rows.filter((r) => String(r.paidOn).slice(0, 10) === today);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Payment history</h1>
          <p className="hint">
            Every fee payment received. Open a receipt to print it, or refund all or part of a payment.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▣" tone="blue" label="Payments" value={rows.length} />
        <Tile icon="₹" tone="green" label="Collected" value={money(collected)} />
        <Tile icon="↺" tone="red" label="Refunded" value={money(refunded)} />
        <Tile
          icon="◷"
          tone="violet"
          label="Received today"
          value={money(todays.reduce((n, r) => n + Number(r.amount), 0))}
          hint={`${todays.length} payment${todays.length === 1 ? '' : 's'}`}
        />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l, n]) => (
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
              <span className="count">{n}</span>
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
              placeholder="Search student, admission no or receipt no…"
              aria-label="Search payments"
            />
          </label>
          <span className="showing">{shown.length} payments</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Student</th>
                <th>Fee</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Refunded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.receiptNo}</b>
                  </td>
                  <td>{p.paidOn}</td>
                  <td>
                    <b>{p.studentName}</b>
                    <small className="block">{p.admissionNo}</small>
                  </td>
                  <td>{p.feeTitle}</td>
                  <td>{p.method}</td>
                  <td>{p.amount}</td>
                  <td>{isRefunded(p) ? <span className="badge rejected">● {p.refunded}</span> : ''}</td>
                  <td className="row-actions">
                    <button type="button" onClick={() => show(p)}>
                      Receipt
                    </button>
                    {Number(p.refundable) > 0 && (
                      <button type="button" className="ghost" onClick={() => refund(p)}>
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {needle || tab !== 'all' ? 'No payments match.' : 'No payments yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal
        open={Boolean(receipt)}
        title={receipt ? `Receipt ${receipt.receiptNo}` : 'Receipt'}
        wide={false}
        onClose={() => setReceipt(null)}
      >
        {receipt && (
          <div className="receipt">
            <p>
              {receipt.paidOn} · {receipt.method} · {receipt.student.name} ({receipt.student.admissionNo}) ·{' '}
              {receipt.fee.title}
            </p>
            <p>
              Amount: <b>{receipt.amount}</b>
            </p>
            <div className="form-actions">
              <button type="button" onClick={() => window.print()}>
                Print
              </button>
              <button type="button" className="ghost" onClick={() => setReceipt(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
