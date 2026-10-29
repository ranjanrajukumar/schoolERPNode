import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const EMPTY = { name: '', code: '', address: '', phone: '', incharge: '' };

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

/** Campuses of the school. The first one added is the main campus. */
export default function Branches() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [entry, setEntry] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/branches')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const openNew = () => {
    setError('');
    setEditId(null);
    setForm(EMPTY);
    setEntry(true);
  };
  const openEdit = (b) => {
    setError('');
    setEditId(b.id);
    setForm({
      name: b.name,
      code: b.code ?? '',
      address: b.address ?? '',
      phone: b.phone ?? '',
      incharge: b.incharge ?? '',
    });
    setEntry(true);
  };
  useOpenNew(openNew);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(editId ? `/branches/${editId}` : '/branches', {
        method: editId ? 'PUT' : 'POST',
        body: form,
      });
      setEntry(false);
      setForm(EMPTY);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (b) =>
      !needle ||
      `${b.name} ${b.code ?? ''} ${b.address ?? ''} ${b.incharge ?? ''}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const classes = rows.reduce((n, b) => n + Number(b.classCount), 0);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Branches / campuses</h1>
          <p className="hint">
            The first campus you add is the main campus. Assign each class to a campus on the Classes page.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="big-action" onClick={openNew}>
            + Add campus
          </button>
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Campuses" value={rows.length} />
        <Tile icon="★" tone="green" label="Main campus" value={rows.find((b) => b.isMain)?.name ?? '—'} />
        <Tile icon="♙" tone="violet" label="Classes assigned" value={classes} />
        <Tile
          icon="○"
          tone="amber"
          label="Campuses with no classes"
          value={rows.filter((b) => !Number(b.classCount)).length}
        />
      </div>

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
              placeholder="Search campus, code or person in charge…"
              aria-label="Search campuses"
            />
          </label>
          <span className="showing">{shown.length} campuses</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Campus</th>
                <th>Code</th>
                <th>Address</th>
                <th>Phone</th>
                <th>In charge</th>
                <th>Classes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <b>{b.name}</b> {b.isMain && <span className="badge paid">main</span>}
                  </td>
                  <td>{b.code}</td>
                  <td>{b.address}</td>
                  <td>{b.phone}</td>
                  <td>{b.incharge}</td>
                  <td>{b.classCount}</td>
                  <td className="row-actions">
                    {!b.isMain && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => run(() => api(`/branches/${b.id}/main`, { method: 'POST' }))}
                      >
                        Make main
                      </button>
                    )}
                    <button type="button" className="ghost" onClick={() => openEdit(b)}>
                      Edit
                    </button>
                    {!b.isMain && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => run(() => api(`/branches/${b.id}`, { method: 'DELETE' }))}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {needle ? 'No campuses match.' : 'No campuses yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal
        open={entry}
        title={editId ? 'Edit campus' : 'Add campus'}
        wide={false}
        onClose={() => setEntry(false)}
      >
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label>
              <span>Campus name *</span>
              <input value={form.name} onChange={set('name')} required />
            </label>
            <label>
              <span>Code</span>
              <input value={form.code ?? ''} onChange={set('code')} maxLength={12} />
            </label>
            <label className="wide">
              <span>Address</span>
              <input value={form.address ?? ''} onChange={set('address')} />
            </label>
            <label>
              <span>Phone</span>
              <input value={form.phone ?? ''} onChange={set('phone')} />
            </label>
            <label>
              <span>In charge</span>
              <input value={form.incharge ?? ''} onChange={set('incharge')} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : editId ? 'Update' : 'Add campus'}
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
