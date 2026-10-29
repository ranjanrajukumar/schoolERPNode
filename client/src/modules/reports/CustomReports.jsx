import { useEffect, useState } from 'react';
import { api, getToken } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const OPS = [
  ['contains', 'contains'],
  ['equals', 'is'],
  ['not_equals', 'is not'],
  ['greater', 'is greater than'],
  ['less', 'is less than'],
  ['empty', 'is empty'],
  ['not_empty', 'is not empty'],
];
const NEEDS_VALUE = (op) => !['empty', 'not_empty'].includes(op);

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

/** Build a report from a dataset: pick columns, filters and sort, run it on screen or download it as CSV. */
export default function CustomReports() {
  const [datasets, setDatasets] = useState([]);
  const [dataset, setDataset] = useState('');
  const [columns, setColumns] = useState([]);
  const [filters, setFilters] = useState([]);
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/data/datasets')
      .then(setDatasets)
      .catch((e) => setError(e.message));
  }, []);
  const current = datasets.find((d) => d.key === dataset);

  const choose = (key) => {
    const d = datasets.find((x) => x.key === key);
    setDataset(key);
    setColumns(d ? d.columns : []);
    setFilters([]);
    setSortBy('');
    setResult(null);
    setPage(1);
  };
  const request = () => ({
    dataset,
    columns,
    filters: filters.filter((f) => f.column),
    sortBy: sortBy || undefined,
    sortDir,
  });
  const toggle = (c) =>
    setColumns(
      columns.includes(c)
        ? columns.filter((x) => x !== c)
        : current.columns.filter((x) => columns.includes(x) || x === c),
    );
  const setFilter = (i, patch) => setFilters(filters.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  const run = async () => {
    setError('');
    setBusy(true);
    try {
      setResult(await api('/data/report', { method: 'POST', body: request() }));
      setPage(1);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };
  const csv = async () => {
    setError('');
    try {
      const res = await fetch('/api/data/report/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(request()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not download');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${dataset}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err.message);
    }
  };

  const pageRows = result ? result.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Custom reports</h1>
          <p className="hint">
            Pick a dataset, the columns to show and any filters, then run the report or download it as CSV. Up
            to 5,000 rows are shown.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" disabled={!current || !columns.length} onClick={csv}>
            ↓ Download CSV
          </button>
          <button
            type="button"
            className="big-action"
            disabled={busy || !current || !columns.length}
            onClick={run}
          >
            {busy ? 'Running…' : 'Run report'}
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Datasets available" value={datasets.length} hint={current?.label} />
        <Tile
          icon="≡"
          tone="violet"
          label="Columns shown"
          value={current ? columns.length : '—'}
          hint={current ? `of ${current.columns.length}` : null}
        />
        <Tile icon="⌕" tone="amber" label="Filters" value={filters.filter((f) => f.column).length} />
        <Tile
          icon="▣"
          tone="green"
          label="Rows in last run"
          value={result ? result.total : '—'}
          hint={result?.truncated ? 'first 5,000 shown' : null}
        />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
          <span>
            <h2>Report setup</h2>
            <small>Dataset, columns, filters and order</small>
          </span>
        </header>
        <div className="enquiry-form" style={{ padding: '0 22px 22px' }}>
          <div className="enq-grid">
            <label className="wide">
              <span>Dataset</span>
              <select value={dataset} onChange={(e) => choose(e.target.value)}>
                <option value="">-- choose --</option>
                {datasets.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            {current && (
              <>
                <label className="wide">
                  <span>Columns</span>
                  <span className="check-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
                    {current.columns.map((c) => (
                      <label key={c}>
                        <input type="checkbox" checked={columns.includes(c)} onChange={() => toggle(c)} /> {c}
                      </label>
                    ))}
                  </span>
                </label>
                <div className="wide" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                    }}
                  >
                    Filters
                  </span>
                  {filters.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        value={f.column}
                        onChange={(e) => setFilter(i, { column: e.target.value })}
                        aria-label="Filter column"
                      >
                        <option value="">-- column --</option>
                        {current.columns.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <select
                        value={f.op}
                        onChange={(e) => setFilter(i, { op: e.target.value })}
                        aria-label="Filter operator"
                      >
                        {OPS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                      {NEEDS_VALUE(f.op) && (
                        <input
                          value={f.value ?? ''}
                          onChange={(e) => setFilter(i, { value: e.target.value })}
                          aria-label="Filter value"
                        />
                      )}
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setFilters(filters.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setFilters([...filters, { column: '', op: 'contains', value: '' }])}
                    >
                      + Add filter
                    </button>
                  </div>
                </div>
                <label>
                  <span>Sort by</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="">--</option>
                    {current.columns.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Order</span>
                  <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </label>
              </>
            )}
          </div>
        </div>
      </section>

      {result && (
        <section className="card enquiry-card">
          <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
            <span>
              <h2>Results</h2>
              <small>
                {result.total} row(s)
                {result.truncated &&
                  ' — showing the first 5,000; download the CSV for the same limit, so narrow the filters'}
              </small>
            </span>
          </header>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  {result.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={i}>
                    {result.columns.map((c) => (
                      <td key={c}>{String(r[c])}</td>
                    ))}
                  </tr>
                ))}
                {!result.rows.length && (
                  <tr>
                    <td colSpan={result.columns.length} className="empty-row">
                      No rows match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={result.rows.length} onChange={setPage} />
        </section>
      )}
    </>
  );
}
