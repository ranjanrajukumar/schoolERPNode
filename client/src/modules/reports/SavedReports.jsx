import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Pagination from '../../components/Pagination.jsx';
import { api, getToken } from '../../services/api.js';
import { openRun, openTab, printTable, runReport } from './designer/runReport.js';

const PAGE_SIZE = 25;
const NO_FOLDER = 'none';
const STATE = {
  queued: 'Waiting',
  running: 'Building…',
  done: 'Ready',
  failed: 'Failed',
  expired: 'Expired',
};
const kb = (n) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const when = (d) =>
  d
    ? new Date(d).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

/**
 * Saved reports, folder by folder. The page opens on the folders; a folder opens on its own page (?folder=) with only its reports.
 * A report can be run on screen, downloaded as a spreadsheet-ready CSV, or printed. Nobody here can change a design.
 */
export default function SavedReports() {
  const [params, setParams] = useSearchParams();
  const folderParam = params.get('folder');
  const [folders, setFolders] = useState([]);
  const [reports, setReports] = useState(null);
  const [open, setOpen] = useState(null); // the report being shown
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(0);
  const [building, setBuilding] = useState(''); // "id-format" of the designed report being built
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');

  const loadRuns = () =>
    api('/report-designer/runs')
      .then((r) => setRuns(r.runs))
      .catch(() => {});

  useEffect(() => {
    Promise.all([api('/report-designer/folders'), api('/report-designer/templates')])
      .then(([f, t]) => {
        setFolders(f);
        setReports(t);
      })
      .catch((e) => {
        setError(e.message);
        setReports([]);
      });
    loadRuns();
  }, []);

  /** Builds a designed report as PDF or Excel on the server. The PDF tab is opened now, at the click, so the browser does not block it. */
  const build = async (t, format) => {
    setError('');
    const tab = format === 'pdf' ? openTab() : null;
    setBuilding(`${t.id}-${format}`);
    try {
      const run = await runReport(t.id, format);
      await openRun(run, tab);
    } catch (e) {
      tab?.close();
      setError(e.message);
    } finally {
      setBuilding('');
      loadRuns();
    }
  };

  const reopen = async (r) => {
    setError('');
    const tab = r.format === 'pdf' ? openTab() : null;
    try {
      await openRun(r, tab);
    } catch (e) {
      tab?.close();
      setError(e.message);
    }
  };

  const discard = async (r) => {
    try {
      await api(`/report-designer/runs/${r.id}`, { method: 'DELETE' });
      loadRuns();
    } catch (e) {
      setError(e.message);
    }
  };

  // a folder is shown only if this login can run something in it; reports outside any folder form their own group
  const groups = [
    ...folders.map((f) => ({ key: String(f.id), name: f.name, description: f.description, id: f.id })),
    { key: NO_FOLDER, name: 'Not in a folder', description: null, id: null },
  ]
    .map((g) => ({ ...g, items: (reports ?? []).filter((t) => (t.folderId ?? null) === g.id) }))
    .filter((g) => g.items.length);
  const group = groups.find((g) => g.key === folderParam) ?? null;

  const openFolder = (key) => {
    setResult(null);
    setOpen(null);
    setParams(key ? { folder: key } : {});
  };

  const run = async (t) => {
    setError('');
    setBusy(t.id);
    try {
      setResult(await api(`/report-designer/templates/${t.id}/run`, { method: 'POST' }));
      setOpen(t);
      setPage(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(0);
    }
  };

  const csv = async (t) => {
    setError('');
    try {
      const res = await fetch(`/api/report-designer/templates/${t.id}/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not download');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t.name.replace(/[^A-Za-z0-9._-]+/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setError(e.message);
    }
  };

  const rows = result ? result.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{group ? group.name : 'Saved reports'}</h1>
          <p className="hint">
            {group
              ? (group.description ?? 'Run a report, download it or print it.')
              : 'Reports prepared for you, by folder. Open a folder to see its reports.'}
          </p>
        </div>
        {group && (
          <div className="head-actions">
            <button type="button" className="ghost" onClick={() => openFolder(null)}>
              ← All folders
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {reports && !groups.length && (
        <p className="hint">
          No reports have been shared with you yet. An administrator can design them under{' '}
          <Link to="/report-designer">Report Designer</Link>.
        </p>
      )}

      {/* the folders */}
      {!group && groups.length > 0 && (
        <div className="stats enquiry-tiles four">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              className="tile card"
              style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={() => openFolder(g.key)}
            >
              <span className="tile-icon blue" aria-hidden="true">
                🗂️
              </span>
              <span className="tile-text">
                <span>{g.name}</span>
                <b>{g.items.length} report(s)</b>
                {g.description && <small>{g.description}</small>}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* one folder's reports, on their own */}
      {group && (
        <section className="card enquiry-card" style={{ marginBottom: 12 }}>
          <div className="table-scroll">
            <table className="enquiry-table">
              <tbody>
                {group.items.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <b>{t.name}</b>
                      {t.board && <span className="badge applied"> {t.board}</span>}
                      {t.description && <small style={{ display: 'block' }}>{t.description}</small>}
                    </td>
                    <td className="row-actions">
                      {t.kind === 'design' ? (
                        <>
                          <button type="button" disabled={Boolean(building)} onClick={() => build(t, 'pdf')}>
                            {building === `${t.id}-pdf` ? 'Building…' : 'PDF'}
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            disabled={Boolean(building)}
                            onClick={() => build(t, 'xlsx')}
                          >
                            {building === `${t.id}-xlsx` ? 'Building…' : 'Excel'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" disabled={busy === t.id} onClick={() => run(t)}>
                            {busy === t.id ? 'Running…' : 'Run'}
                          </button>
                          <button type="button" className="ghost" onClick={() => csv(t)}>
                            Download CSV
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {folderParam && reports && !group && (
        <p className="hint">
          That folder has no reports you can run.{' '}
          <button type="button" className="link" onClick={() => openFolder(null)}>
            Back to all folders
          </button>
        </p>
      )}

      {group && result && open && (
        <section className="card enquiry-card">
          <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
            <span>
              <h2>{result.title}</h2>
              <small>
                {result.total} row(s)
                {result.truncated && ' — only the first 5,000 are shown'}
              </small>
            </span>
            <button
              type="button"
              className="ghost"
              onClick={() => printTable({ templateId: open.id }).catch((e) => setError(e.message))}
            >
              Print
            </button>
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
                {rows.map((r, i) => (
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

      {/* the reports built for this login, newest first. Files are kept for an hour, then only this record stays. */}
      {runs.length > 0 && (
        <section className="card enquiry-card" style={{ marginTop: 12 }}>
          <header className="card-head" style={{ padding: '18px 22px 8px', marginBottom: 0 }}>
            <span>
              <h2>Recent reports</h2>
              <small>PDF and Excel files you built. A file can be opened again for an hour.</small>
            </span>
          </header>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>File</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Size</th>
                  <th>Built</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 20).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.report}</b>
                      {runs.some((x) => x.by !== r.by) && <small style={{ display: 'block' }}>{r.by}</small>}
                    </td>
                    <td>{r.format === 'pdf' ? 'PDF' : 'Excel'}</td>
                    <td>
                      <span
                        className={`badge ${r.status === 'done' ? 'paid' : r.status === 'failed' ? 'unpaid' : 'partial'}`}
                      >
                        {STATE[r.status]}
                      </span>
                      {r.error && <small style={{ display: 'block' }}>{r.error}</small>}
                    </td>
                    <td>{r.rows ?? '—'}</td>
                    <td>{r.size ? kb(r.size) : '—'}</td>
                    <td>{when(r.requestedAt)}</td>
                    <td className="row-actions">
                      {r.ready && (
                        <>
                          <button type="button" className="ghost" onClick={() => reopen(r)}>
                            Open
                          </button>
                          <button type="button" className="ghost danger" onClick={() => discard(r)}>
                            Delete file
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
