import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const ROLES = ['admin', 'teacher', 'accountant'];
const EMPTY = { name: '', email: '', password: '', choice: 'teacher', staffId: '' };
const TABS = [
  ['all', 'All users'],
  ['admin', 'Admins'],
  ['teacher', 'Teachers'],
  ['accountant', 'Accountants'],
  ['unlinked', 'Not linked to staff'],
];

/** One dropdown value covers both kinds: a built-in role name, or `custom:<id>`. */
const toBody = (choice) =>
  String(choice).startsWith('custom:') ? { roleId: Number(choice.slice(7)) } : { role: choice, roleId: null };

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

/** Staff logins: role, link to a staff member, password reset and removal. */
export default function Users() {
  const [rows, setRows] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bulk, setBulk] = useState(null); // the result of "Create teacher logins": shown once, because the passwords are not stored
  const [bulkBusy, setBulkBusy] = useState(false);

  const createTeacherLogins = async () => {
    setError('');
    setBulkBusy(true);
    try {
      setBulk(await api('/users/teacher-logins', { method: 'POST', body: {} }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkBusy(false);
    }
  };
  const printLogins = () => {
    const rows = bulk.created
      .map(
        (r) =>
          `<tr><td>${r.name}</td><td>${r.designation ?? ''}</td><td>${r.email}</td><td style="font-family:monospace;font-size:15px">${r.password}</td></tr>`,
      )
      .join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<title>Teacher logins</title><style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px 10px;text-align:left}</style><h2>Teacher logins</h2><p>Sign in at ${window.location.origin}/login. Each teacher must choose a new password at the first sign-in. Keep this sheet safe and hand out one row per teacher.</p><table><tr><th>Name</th><th>Post</th><th>Username (email)</th><th>Starting password</th></tr>${rows}</table>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const load = useCallback(() => {
    api('/users')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api('/roles')
      .then(setCustomRoles)
      .catch(() => {});
    api('/staff')
      .then(setStaff)
      .catch(() => {});
  }, []);
  const openNew = () => {
    setError('');
    setForm(EMPTY);
    setEntry(true);
  };
  useOpenNew(openNew);
  const staffOptions = (
    <>
      <option value="">Not linked</option>
      {staff
        .filter((s) => s.status !== 'inactive')
        .map((s) => (
          <option key={s.id} value={s.id}>
            {s.firstName} {s.lastName}
          </option>
        ))}
    </>
  );
  const options = () => (
    <>
      <optgroup label="Built-in">
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </optgroup>
      {customRoles.length > 0 && (
        <optgroup label="Custom">
          {customRoles.map((r) => (
            <option key={r.id} value={`custom:${r.id}`}>
              {r.name}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { choice, ...rest } = form;
      await api('/users', {
        method: 'POST',
        body: { ...rest, staffId: rest.staffId || null, ...toBody(choice) },
      });
      setEntry(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const changeStaff = (u, staffId) =>
    run(() => api(`/users/${u.id}`, { method: 'PUT', body: { staffId: staffId || null } }));
  const changeRole = (u, choice) => run(() => api(`/users/${u.id}`, { method: 'PUT', body: toBody(choice) }));
  const resetPassword = (u) => {
    const password = prompt(`New password for ${u.email} (min 8 characters)`);
    if (password) run(() => api(`/users/${u.id}`, { method: 'PUT', body: { password } }));
  };
  const remove = (u) => run(() => api(`/users/${u.id}`, { method: 'DELETE' }));

  const inTab = (r, k) => k === 'all' || (k === 'unlinked' ? !r.staffId : r.role === k);
  const count = (k) => rows.filter((r) => inTab(r, k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) => inTab(r, tab) && (!needle || `${r.name} ${r.email} ${r.role}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Users</h1>
          <p className="hint">
            Staff logins. Set each person's role and link the login to their staff record.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" data-sure onClick={createTeacherLogins} disabled={bulkBusy}>
            {bulkBusy ? 'Creating…' : 'Create teacher logins'}
          </button>
          <button type="button" className="big-action" onClick={openNew}>
            + Create user
          </button>
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Users" value={rows.length} />
        <Tile icon="★" tone="violet" label="Admins" value={count('admin')} />
        <Tile icon="✓" tone="green" label="Linked to staff" value={rows.length - count('unlinked')} />
        <Tile icon="!" tone="amber" label="Not linked to staff" value={count('unlinked')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
            >
              {l}
              <span className="count">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or email…"
              aria-label="Search users"
            />
          </label>
          <span className="showing">{shown.length} users</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Staff member</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.roleId ? `custom:${u.roleId}` : u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      aria-label={`Role of ${u.email}`}
                    >
                      {options()}
                    </select>
                    {u.roleId && <small className="block">based on {u.role}</small>}
                  </td>
                  <td>
                    <select
                      value={u.staffId ?? ''}
                      onChange={(e) => changeStaff(u, e.target.value)}
                      aria-label={`Staff member of ${u.email}`}
                    >
                      {staffOptions}
                    </select>
                  </td>
                  <td className="row-actions">
                    <button type="button" className="ghost" onClick={() => resetPassword(u)}>
                      Reset password
                    </button>
                    <Gate action="delete">
                      <button type="button" className="ghost" onClick={() => remove(u)}>
                        Delete
                      </button>
                    </Gate>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {needle || tab !== 'all' ? 'No users match.' : 'No users yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={Boolean(bulk)} title="Teacher logins" onClose={() => setBulk(null)}>
        {bulk && (
          <>
            <p className={bulk.created.length ? 'success' : 'hint'}>
              {bulk.created.length
                ? `${bulk.created.length} login(s) created. Note the passwords now: they are shown only once, and each teacher must change theirs at the first sign-in.`
                : `No new logins were needed: ${bulk.alreadyHad} of ${bulk.teachers} active teacher(s) already have one.`}
            </p>
            {bulk.created.length > 0 && (
              <>
                <div className="table-scroll">
                  <table className="enquiry-table no-sno">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Post</th>
                        <th>Username (email)</th>
                        <th>Starting password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulk.created.map((r) => (
                        <tr key={r.email}>
                          <td>
                            <b>{r.name}</b>
                          </td>
                          <td>{r.designation}</td>
                          <td>{r.email}</td>
                          <td>
                            <code>{r.password}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  <button type="button" onClick={printLogins}>
                    Print this list
                  </button>
                </p>
              </>
            )}
            {bulk.skipped.length > 0 && (
              <>
                <h3>Could not be created</h3>
                <ul>
                  {bulk.skipped.map((s) => (
                    <li key={s.name}>
                      <b>{s.name}</b>: {s.reason}. Add an email to their staff record, then run this again.
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Modal>

      <Modal open={entry} title="Create user" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={create} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label>
              <span>Name *</span>
              <input value={form.name} onChange={set('name')} required />
            </label>
            <label>
              <span>Email *</span>
              <input type="email" value={form.email} onChange={set('email')} required />
            </label>
            <label>
              <span>Password *</span>
              <input
                type="password"
                minLength={8}
                value={form.password}
                onChange={set('password')}
                required
              />
            </label>
            <label>
              <span>Role</span>
              <select value={form.choice} onChange={set('choice')}>
                {options()}
              </select>
            </label>
            <label className="wide">
              <span>Staff member</span>
              <select value={form.staffId} onChange={set('staffId')}>
                {staffOptions}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Create user'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
