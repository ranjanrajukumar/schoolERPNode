import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Leave taken this year by each person against each leave type's yearly limit. `kind` is "staff" or "student". */
export default function LeaveBalances({ kind }) {
  const staff = kind === 'staff';
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState({ types: [], rows: [] });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
    api(`/leave-types/balances?kind=${kind}&year=${year}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [kind, year]);

  const needle = q.trim().toLowerCase();
  const shown = data.rows.filter(
    (r) => !needle || `${r.no} ${r.name} ${r.group ?? ''}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const cell = (t, r) => (t.yearlyDays === null ? `${r.used[t.id]}` : `${r.used[t.id]} / ${t.yearlyDays}`);
  const full = (t, r) => t.yearlyDays !== null && r.used[t.id] >= t.yearlyDays;

  const exportCsv = () => {
    const head = [
      staff ? 'Staff no' : 'Admission no',
      'Name',
      staff ? 'Designation' : 'Class',
      ...data.types.map((t) => t.name),
    ];
    const lines = shown.map((r) =>
      [r.no, r.name, r.group, ...data.types.map((t) => cell(t, r))].map(csvCell).join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}-leave-balance-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{staff ? 'Staff leave balance' : 'Student leave record'}</h1>
          <p className="hint">
            Approved leave days used in the year, against each type&apos;s yearly limit. Limits are set under
            Settings → Leave Types &amp; Approval.
          </p>
        </div>
        <div className="head-actions">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Year"
            style={{ minHeight: 44 }}
          >
            {[0, 1, 2]
              .map((i) => new Date().getFullYear() - i)
              .map((y) => (
                <option key={y}>{y}</option>
              ))}
          </select>
          <button type="button" className="ghost" onClick={exportCsv}>
            ↓ Export
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or number…"
              aria-label="Search"
            />
          </label>
          <span className="showing">
            {shown.length} {staff ? 'staff' : 'students'}
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>{staff ? 'Staff member' : 'Student'}</th>
                {data.types.map((t) => (
                  <th key={t.id}>
                    {t.name}
                    <small className="block">
                      {t.yearlyDays === null ? 'no limit' : `${t.yearlyDays} days`}
                      {t.paid ? '' : ' · unpaid'}
                    </small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b>
                    <small className="block">
                      {r.no}
                      {r.group ? ` · ${r.group}` : ''}
                    </small>
                  </td>
                  {data.types.map((t) => (
                    <td key={t.id}>
                      {full(t, r) ? <span className="badge rejected">● {cell(t, r)}</span> : cell(t, r)}
                    </td>
                  ))}
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={data.types.length + 1} className="empty-row">
                    {needle ? 'No match.' : 'Nothing to show.'}
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
