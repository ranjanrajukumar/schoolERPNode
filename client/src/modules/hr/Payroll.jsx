import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 10;
const thisMonth = () => new Date().toISOString().slice(0, 7);
const money = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Payroll: set each person's terms once, generate the month's payslips, then an admin approves each payment. */
export default function Payroll() {
  const canApprove = useAuth().user?.role === 'admin';
  const [month, setMonth] = useState(thisMonth());
  const [salaries, setSalaries] = useState([]);
  const [slips, setSlips] = useState([]);
  const [tab, setTab] = useState('slips');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('/payroll/salaries').then(setSalaries).catch((e) => setError(e.message));
    api(`/payroll/payslips?month=${month}`).then(setSlips).catch((e) => setError(e.message));
  }, [month]);
  useEffect(() => { setPage(1); load(); }, [load]);

  const run = async (fn, message) => {
    setBusy(true); setError(''); setNotice('');
    try { const r = await fn(); if (message) setNotice(typeof message === 'function' ? message(r) : message); load(); return true; } catch (err) { setError(err.message); return false; } finally { setBusy(false); }
  };
  const saveSalary = async (e) => {
    e.preventDefault();
    const { staffId, basic, allowances, deductions } = edit;
    if (await run(() => api(`/payroll/salaries/${staffId}`, { method: 'PUT', body: { basic, allowances, deductions } }), 'Salary terms saved.')) setEdit(null);
  };
  const generate = () => run(() => api('/payroll/generate', { method: 'POST', body: { month } }), (r) => `${r.created} payslip(s) created, ${r.skipped} already existed.`);

  const total = slips.reduce((n, s) => n + Number(s.net), 0);
  const paid = slips.filter((s) => s.status === 'paid');
  const draft = slips.filter((s) => s.status === 'draft');
  const needle = q.trim().toLowerCase();
  const list = tab === 'slips'
    ? slips.filter((p) => !needle || `${p.staffName} ${p.staffNo}`.toLowerCase().includes(needle))
    : salaries.filter((s) => !needle || `${s.name} ${s.staffNo}`.toLowerCase().includes(needle));
  const pageRows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = list.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const withoutSalary = salaries.filter((s) => s.basic === null).length;

  const exportCsv = () => {
    const rows = tab === 'slips'
      ? [['Staff no', 'Staff', 'Basic', 'Allowances', 'Deductions', 'Net', 'Status', 'Paid on'], ...list.map((p) => [p.staffNo, p.staffName, p.basic, p.allowances, p.deductions, p.net, p.status, p.paidOn])]
      : [['Staff no', 'Name', 'Basic', 'Allowances', 'Deductions'], ...list.map((s) => [s.staffNo, s.name, s.basic, s.allowances, s.deductions])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = tab === 'slips' ? `payslips-${month}.csv` : 'salary-terms.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Payroll</h1>
          <p className="hint">Set each person&apos;s salary terms once, generate the month&apos;s payslips, then an admin approves each payment.{!canApprove && ' (Payments are approved by an admin.)'}</p>
        </div>
        <div className="head-actions">
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" style={{ minHeight: 44 }} />
          <button type="button" className="ghost" onClick={exportCsv}>↓ Export</button>
          <button type="button" className="big-action" onClick={generate} disabled={busy}>Generate payslips</button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !edit && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♧" tone="blue" label="Staff on payroll" value={salaries.length} hint={withoutSalary ? `${withoutSalary} without salary terms` : 'All have salary terms'} />
        <Tile icon="▣" tone="violet" label={`Net payroll · ${monthLabel(month)}`} value={money(total)} hint={`${slips.length} payslip${slips.length === 1 ? '' : 's'}`} />
        <Tile icon="✓" tone="green" label="Paid" value={paid.length} hint={paid.length ? money(paid.reduce((n, s) => n + Number(s.net), 0)) : null} />
        <Tile icon="◷" tone="amber" label="Waiting for approval" value={draft.length} hint={draft.length ? money(draft.reduce((n, s) => n + Number(s.net), 0)) : null} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'slips'} className={tab === 'slips' ? 'on' : ''} onClick={() => { setTab('slips'); setQ(''); setPage(1); }}>Payslips<span className="count">{slips.length}</span></button>
          <button type="button" role="tab" aria-selected={tab === 'terms'} className={tab === 'terms' ? 'on' : ''} onClick={() => { setTab('terms'); setQ(''); setPage(1); }}>Salary terms<span className="count">{salaries.length}</span></button>
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search staff name or number…" aria-label="Search staff" /></label>
          <span className="showing">Showing <b>{from}–{Math.min(page * PAGE_SIZE, list.length)}</b> of <b>{list.length}</b></span>
        </div>
        <div className="table-scroll">
          {tab === 'slips' ? (
            <table className="enquiry-table">
              <thead><tr><th>Staff</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net</th><th>Status</th><th /></tr></thead>
              <tbody>
                {pageRows.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.staffName}</b><small className="block">{p.staffNo}</small></td>
                    <td>{money(p.basic)}</td><td>{money(p.allowances)}</td><td>{money(p.deductions)}</td><td><b>{money(p.net)}</b></td>
                    <td><span className={`badge ${p.status === 'paid' ? 'paid' : 'partial'}`}>● {p.status === 'paid' ? 'Paid' : 'Draft'}</span>{p.paidOn && <small className="block">{date(p.paidOn)}{p.paidByName && ` · by ${p.paidByName}`}</small>}</td>
                    <td className="row-actions">
                      {p.status === 'draft' && canApprove && <button type="button" disabled={busy} onClick={() => run(() => api(`/payroll/payslips/${p.id}/pay`, { method: 'POST' }), 'Marked as paid.')}>Approve &amp; pay</button>}
                      {p.status === 'draft' && <button type="button" className="ghost danger" disabled={busy} onClick={() => run(() => api(`/payroll/payslips/${p.id}`, { method: 'DELETE' }), 'Payslip deleted.')}>Delete</button>}
                    </td>
                  </tr>
                ))}
                {!pageRows.length && <tr><td colSpan={7} className="empty-row">{needle ? 'No payslips match.' : `No payslips for ${monthLabel(month)}. Use “Generate payslips”.`}</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="enquiry-table">
              <thead><tr><th>Staff</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th /></tr></thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr key={s.staffId}>
                    <td><b>{s.name}</b><small className="block">{s.staffNo}</small></td>
                    <td>{s.basic === null ? <span className="badge partial">Not set</span> : money(s.basic)}</td><td>{s.allowances === null ? '—' : money(s.allowances)}</td><td>{s.deductions === null ? '—' : money(s.deductions)}</td>
                    <td className="row-actions"><button type="button" className={s.basic === null ? '' : 'ghost'} onClick={() => { setError(''); setEdit({ ...s, basic: s.basic ?? '', allowances: s.allowances ?? 0, deductions: s.deductions ?? 0 }); }}>{s.basic === null ? 'Set salary' : 'Edit'}</button></td>
                  </tr>
                ))}
                {!pageRows.length && <tr><td colSpan={5} className="empty-row">{needle ? 'No staff match.' : 'No active staff.'}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={list.length} onChange={setPage} />
      </section>

      <Modal open={Boolean(edit)} title={edit ? `Salary terms: ${edit.name}` : ''} wide={false} onClose={() => setEdit(null)}>
        {edit && (
          <form onSubmit={saveSalary} className="enquiry-form">
            {error && <p className="error" role="alert">{error}</p>}
            <div className="enq-grid">
              {['basic', 'allowances', 'deductions'].map((k) => (
                <label key={k}><span>{k[0].toUpperCase() + k.slice(1)}{k === 'basic' && ' *'}</span>
                  <input type="number" min="0" step="0.01" required={k === 'basic'} value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="ghost" onClick={() => setEdit(null)}>Cancel</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
