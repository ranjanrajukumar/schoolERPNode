import { useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api, getToken } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';
import Modal from '../../components/Modal.jsx';
import { printTable } from './designer/runReport.js';

const PAGE_SIZE = 25;
const OPS = [
  ['contains', 'contains'],
  ['equals', 'is'],
  ['not_equals', 'is not'],
  ['greater', 'is greater than'],
  ['less', 'is less than'],
  ['empty', 'is empty'],
  ['not_empty', 'is not empty'],
  ['on_or_after', 'is on or after'],
  ['on_or_before', 'is on or before'],
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
  const [title, setTitle] = useState('');
  const [dateColumn, setDateColumn] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [folders, setFolders] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loadedId, setLoadedId] = useState('');
  const [roleChoices, setRoleChoices] = useState(['teacher', 'accountant']);
  const [saving, setSaving] = useState(null); // the "Save as report" popup: { name, folderId, description, roles }
  const [managing, setManaging] = useState(false); // the folders popup
  const [folderName, setFolderName] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api('/data/datasets')
      .then(setDatasets)
      .catch((e) => setError(e.message));
  }, []);
  const loadSaved = () => {
    api('/report-designer/folders')
      .then(setFolders)
      .catch(() => {});
    api('/report-designer/templates')
      .then(setSaved)
      .catch(() => {});
  };
  useEffect(() => {
    loadSaved();
    api('/roles')
      .then((r) => setRoleChoices(['teacher', 'accountant', ...(r.roles ?? r).map((x) => x.name)]))
      .catch(() => {});
  }, []);
  const current = datasets.find((d) => d.key === dataset);

  const choose = (key) => {
    const d = datasets.find((x) => x.key === key);
    setDataset(key);
    setColumns(d ? d.columns : []);
    setFilters([]);
    setSortBy('');
    setDateColumn('');
    setDateFrom('');
    setDateTo('');
    setLoadedId('');
    setResult(null);
    setPage(1);
  };
  const withDates = () => [
    ...filters.filter((f) => f.column),
    ...(dateColumn && dateFrom ? [{ column: dateColumn, op: 'on_or_after', value: dateFrom }] : []),
    ...(dateColumn && dateTo ? [{ column: dateColumn, op: 'on_or_before', value: dateTo }] : []),
  ];
  const request = () => ({
    dataset,
    columns,
    filters: withDates(),
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

  const design = () => ({
    dataset,
    columns,
    filters: filters.filter((f) => f.column),
    sortBy,
    sortDir,
    dateColumn,
    dateFrom,
    dateTo,
    title,
  });

  const openSave = () => {
    const t = saved.find((x) => String(x.id) === String(loadedId));
    setError('');
    setSaving({
      name: t?.name ?? '',
      folderId: t?.folderId ?? '',
      description: t?.description ?? '',
      roles: t?.roles ?? [],
    });
  };

  const saveReport = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { ...saving, config: design() };
      const r = loadedId
        ? await api(`/report-designer/templates/${loadedId}`, { method: 'PUT', body })
        : await api('/report-designer/templates', { method: 'POST', body });
      setLoadedId(String(r.id));
      setNotice(`Saved “${saving.name}”.`);
      setSaving(null);
      loadSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const loadReport = (id) => {
    setLoadedId(id);
    setResult(null);
    const t = saved.find((x) => String(x.id) === String(id));
    if (!t) return;
    const c = t.config;
    setDataset(c.dataset);
    setColumns(c.columns?.length ? c.columns : (datasets.find((d) => d.key === c.dataset)?.columns ?? []));
    setFilters(c.filters ?? []);
    setSortBy(c.sortBy ?? '');
    setSortDir(c.sortDir ?? 'asc');
    setDateColumn(c.dateColumn ?? '');
    setDateFrom(c.dateFrom ?? '');
    setDateTo(c.dateTo ?? '');
    setTitle(c.title ?? '');
  };

  const deleteReport = async () => {
    const t = saved.find((x) => String(x.id) === String(loadedId));
    if (!t || !window.confirm(`Delete the saved report “${t.name}”?`)) return;
    try {
      await api(`/report-designer/templates/${t.id}`, { method: 'DELETE' });
      setLoadedId('');
      setNotice(`Deleted “${t.name}”.`);
      loadSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  const folderCall = async (fn, done) => {
    setError('');
    try {
      await fn();
      setNotice(done);
      setFolderName('');
      loadSaved();
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
          <select
            value={loadedId}
            onChange={(e) => (e.target.value ? loadReport(e.target.value) : setLoadedId(''))}
            aria-label="Saved report"
            style={{ minHeight: 44 }}
          >
            <option value="">-- saved reports --</option>
            {[...folders.map((f) => [f.id, f.name]), ['', 'Not in a folder']].map(([fid, fname]) => {
              const inFolder = saved.filter((t) => String(t.folderId ?? '') === String(fid));
              return inFolder.length ? (
                <optgroup key={fname} label={fname}>
                  {inFolder.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
          <button type="button" className="ghost" onClick={() => setManaging(true)}>
            Folders
          </button>
          <button type="button" className="ghost" disabled={!current || !columns.length} onClick={openSave}>
            {loadedId ? 'Save changes' : 'Save as report'}
          </button>
          {loadedId && (
            <button type="button" className="ghost danger" onClick={deleteReport}>
              Delete
            </button>
          )}
          <button
            type="button"
            className="ghost"
            disabled={!current || !columns.length}
            onClick={() => {
              setError('');
              printTable({ request: request(), title }).catch((e) => setError(e.message));
            }}
          >
            Print
          </button>
          <Gate action="export">
            <button type="button" className="ghost" disabled={!current || !columns.length} onClick={csv}>
              ↓ Download CSV
            </button>
          </Gate>
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
      {notice && <p className="success">{notice}</p>}
      {error && !saving && !managing && (
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
                      <Gate action="delete">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setFilters(filters.filter((_, j) => j !== i))}
                        >
                          Remove
                        </button>
                      </Gate>
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
                <label className="wide">
                  <span>Report title (printed above the table)</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
                </label>
                <label>
                  <span>Dates apply to</span>
                  <select value={dateColumn} onChange={(e) => setDateColumn(e.target.value)}>
                    <option value="">-- no date range --</option>
                    {current.columns.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    disabled={!dateColumn}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="date"
                    value={dateTo}
                    disabled={!dateColumn}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
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
              <h2>{title || 'Results'}</h2>
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

      <Modal
        open={Boolean(saving)}
        title={loadedId ? 'Save changes to the report' : 'Save as a report'}
        onClose={() => setSaving(null)}
      >
        {saving && (
          <form onSubmit={saveReport} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <label>
              <span>Report name *</span>
              <input
                value={saving.name}
                onChange={(e) => setSaving({ ...saving, name: e.target.value })}
                required
                maxLength={120}
              />
            </label>
            <label>
              <span>Folder</span>
              <select
                value={saving.folderId}
                onChange={(e) => setSaving({ ...saving, folderId: e.target.value })}
              >
                <option value="">Not in a folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Description</span>
              <input
                value={saving.description}
                onChange={(e) => setSaving({ ...saving, description: e.target.value })}
                maxLength={255}
              />
            </label>
            <fieldset>
              <legend>Who else may run this report</legend>
              <p className="hint">
                The administrator always can. Anyone else can only run and export it, not change it.
              </p>
              <span className="check-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
                {roleChoices.map((r) => (
                  <label key={r}>
                    <input
                      type="checkbox"
                      checked={saving.roles.includes(r)}
                      onChange={(e) =>
                        setSaving({
                          ...saving,
                          roles: e.target.checked
                            ? [...saving.roles, r]
                            : saving.roles.filter((x) => x !== r),
                        })
                      }
                    />{' '}
                    {r}
                  </label>
                ))}
              </span>
            </fieldset>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="ghost" onClick={() => setSaving(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={managing} title="Report folders" wide={false} onClose={() => setManaging(false)}>
        <div className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="hint">Folders group saved reports. A folder with reports in it cannot be deleted.</p>
          {folders.map((f) => (
            <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <b style={{ flex: 1 }}>
                {f.name} <small>({f.reports})</small>
              </b>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  const name = window.prompt('Rename the folder', f.name);
                  if (name)
                    folderCall(
                      () => api(`/report-designer/folders/${f.id}`, { method: 'PUT', body: { name } }),
                      'Folder renamed.',
                    );
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="ghost danger"
                onClick={() =>
                  folderCall(
                    () => api(`/report-designer/folders/${f.id}`, { method: 'DELETE' }),
                    'Folder deleted.',
                  )
                }
              >
                Delete
              </button>
            </div>
          ))}
          {!folders.length && <p className="hint">No folders yet.</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="New folder name"
              maxLength={80}
              aria-label="New folder name"
            />
            <button
              type="button"
              disabled={!folderName.trim()}
              onClick={() =>
                folderCall(
                  () => api('/report-designer/folders', { method: 'POST', body: { name: folderName } }),
                  'Folder created.',
                )
              }
            >
              Add folder
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
