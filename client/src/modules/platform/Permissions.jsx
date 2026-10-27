import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

const MARK = { write: 'Change', read: 'View' };

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** A read-only matrix of what each custom role can reach. Edit a role on the Roles page. */
export default function Permissions() {
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({ modules: [] });
  const [error, setError] = useState('');
  useEffect(() => {
    api('/roles').then(setRoles).catch((e) => setError(e.message));
    api('/roles/modules').then(setMeta).catch(() => {});
  }, []);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Permissions</h1>
          <p className="hint">What each role can reach, by module. Built-in <b>admin</b> can change everything; <b>teacher</b> and <b>accountant</b> keep their built-in access. Change a custom role on the <Link to="/roles">Roles</Link> page.</p>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="★" tone="blue" label="Custom roles" value={roles.length} />
        <Tile icon="▤" tone="violet" label="Modules" value={meta.modules.length} />
      </div>

      <section className="card enquiry-card">
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Module</th><th>admin</th>{roles.map((r) => <th key={r.id}>{r.name}<small className="block">based on {r.baseRole}</small></th>)}</tr></thead>
            <tbody>
              {meta.modules.map((m) => (
                <tr key={m.key}>
                  <td><b>{m.label}</b></td><td>Change</td>
                  {roles.map((r) => <td key={r.id}>{MARK[r.permissions[m.key]] ?? '—'}</td>)}
                </tr>
              ))}
              {!meta.modules.length && <tr><td colSpan={2 + roles.length} className="empty-row">No modules.</td></tr>}
            </tbody>
          </table>
        </div>
        {!roles.length && <p className="hint" style={{ padding: '0 22px 16px' }}>No custom roles yet.</p>}
      </section>
    </>
  );
}
