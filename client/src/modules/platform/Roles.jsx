import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const EMPTY = { name: '', description: '', baseRole: 'teacher', permissions: {} };

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Custom roles: a built-in role narrowed to the modules you choose. */
export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({ modules: [], baseRoles: [] });
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [entry, setEntry] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => { api('/roles').then(setRoles).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); api('/roles/modules').then(setMeta); }, [load]);

  const openNew = () => { setError(''); setEditId(null); setForm(EMPTY); setEntry(true); };
  const openEdit = (r) => { setError(''); setEditId(r.id); setForm({ name: r.name, description: r.description ?? '', baseRole: r.baseRole, permissions: r.permissions }); setEntry(true); };
  useOpenNew(openNew);
  const setLevel = (key, level) => setForm({ ...form, permissions: { ...form.permissions, [key]: level } });

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api(editId ? `/roles/${editId}` : '/roles', { method: editId ? 'PUT' : 'POST', body: form });
      setEntry(false); setEditId(null); setForm(EMPTY); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (r) => {
    setError('');
    try { await api(`/roles/${r.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  };

  const needle = q.trim().toLowerCase();
  const shown = roles.filter((r) => !needle || `${r.name} ${r.description ?? ''} ${r.baseRole}`.toLowerCase().includes(needle));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const assigned = roles.reduce((n, r) => n + Number(r.users), 0);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Roles</h1>
          <p className="hint">A custom role is a built-in role narrowed to the modules you choose, for example a Librarian (teacher base, Library only). It can never do more than its base role: a teacher-based role still cannot approve payroll, however it is set. Assign roles on the Users page. Users, roles, groups and the audit log stay with built-in admins.</p>
        </div>
        <div className="head-actions"><button type="button" className="big-action" onClick={openNew}>+ Create role</button></div>
      </div>
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="★" tone="blue" label="Custom roles" value={roles.length} />
        <Tile icon="♙" tone="green" label="Users on custom roles" value={assigned} />
        <Tile icon="▤" tone="violet" label="Modules that can be granted" value={meta.modules.length} />
        <Tile icon="○" tone="amber" label="Roles with no users" value={roles.filter((r) => !Number(r.users)).length} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search roles…" aria-label="Search roles" /></label>
          <span className="showing">{shown.length} roles</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Role</th><th>Based on</th><th>Users</th><th>Modules</th><th /></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b>{r.description && <small className="block">{r.description}</small>}</td><td>{r.baseRole}</td><td>{r.users}</td>
                  <td>{Object.entries(r.permissions).map(([k, v]) => `${meta.modules.find((m) => m.key === k)?.label ?? k} (${v === 'write' ? 'change' : 'view'})`).join(', ')}</td>
                  <td className="row-actions">
                    <button type="button" className="ghost" onClick={() => openEdit(r)}>Edit</button>
                    <button type="button" className="ghost" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={5} className="empty-row">{needle ? 'No roles match.' : 'No custom roles yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title={editId ? 'Edit role' : 'Create role'} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label><span>Role name *</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={60} /></label>
            <label><span>Based on</span>
              <select value={form.baseRole} onChange={(e) => setForm({ ...form, baseRole: e.target.value })}>{meta.baseRoles.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <label className="wide"><span>Description</span><input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead><tr><th>Module</th><th>Access</th></tr></thead>
              <tbody>
                {meta.modules.map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    <td>
                      <select value={form.permissions[m.key] ?? ''} onChange={(e) => setLevel(m.key, e.target.value)} aria-label={`Access to ${m.label}`}>
                        <option value="">No access</option><option value="read">View only</option><option value="write">View and change</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">The dashboard and the shared lookups other screens need (classes, subjects, students, staff, settings, notices, calendar) are always readable.</p>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : editId ? 'Update role' : 'Create role'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
