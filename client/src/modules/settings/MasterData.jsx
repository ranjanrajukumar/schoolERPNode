import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { forgetMasters } from '../../components/MasterSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 12;
const TONES = ['blue', 'green', 'amber', 'violet', 'rose', 'teal', 'orange']; // the app's own icon tones

function Tile({ icon, tone, label, value }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
      </span>
    </div>
  );
}

/** Master data: the lists registration forms offer as dropdowns, and the documents each process asks to be uploaded. */
export default function MasterData() {
  const [data, setData] = useState(null);
  const [params, setParams] = useSearchParams();
  const type = params.get('list'); // null: the cards of every list
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [entry, setEntry] = useState(null); // null | { id?, name, required }
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('/masters')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      await fn();
      forgetMasters();
      if (message) setNotice(message);
      load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const current = data.types.find((t) => t.key === type) ?? null;
  const isDoc = Boolean(current?.documents);
  const items = data.items[type] ?? [];
  const needle = q.trim().toLowerCase();
  const shown = items.filter((i) => !needle || i.name.toLowerCase().includes(needle));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const lists = data.types.filter((t) => !t.documents);
  const docLists = data.types.filter((t) => t.documents);
  const totalItems = Object.values(data.items).reduce((n, l) => n + l.length, 0);
  const requiredDocs = docLists.reduce(
    (n, t) => n + (data.items[t.key] ?? []).filter((i) => i.required && i.active).length,
    0,
  );
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;

  const toneOf = (t) => {
    const group = t.documents ? docLists : lists;
    return TONES[(group.findIndex((x) => x.key === t.key) + (t.documents ? 3 : 0)) % TONES.length];
  };
  const pick = (key) => {
    setParams(key ? { list: key } : {});
    setQ('');
    setPage(1);
    setNotice('');
    setError('');
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await run(
      async () => {
        if (entry.id)
          await api(`/masters/${entry.id}`, {
            method: 'PUT',
            body: { name: entry.name, ...(isDoc ? { required: entry.required } : {}) },
          });
        else
          await api('/masters', {
            method: 'POST',
            body: { type, name: entry.name, ...(isDoc ? { required: entry.required } : {}) },
          });
      },
      entry.id ? 'Saved.' : 'Added.',
    );
    setBusy(false);
    if (ok) setEntry(null);
  };
  const move = (i, direction) => {
    const other = items[items.findIndex((x) => x.id === i.id) + direction];
    if (!other) return;
    run(async () => {
      await api(`/masters/${i.id}`, { method: 'PUT', body: { sortOrder: other.sortOrder } });
      await api(`/masters/${other.id}`, { method: 'PUT', body: { sortOrder: i.sortOrder } });
    });
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Master data</h1>
          <p className="hint">
            The lists registration forms offer as dropdowns, and the documents each process asks to be
            uploaded.
          </p>
        </div>
        <div className="head-actions">
          {current && (
            <button type="button" className="ghost" onClick={() => pick(null)}>
              ← All lists
            </button>
          )}
          {current && (
            <button
              type="button"
              className="big-action"
              onClick={() => {
                setError('');
                setEntry({ name: '', required: false });
              }}
            >
              ＋ Add {isDoc ? 'document' : 'option'}
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Lists" value={lists.length} />
        <Tile icon="✓" tone="green" label="Options in use" value={totalItems} />
        <Tile icon="▧" tone="violet" label="Document lists" value={docLists.length} />
        <Tile icon="!" tone="amber" label="Required documents" value={requiredDocs} />
      </div>

      {!current && (
        <>
          {[
            ['Dropdown lists', lists, 'What registration and other forms offer to choose from.'],
            ['Document lists', docLists, 'The documents each process asks to be uploaded.'],
          ]
            .filter(([, group]) => group.length)
            .map(([title, group, hint]) => (
              <section key={title} className="master-section">
                <h2>{title}</h2>
                <p className="hint">{hint}</p>
                <div className="master-grid">
                  {group.map((t, n) => {
                    const tone = TONES[(n + (t.documents ? 3 : 0)) % TONES.length];
                    const list = data.items[t.key] ?? [];
                    const active = list.filter((i) => i.active);
                    const required = list.filter((i) => i.required && i.active).length;
                    return (
                      <div
                        key={t.key}
                        role="button"
                        tabIndex={0}
                        className="card master-card"
                        onClick={() => pick(t.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            pick(t.key);
                          }
                        }}
                        aria-label={`Open ${t.label}`}
                      >
                        <span className="master-card-head">
                          <span className={`tile-icon ${tone}`} aria-hidden="true">
                            {t.documents ? '▧' : '▤'}
                          </span>
                          <span>
                            <b>{t.label}</b>
                            <small>
                              {active.length} in use
                              {list.length > active.length ? ` · ${list.length - active.length} hidden` : ''}
                              {t.documents && required ? ` · ${required} required` : ''}
                            </small>
                          </span>
                        </span>
                        <span className="master-chips">
                          {active.slice(0, 6).map((i) => (
                            <span key={i.id} className="chip">
                              {i.name}
                            </span>
                          ))}
                          {active.length > 6 && <span className="chip more">+{active.length - 6} more</span>}
                          {!list.length && <small>Nothing added yet</small>}
                        </span>
                        <span className="master-card-go">Open →</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
        </>
      )}

      {current && (
        <section className="card enquiry-card">
          <header className="card-head" style={{ padding: '22px 22px 18px', marginBottom: 0 }}>
            <span>
              <h2>{current?.label}</h2>
              <small>
                {isDoc
                  ? 'Documents asked for in this process. Required ones must be uploaded before it can be finished.'
                  : 'Switch an option off to hide it from new entries. Renaming, hiding or deleting never changes records that already use it.'}
              </small>
            </span>
          </header>
          <div className="toolbar">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={`Search ${current?.label?.toLowerCase()}…`}
                aria-label="Search this list"
              />
            </label>
            <span className="showing">
              Showing{' '}
              <b>
                {from}–{Math.min(page * PAGE_SIZE, shown.length)}
              </b>{' '}
              of <b>{shown.length}</b>
            </span>
          </div>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Order</th>
                  <th>Name</th>
                  {isDoc && <th>Required</th>}
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((i) => {
                  const index = items.findIndex((x) => x.id === i.id);
                  return (
                    <tr key={i.id}>
                      <td>
                        <button
                          type="button"
                          className="ghost more-btn"
                          disabled={index === 0 || Boolean(needle)}
                          onClick={() => move(i, -1)}
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="ghost more-btn"
                          disabled={index === items.length - 1 || Boolean(needle)}
                          onClick={() => move(i, 1)}
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </td>
                      <td>
                        <span style={i.active ? undefined : { opacity: 0.5, textDecoration: 'line-through' }}>
                          {i.name}
                        </span>
                      </td>
                      {isDoc && (
                        <td>
                          <button
                            type="button"
                            className={`badge ${i.required ? 'partial' : ''}`}
                            title="Click to change"
                            onClick={() =>
                              run(() =>
                                api(`/masters/${i.id}`, { method: 'PUT', body: { required: !i.required } }),
                              )
                            }
                            style={{ cursor: 'pointer', border: 0 }}
                          >
                            {i.required ? '● Required' : 'Optional'}
                          </button>
                        </td>
                      )}
                      <td>
                        <span className={`badge ${i.active ? 'paid' : 'rejected'}`}>
                          ● {i.active ? 'In use' : 'Hidden'}
                        </span>
                      </td>
                      <td className="row-actions">
                        <Gate action="edit">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setError('');
                              setEntry({ id: i.id, name: i.name, required: i.required });
                            }}
                          >
                            Edit
                          </button>
                        </Gate>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() =>
                            run(() => api(`/masters/${i.id}`, { method: 'PUT', body: { active: !i.active } }))
                          }
                        >
                          {i.active ? 'Hide' : 'Show'}
                        </button>
                        <Gate action="delete">
                          <button
                            type="button"
                            className="ghost danger"
                            onClick={() =>
                              run(() => api(`/masters/${i.id}`, { method: 'DELETE' }), 'Deleted.')
                            }
                          >
                            Delete
                          </button>
                        </Gate>
                      </td>
                    </tr>
                  );
                })}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={isDoc ? 5 : 4} className="empty-row">
                      {needle ? 'Nothing matches your search.' : 'No options yet. Add the first one.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
        </section>
      )}

      <Modal
        open={Boolean(entry)}
        title={`${entry?.id ? 'Edit' : 'Add'} ${isDoc ? 'document' : 'option'}`}
        wide={false}
        onClose={() => setEntry(null)}
      >
        {entry && current && (
          <form onSubmit={save} className="master-form">
            <div className="master-form-head">
              <span className={`tile-icon ${toneOf(current)}`} aria-hidden="true">
                {isDoc ? '▧' : '▤'}
              </span>
              <span>
                <b>{current.label}</b>
                <small>
                  {isDoc ? 'Documents this process asks to be uploaded' : 'An option in this dropdown list'}
                </small>
              </span>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <label className="master-field">
              <span>
                {isDoc ? 'Document name' : 'Option name'} <i>*</i>
              </span>
              <input
                value={entry.name}
                onChange={(e) => setEntry({ ...entry, name: e.target.value })}
                required
                maxLength={100}
                autoFocus
                placeholder={isDoc ? 'e.g. Birth certificate' : 'e.g. Hindu'}
              />
              <small className="counter">{entry.name.length}/100</small>
            </label>
            {isDoc && (
              <label className="master-switch">
                <input
                  type="checkbox"
                  role="switch"
                  checked={entry.required}
                  onChange={(e) => setEntry({ ...entry, required: e.target.checked })}
                />
                <span className="track" aria-hidden="true">
                  <i />
                </span>
                <span>
                  <b>Required</b>
                  <small>It must be uploaded before the process can be finished.</small>
                </span>
              </label>
            )}
            <div className="master-preview" aria-live="polite">
              <small>How it will look</small>
              <span className="chip">
                {entry.name.trim() || (isDoc ? 'Document name' : 'Option name')}
                {isDoc && entry.required && <em> · required</em>}
              </span>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy || !entry.name.trim()}>
                {busy ? 'Saving…' : entry.id ? 'Save changes' : isDoc ? 'Add document' : 'Add option'}
              </button>
              <button type="button" className="ghost" onClick={() => setEntry(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
