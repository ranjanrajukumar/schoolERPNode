import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { refreshWebMenu } from '../../hooks/useWebMenu.js';
import { refreshRights } from '../../hooks/useRights.js';

const ROLES = [
  ['teacher', 'Teacher'],
  ['accountant', 'Accountant'],
  ['parent', 'Parent'],
  ['student', 'Student'],
];
const ACTION_LABEL = {
  view: 'View',
  create: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve / reject',
  export: 'Export',
};

/**
 * Role Rights: pick a role, then for every module choose whether it shows in the menu and which buttons the role gets (add, edit, delete,
 * approve, export). The menu part is stored in app_menu_items, the buttons in role_rights. The server enforces both.
 */
export default function RoleRights() {
  const [role, setRole] = useState('teacher');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    api(`/role-rights?role=${role}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [role]);
  useEffect(() => {
    setData(null);
    setError('');
    setNotice('');
    load();
  }, [load]);

  const save = async (module, patch) => {
    setError('');
    setNotice('');
    setBusy(module.key);
    try {
      await api('/role-rights', { method: 'PUT', body: { role, module: module.key, ...patch } });
      refreshWebMenu();
      refreshRights();
      setNotice(`Saved for ${module.label}.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Role rights</h1>
          <p className="hint">
            For each role, choose which menus it sees and which buttons it gets: view, add, edit, delete,
            approve and export. <b>Admin</b> always has everything. The menu part is stored in{' '}
            <code>app_menu_items</code>, the buttons in <code>role_rights</code>.
          </p>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {ROLES.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={role === k}
              className={role === k ? 'on' : ''}
              onClick={() => setRole(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Show in menu</th>
                {(data?.actions ?? []).map((a) => (
                  <th key={a}>{ACTION_LABEL[a]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.modules ?? []).map((m) => (
                <tr key={m.key} style={{ opacity: m.inMenu ? 1 : 0.6 }}>
                  <td>
                    <b>{m.label}</b>
                    <small className="block">{m.key}</small>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={m.inMenu}
                      disabled={busy === m.key}
                      aria-label={`Show ${m.label} in the menu`}
                      onChange={(e) => save(m, { menu: e.target.checked })}
                    />
                  </td>
                  {data.actions.map((a) => (
                    <td key={a}>
                      <input
                        type="checkbox"
                        checked={m.rights[a]}
                        disabled={busy === m.key}
                        aria-label={`${ACTION_LABEL[a]} in ${m.label}`}
                        onChange={(e) => save(m, { [a]: e.target.checked })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {!data && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="hint" style={{ marginTop: 12 }}>
        A button you switch off disappears for that role and the server refuses the request too. Switching off
        View hides the data itself, which can also empty drop-downs on other pages that read from the module.
      </p>
    </>
  );
}
