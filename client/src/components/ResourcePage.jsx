import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import TypeaheadSelect from './TypeaheadSelect.jsx';
import Modal from './Modal.jsx';
import Pagination from './Pagination.jsx';
import { useOpenNew } from '../hooks/useOpenNew.js';

const PAGE_SIZE = 10;

/**
 * Generic list + add/edit/delete page, laid out like the Enquiries page: title and "New" button, a search bar, a paged table
 * with Edit / Delete buttons on each row, and the entry form in a popup.
 * fields: [{ key, label, type?, options?: [{value,label}], optionsFrom?: { path, map }, typeahead?: 'students'|'staff'|'books'|'parents', required? }]
 * columns: [{ key, label, render?(row) }]
 * writeRoles: roles allowed to change data (others see a read-only list).
 * rowActions(row, reload): extra buttons per row.  extra: node rendered under the title.
 */
export default function ResourcePage({
  title,
  path,
  fields,
  columns,
  writeRoles = ['admin'],
  rowActions,
  extra,
  noEdit = false,
}) {
  const { user } = useAuth();
  const canWrite = writeRoles.includes(user?.role);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [opts, setOpts] = useState({});
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  useOpenNew(() => {
    reset();
    setOpen(true);
  }, true);

  const load = useCallback(() => {
    api(path)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [path]);

  useEffect(() => {
    load();
    fields
      .filter((f) => f.optionsFrom)
      .forEach(async (f) => {
        const data = await api(f.optionsFrom.path);
        setOpts((o) => ({ ...o, [f.key]: data.map(f.optionsFrom.map) }));
      });
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setForm({});
    setEditId(null);
    setError('');
  };
  const close = () => {
    setOpen(false);
    reset();
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(editId ? `${path}/${editId}` : path, { method: editId ? 'PUT' : 'POST', body: form });
      setNotice(editId ? 'Changes saved.' : 'Added.');
      close();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    setError('');
    try {
      await api(`${path}/${id}`, { method: 'DELETE' });
      setNotice('Deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? rows.filter((r) => JSON.stringify(Object.values(r)).toLowerCase().includes(needle))
    : rows;
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const edit = (r) => {
    setError('');
    setEditId(r.id);
    setForm(Object.fromEntries(fields.map((fld) => [fld.key, r[fld.key] ?? ''])));
    setOpen(true);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{title}</h1>
          <p className="hint">
            {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            className="big-action"
            onClick={() => {
              reset();
              setNotice('');
              setOpen(true);
            }}
          >
            + New
          </button>
        )}
      </div>
      {extra}
      {notice && <p className="success">{notice}</p>}
      {error && !open && (
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
              placeholder="Search…"
              aria-label={`Search ${title}`}
            />
          </label>
          <span className="showing">
            Showing{' '}
            <b>
              {shown.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, shown.length)}
            </b>{' '}
            of <b>{shown.length}</b>
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>
                  ))}
                  <td className="row-actions">
                    {rowActions?.(r, load)}
                    {canWrite && !noEdit && (
                      <button type="button" className="ghost" onClick={() => edit(r)}>
                        Edit
                      </button>
                    )}
                    {canWrite && (
                      <button type="button" className="ghost danger" onClick={() => remove(r.id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={columns.length + 1} className="empty-row">
                    {needle ? 'Nothing matches your search.' : 'No records yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={open} title={editId ? `Edit — ${title}` : `New — ${title}`} onClose={close}>
        <form onSubmit={save}>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            {fields.map((fld) => (
              <label key={fld.key} className={fld.type === 'textarea' ? 'wide' : undefined}>
                {fld.label}
                {fld.required && ' *'}
                {fld.typeahead ? (
                  <TypeaheadSelect
                    kind={fld.typeahead}
                    value={form[fld.key] ?? ''}
                    required={fld.required}
                    onChange={(id) => setForm({ ...form, [fld.key]: id })}
                  />
                ) : fld.options || opts[fld.key] ? (
                  <select
                    value={form[fld.key] ?? ''}
                    required={fld.required}
                    onChange={(e) => setForm({ ...form, [fld.key]: e.target.value })}
                  >
                    <option value="">--</option>
                    {(fld.options || opts[fld.key]).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : fld.type === 'textarea' ? (
                  <textarea
                    value={form[fld.key] ?? ''}
                    required={fld.required}
                    rows={3}
                    onChange={(e) => setForm({ ...form, [fld.key]: e.target.value })}
                  />
                ) : (
                  <input
                    type={fld.type || 'text'}
                    value={form[fld.key] ?? ''}
                    required={fld.required}
                    onChange={(e) => setForm({ ...form, [fld.key]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit">{editId ? 'Save changes' : 'Add'}</button>
            <button type="button" className="ghost" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
