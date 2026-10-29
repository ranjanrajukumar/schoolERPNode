import { Fragment, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;

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

/** Who did what: every successful change and download, filterable and paged by the server. */
export default function AuditLog() {
  const [data, setData] = useState({ rows: [], total: 0 });
  const [resources, setResources] = useState([]);
  const [f, setF] = useState({ resource: '', method: '', from: '', to: '', q: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/audit/resources')
      .then(setResources)
      .catch(() => {});
  }, []);
  // Text search waits for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setF((x) => ({ ...x, q }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const params = new URLSearchParams({ page, pageSize: PAGE_SIZE });
    Object.entries(f).forEach(([k, v]) => v && params.set(k, v));
    api(`/audit?${params}`)
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [page, f]);
  const setFilter = (key) => (e) => {
    setF({ ...f, [key]: e.target.value });
    setPage(1);
  };

  const onPage = (m) => data.rows.filter((r) => r.method === m).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Audit log</h1>
          <p className="hint">
            Every successful create, change and delete, plus downloads of full backups and CSV exports, with
            who did it. Passwords are never stored.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Matching entries" value={data.total} />
        <Tile icon="+" tone="green" label="Created / done (this page)" value={onPage('POST')} />
        <Tile icon="✎" tone="amber" label="Changed (this page)" value={onPage('PUT')} />
        <Tile icon="×" tone="red" label="Deleted (this page)" value={onPage('DELETE')} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar filter-panel">
          <label>
            Search
            <input placeholder="Person, path or detail" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label>
            Area
            <select value={f.resource} onChange={setFilter('resource')}>
              <option value="">All</option>
              {resources.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Action
            <select value={f.method} onChange={setFilter('method')}>
              <option value="">All</option>
              <option value="POST">Created / done</option>
              <option value="PUT">Changed</option>
              <option value="DELETE">Deleted</option>
              <option value="GET">Downloaded</option>
            </select>
          </label>
          <label>
            From
            <input type="date" value={f.from} onChange={setFilter('from')} />
          </label>
          <label>
            To
            <input type="date" value={f.to} onChange={setFilter('to')} />
          </label>
          <span className="showing">{data.total} entries</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Path</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td>{String(r.createdAt).replace('T', ' ').slice(0, 19)}</td>
                    <td>
                      <b>{r.userName}</b>
                      <small className="block">{r.role}</small>
                    </td>
                    <td>
                      <span
                        className={`badge ${r.method === 'DELETE' ? 'rejected' : r.method === 'GET' ? 'partial' : 'paid'}`}
                      >
                        ● {r.method === 'GET' ? 'DOWNLOAD' : r.method}
                      </span>
                    </td>
                    <td>{r.path}</td>
                    <td className="row-actions">
                      {r.details && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setOpen(open === r.id ? null : r.id)}
                        >
                          {open === r.id ? 'Hide' : 'Details'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {open === r.id && (
                    <tr>
                      <td colSpan={5}>
                        <code>{r.details}</code>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!data.rows.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
      </section>
    </>
  );
}
