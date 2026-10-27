import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { loadPublicSettings } from '../../services/settings.js';
import Pagination from '../../components/Pagination.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 10;
const iso = (d) => localDate(d);
const monthStart = () => { const d = new Date(); d.setDate(1); return iso(d); };
const money = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const download = (name, rows) => {
  const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

function Range({ range, setRange, classes }) {
  return (
    <div className="toolbar">
      <label className="range-field"><span>From</span><input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
      <label className="range-field"><span>To</span><input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
      {classes && <label className="range-field"><span>Class</span><select value={range.classId} onChange={(e) => setRange({ ...range, classId: e.target.value })}><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.section}</option>)}</select></label>}
    </div>
  );
}

/** Attendance by student for a date range, flagging those below the school's minimum. */
function AttendanceReport({ classes, register }) {
  const [range, setRange] = useState({ from: monthStart(), to: iso(new Date()), classId: '' });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [minPercent, setMinPercent] = useState(75);
  useEffect(() => { loadPublicSettings().then((s) => setMinPercent(s.attendanceMinPercent)); }, []);
  useEffect(() => {
    setPage(1);
    api(`/reports/attendance?${new URLSearchParams(Object.entries(range).filter(([, v]) => v))}`).then(setRows).catch((e) => setError(e.message));
  }, [range]);

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => !needle || `${r.name} ${r.admissionNo} ${r.className ?? ''}`.toLowerCase().includes(needle));
  const low = rows.filter((r) => r.percentage !== null && r.percentage < minPercent);
  const measured = rows.filter((r) => r.percentage !== null);
  const average = measured.length ? measured.reduce((n, r) => n + r.percentage, 0) / measured.length : null;
  useEffect(() => register(() => download('attendance-report.csv', [['Admission no', 'Student', 'Class', 'Present', 'Late', 'Absent', 'Attendance %'], ...shown.map((r) => [r.admissionNo, r.name, r.className, r.present, r.late, r.absent, r.percentage])])));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Students" value={rows.length} />
        <Tile icon="✓" tone="green" label="Average attendance" value={average === null ? '—' : `${average.toFixed(1)}%`} />
        <Tile icon="!" tone="red" label={`Below ${minPercent}%`} value={low.length} hint={low.length ? 'Need a conversation' : 'Everyone is above'} />
        <Tile icon="◷" tone="amber" label="Days covered" value={Math.max(1, Math.round((new Date(range.to) - new Date(range.from)) / 86400000) + 1)} />
      </div>
      <section className="card enquiry-card">
        <Range range={range} setRange={setRange} classes={classes} />
        <div className="toolbar" style={{ paddingTop: 0 }}>
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student or class…" aria-label="Search" /></label>
          <span className="showing">{shown.length} students</span>
        </div>
        {error && <p className="error" style={{ margin: '0 22px' }}>{error}</p>}
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Student</th><th>Class</th><th>Present</th><th>Late</th><th>Absent</th><th>Attendance</th></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.studentId}>
                  <td><b>{r.name}</b><small className="block">{r.admissionNo}</small></td><td>{r.className ?? '—'}</td>
                  <td>{r.present}</td><td>{r.late}</td><td>{r.absent}</td>
                  <td>{r.percentage === null ? '—' : <span className={`badge ${r.percentage < minPercent ? 'rejected' : 'paid'}`}>● {r.percentage}%</span>}</td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={6} className="empty-row">No attendance in this range.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
      <p className="hint">Red means below {minPercent}% attendance (set under Settings).</p>
    </>
  );
}

/** Income and expenses and the money collected, for a date range. */
function MoneyReport({ register }) {
  const [range, setRange] = useState({ from: monthStart(), to: iso(new Date()) });
  const [pnl, setPnl] = useState(null);
  const [collection, setCollection] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const qs = new URLSearchParams(range);
    api(`/reports/finance?${qs}`).then(setPnl).catch((e) => setError(e.message));
    api(`/reports/collection?${qs}`).then(setCollection).catch(() => {});
  }, [range]);
  useEffect(() => register(() => pnl && download('income-and-expenses.csv', [['Item', 'Amount'], ['Fee collection (net of refunds)', pnl.feeCollection], ['Other income', pnl.otherIncome], ['Expenses', pnl.totalExpenses], ['Net', pnl.net], ...pnl.expensesByCategory.map((c) => [`Expense: ${c.category}`, c.total])])));

  return (
    <>
      <div className="stats enquiry-tiles four">
        <Tile icon="▣" tone="green" label="Fee collection" value={pnl ? money(pnl.feeCollection) : '…'} hint="net of refunds" />
        <Tile icon="＋" tone="blue" label="Other income" value={pnl ? money(pnl.otherIncome) : '…'} />
        <Tile icon="−" tone="amber" label="Expenses" value={pnl ? money(pnl.totalExpenses) : '…'} />
        <Tile icon="=" tone={pnl && Number(pnl.net) < 0 ? 'red' : 'violet'} label="Net" value={pnl ? money(pnl.net) : '…'} hint={pnl && Number(pnl.net) < 0 ? 'Spending is above income' : null} />
      </div>
      <section className="card enquiry-card">
        <Range range={range} setRange={setRange} />
        {error && <p className="error" style={{ margin: '0 22px' }}>{error}</p>}
        <div className="two-tables">
          <div>
            <h3>Collected by method</h3>
            <table className="enquiry-table">
              <thead><tr><th>Method</th><th>Payments</th><th>Total</th></tr></thead>
              <tbody>
                {collection?.byMethod.map((m) => <tr key={m.method}><td style={{ textTransform: 'capitalize' }}>{m.method}</td><td>{m.count}</td><td>{money(m.total)}</td></tr>)}
                {collection && !collection.byMethod.length && <tr><td colSpan={3} className="empty-row">No payments in this range.</td></tr>}
                {collection?.byMethod.length > 0 && <tr><td><b>Total</b></td><td /><td><b>{money(collection.total)}</b></td></tr>}
              </tbody>
            </table>
          </div>
          <div>
            <h3>Expenses by category</h3>
            <table className="enquiry-table">
              <thead><tr><th>Category</th><th>Total</th></tr></thead>
              <tbody>
                {pnl?.expensesByCategory.map((c) => <tr key={c.category}><td>{c.category}</td><td>{money(c.total)}</td></tr>)}
                {pnl && !pnl.expensesByCategory.length && <tr><td colSpan={2} className="empty-row">No expenses in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

/** Students with overdue fees. */
function DefaultersReport({ register }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  useEffect(() => { api('/reports/fee-defaulters').then(setRows).catch(() => {}); }, []);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => !needle || `${r.studentName} ${r.admissionNo}`.toLowerCase().includes(needle));
  useEffect(() => register(() => download('fee-defaulters.csv', [['Admission no', 'Student', 'Overdue items', 'Overdue balance'], ...shown.map((d) => [d.admissionNo, d.studentName, d.items, d.balance])])));
  const owed = rows.reduce((n, r) => n + Number(r.balance), 0);
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="red" label="Students with overdue fees" value={rows.length} />
        <Tile icon="▣" tone="amber" label="Overdue balance" value={money(owed)} />
        <Tile icon="≡" tone="blue" label="Overdue items" value={rows.reduce((n, r) => n + Number(r.items), 0)} />
      </div>
      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student or ID…" aria-label="Search" /></label>
          <span className="showing">{shown.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Student</th><th>Overdue items</th><th>Overdue balance</th></tr></thead>
            <tbody>
              {pageRows.map((d) => <tr key={d.studentId}><td><b>{d.studentName}</b><small className="block">{d.admissionNo}</small></td><td>{d.items}</td><td><b>{money(d.balance)}</b></td></tr>)}
              {!pageRows.length && <tr><td colSpan={3} className="empty-row">No overdue fees.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}

/** Reports: attendance for everyone, money reports for admins and accountants. Export downloads the report on screen. */
export default function Reports() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [tab, setTab] = useState('attendance');
  const exporter = useRef(null);
  useEffect(() => { api('/classes').then(setClasses).catch(() => {}); }, []);
  const seesFinance = ['admin', 'accountant'].includes(user?.role);
  const tabs = [['attendance', 'Attendance'], ...(seesFinance ? [['money', 'Income & expenses'], ['defaulters', 'Fee defaulters']] : [])];
  // each report hands its export function up, so the one Export button always matches the tab
  const register = (fn) => { exporter.current = fn; return undefined; };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Reports</h1>
          <p className="hint">Attendance and money reports for any date range.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={() => exporter.current?.()}>↓ Export</button>
        </div>
      </div>
      <div className="tabs-line report-tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); exporter.current = null; }}>{l}</button>)}
      </div>
      {tab === 'attendance' && <AttendanceReport classes={classes} register={register} />}
      {tab === 'money' && seesFinance && <MoneyReport register={register} />}
      {tab === 'defaulters' && seesFinance && <DefaultersReport register={register} />}
    </>
  );
}
