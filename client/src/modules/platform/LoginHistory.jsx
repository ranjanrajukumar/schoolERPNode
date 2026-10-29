import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';

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

/** Recent sign-in attempts, filterable by role and result. */
export default function LoginHistory() {
  const [rows, setRows] = useState([]);
  const [role, setRole] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams(Object.entries({ role, success }).filter(([, v]) => v));
    api(`/login-activity?${q}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [role, success]);
  useEffect(load, [load]);

  const failed = rows.filter((r) => !r.success).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Login history</h1>
          <p className="hint">
            The latest 300 sign-in attempts, kept for 180 days. Repeated failures for one account can mean
            someone is guessing the password.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={load}>
            ↻ Refresh
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Attempts shown" value={rows.length} />
        <Tile icon="✓" tone="green" label="Signed in" value={rows.length - failed} />
        <Tile icon="×" tone="red" label="Failed" value={failed} />
        <Tile icon="♙" tone="violet" label="Accounts" value={new Set(rows.map((r) => r.email)).size} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar filter-panel">
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All</option>
              {['admin', 'teacher', 'accountant', 'parent', 'student'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Result
            <select value={success} onChange={(e) => setSuccess(e.target.value)}>
              <option value="">All</option>
              <option value="true">Signed in</option>
              <option value="false">Failed</option>
            </select>
          </label>
          <span className="showing">{rows.length} attempts</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Email</th>
                <th>Role</th>
                <th>Result</th>
                <th>Address</th>
                <th>Browser</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{String(r.createdAt).replace('T', ' ').slice(0, 19)}</td>
                  <td>{r.email}</td>
                  <td>{r.role}</td>
                  <td>
                    <span className={`badge ${r.success ? 'paid' : 'rejected'}`}>
                      ● {r.success ? 'signed in' : 'failed'}
                    </span>
                  </td>
                  <td>{r.ip}</td>
                  <td>
                    <small>{r.userAgent}</small>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No sign-ins recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
