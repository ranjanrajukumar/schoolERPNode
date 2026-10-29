import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { loadPublicSettings } from '../../services/settings.js';

const PAGE_SIZE = 10;
const METHODS = ['cash', 'card', 'upi', 'bank'];
const TABS = [
  ['all', 'All fees'],
  ['unpaid', 'Unpaid'],
  ['partial', 'Partly paid'],
  ['overdue', 'Overdue'],
  ['paid', 'Paid'],
];
const PILL = { paid: 'paid', partial: 'partial', unpaid: '', overdue: 'rejected' };
const EMPTY_FEE = { studentId: '', title: '', amount: '', dueDate: '' };
const money = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (n) =>
  n >= 1e7
    ? `${(n / 1e7).toFixed(1)}Cr`
    : n >= 1e5
      ? `${(n / 1e5).toFixed(1)}L`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}k`
        : String(Math.round(n));
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
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

/** Fees & payments: what is billed, collected and still owed, with the actions on each fee in popups. */
export default function Fees() {
  const [fees, setFees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [tab, setTab] = useState('all');
  const [classId, setClassId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [methods, setMethods] = useState(METHODS);
  const [popup, setPopup] = useState(null); // { kind: 'add' | 'bill' | 'pay' | 'adjust' | 'fines' | 'receipt', ... }
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => open('add'), true); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/fees')
      .then(setFees)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadPublicSettings().then((s) => {
      if (s.paymentMethods?.length) setMethods(s.paymentMethods);
    });
  }, []);

  const open = (kind, extra = {}, start = {}) => {
    setError('');
    setNotice('');
    setForm(start);
    setPopup({ kind, ...extra });
  };
  const close = () => setPopup(null);
  const run = async (fn, message) => {
    setBusy(true);
    setError('');
    try {
      const r = await fn();
      if (message) setNotice(typeof message === 'function' ? message(r) : message);
      load();
      return r ?? true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const inClass = (f) => !classId || String(f.classId) === String(classId);
  const base = fees.filter(inClass);
  const count = (s) => (s === 'all' ? base.length : base.filter((f) => f.status === s).length);
  const needle = q.trim().toLowerCase();
  const shown = base.filter(
    (f) =>
      (tab === 'all' || f.status === tab) &&
      (!needle || `${f.studentName} ${f.admissionNo} ${f.title}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const billed = base.reduce((n, f) => n + Number(f.amount), 0);
  const paid = base.reduce((n, f) => n + Number(f.paidAmount), 0);
  const overdue = base.filter((f) => f.status === 'overdue');
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const submit = (fn) => async (e) => {
    e.preventDefault();
    if (await fn()) close();
  };
  const addFee = submit(() => run(() => api('/fees', { method: 'POST', body: form }), 'Fee added.'));
  const bill = submit(() =>
    run(
      () => api('/fees/generate', { method: 'POST', body: { classId: form.classId } }),
      (r) => `${r.created} fee(s) created for ${r.students} students; ${r.skipped} already billed.`,
    ),
  );
  const adjust = submit(() =>
    run(
      () =>
        api(`/fees/${popup.fee.id}/adjustments`, {
          method: 'POST',
          body: { kind: popup.mode, amount: form.amount, reason: form.reason },
        }),
      `${popup.mode === 'discount' ? 'Discount' : 'Fine'} of ${form.amount} applied.`,
    ),
  );
  const fines = submit(() =>
    run(
      () => api('/fees/late-fines', { method: 'POST', body: { amount: form.amount } }),
      (r) => `Late fee added to ${r.applied} fee(s); ${r.skipped} already had one.`,
    ),
  );
  const pay = async (e) => {
    e.preventDefault();
    const r = await run(() =>
      api(`/fees/${popup.fee.id}/payments`, {
        method: 'POST',
        body: { amount: form.amount, method: form.method },
      }),
    );
    if (r?.id) {
      const receipt = await api(`/fees/receipts/${r.id}`);
      setPopup({ kind: 'receipt', receipt });
      setNotice('Payment recorded.');
    }
  };
  const showReceipt = async (fee) => {
    setError('');
    setNotice('');
    try {
      const list = await api(`/fees/${fee.id}/payments`);
      if (!list.length) {
        setNotice('No payments recorded for this fee yet.');
        return;
      }
      setPopup({ kind: 'receipt', receipt: await api(`/fees/receipts/${list[0].id}`) });
    } catch (err) {
      setError(err.message);
    }
  };
  const remove = (f) => run(() => api(`/fees/${f.id}`, { method: 'DELETE' }), 'Fee deleted.');

  const exportCsv = () => {
    const head = ['Student', 'Admission no', 'Fee', 'Amount', 'Paid', 'Balance', 'Due', 'Status'];
    const lines = shown.map((f) =>
      [f.studentName, f.admissionNo, f.title, f.amount, f.paidAmount, f.balance, f.dueDate, f.status]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fees.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const title =
    {
      add: 'Add a fee',
      bill: 'Bill a whole class',
      pay: popup?.fee ? `Record payment: ${popup.fee.studentName}` : '',
      adjust: popup?.mode === 'discount' ? 'Give a discount' : 'Add a fine',
      fines: 'Apply late fines',
      receipt: popup?.receipt ? `Receipt ${popup.receipt.receiptNo}` : '',
    }[popup?.kind] ?? '';

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Fees &amp; payments</h1>
          <p className="hint">Bill students, record what is paid and follow up what is still owed.</p>
        </div>
        <div className="head-actions">
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          <button type="button" className="ghost" onClick={() => open('bill', {}, { classId: '' })}>
            Bill a class
          </button>
          <button type="button" className="big-action" onClick={() => open('add', {}, EMPTY_FEE)}>
            ＋ Add fee
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
          icon="▣"
          tone="blue"
          label="Total billed"
          value={`₹${short(billed)}`}
          hint={`${base.length} fee items`}
          onClick={() => goTab('all')}
        />
        <Tile
          icon="✓"
          tone="green"
          label="Collected"
          value={`₹${short(paid)}`}
          hint={billed ? `${Math.round((paid / billed) * 100)}% of billed` : null}
          onClick={() => goTab('paid')}
        />
        <Tile
          icon="◷"
          tone="amber"
          label="Outstanding"
          value={`₹${short(billed - paid)}`}
          hint={`${count('unpaid') + count('partial') + count('overdue')} items open`}
          onClick={() => goTab('unpaid')}
        />
        <Tile
          icon="!"
          tone="red"
          label="Overdue"
          value={overdue.length}
          hint={
            overdue.length
              ? `₹${short(overdue.reduce((n, f) => n + Number(f.balance), 0))} past due`
              : 'Nothing overdue'
          }
          onClick={() => goTab('overdue')}
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
              placeholder="Search student, ID or fee…"
              aria-label="Search fees"
            />
          </label>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPage(1);
            }}
            aria-label="Class"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.section}
              </option>
            ))}
          </select>
          <button type="button" className="ghost" onClick={() => open('fines', {}, { amount: '' })}>
            Apply late fines…
          </button>
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
                <th>Student</th>
                <th>Fee</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Due</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((f) => (
                <tr key={f.id}>
                  <td>
                    <b>{f.studentName}</b>
                    <small className="block">{f.admissionNo}</small>
                  </td>
                  <td>{f.title}</td>
                  <td>{money(f.amount)}</td>
                  <td>{money(f.paidAmount)}</td>
                  <td>
                    <b>{money(f.balance)}</b>
                  </td>
                  <td>{date(f.dueDate)}</td>
                  <td>
                    <span className={`badge ${PILL[f.status] ?? ''}`}>
                      ● {f.status[0].toUpperCase() + f.status.slice(1)}
                    </span>
                  </td>
                  <td className="row-actions">
                    {f.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => open('pay', { fee: f }, { amount: f.balance, method: methods[0] })}
                      >
                        Pay
                      </button>
                    )}
                    {Number(f.paidAmount) > 0 && (
                      <button type="button" className="ghost" onClick={() => showReceipt(f)}>
                        Receipt
                      </button>
                    )}
                    {f.status !== 'paid' && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() =>
                          open('adjust', { fee: f, mode: 'discount' }, { amount: '', reason: '' })
                        }
                      >
                        Discount
                      </button>
                    )}
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => open('adjust', { fee: f, mode: 'fine' }, { amount: '', reason: '' })}
                    >
                      Fine
                    </button>
                    {Number(f.paidAmount) === 0 && (
                      <Gate action="delete">
                        <button type="button" className="ghost danger" onClick={() => remove(f)}>
                          Delete
                        </button>
                      </Gate>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {needle || tab !== 'all' || classId
                      ? 'No fees match these filters.'
                      : 'No fees yet. Add one, or bill a whole class from its fee structure.'}
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
        title={title}
        wide={popup?.kind === 'add' || popup?.kind === 'receipt' ? undefined : false}
        onClose={close}
      >
        {popup?.kind === 'add' && (
          <form onSubmit={addFee} className="enquiry-form">
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
                  required
                />
              </label>
              <label>
                <span>Fee item *</span>
                <input
                  value={form.title}
                  onChange={set('title')}
                  required
                  placeholder="e.g. Tuition fee Term 1"
                  maxLength={120}
                />
              </label>
              <label>
                <span>Amount *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={set('amount')}
                  required
                />
              </label>
              <label>
                <span>Due date</span>
                <input type="date" value={form.dueDate} onChange={set('dueDate')} />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Add fee'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'bill' && (
          <form onSubmit={bill} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              Bills every active student in the class for each item in its fee structure. A student already
              billed for an item is skipped, so running it twice never bills twice.
            </p>
            <div className="enq-grid">
              <label className="wide">
                <span>Class *</span>
                <select value={form.classId} onChange={set('classId')} required>
                  <option value="">Choose class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.section}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy || !form.classId}>
                {busy ? 'Billing…' : 'Generate fees'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'pay' && (
          <form onSubmit={pay} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              {popup.fee.title} · balance <b>{money(popup.fee.balance)}</b>
            </p>
            <div className="enq-grid">
              <label>
                <span>Amount *</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={popup.fee.balance}
                  value={form.amount}
                  onChange={set('amount')}
                  required
                />
              </label>
              <label>
                <span>Method</span>
                <select value={form.method} onChange={set('method')}>
                  {methods.map((m) => (
                    <option key={m} value={m}>
                      {m[0].toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Record payment'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'adjust' && (
          <form onSubmit={adjust} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              {popup.fee.studentName} · {popup.fee.title}
            </p>
            <div className="enq-grid">
              <label>
                <span>Amount *</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={set('amount')}
                  required
                />
              </label>
              <label className="wide">
                <span>Reason *</span>
                <input
                  value={form.reason}
                  onChange={set('reason')}
                  required
                  maxLength={200}
                  placeholder={
                    popup.mode === 'discount' ? 'e.g. Scholarship, sibling discount' : 'Reason for the fine'
                  }
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : popup.mode === 'discount' ? 'Give discount' : 'Add fine'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'fines' && (
          <form onSubmit={fines} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              Adds one flat late fee to every overdue fee. Each fee is charged only once.
            </p>
            <div className="enq-grid">
              <label>
                <span>Late fee amount *</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={set('amount')}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="danger" disabled={busy}>
                {busy ? 'Applying…' : 'Apply late fines'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'receipt' && (
          <div className="receipt-body">
            <p>
              Date: <b>{popup.receipt.paidOn}</b> · Method: <b>{popup.receipt.method}</b>
            </p>
            <p>
              Student: <b>{popup.receipt.student.name}</b> ({popup.receipt.student.admissionNo}) · Class{' '}
              {popup.receipt.student.className}
            </p>
            <p>For: {popup.receipt.fee.title}</p>
            <p>
              Amount received: <b>{popup.receipt.amount}</b> · Fee total {popup.receipt.fee.amount} · Balance{' '}
              {popup.receipt.fee.balance}
            </p>
            <div className="form-actions no-print">
              <button type="button" onClick={() => window.print()}>
                Print
              </button>
              <button type="button" className="ghost" onClick={close}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
