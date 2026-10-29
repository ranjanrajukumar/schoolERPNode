import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import ParentForm from './ParentForm.jsx';

const PAGE_SIZE = 25;
const TABS = [
  ['all', 'All parents'],
  ['noChild', 'No child linked'],
];

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

/** Parent logins for the Parent Portal, each linked to their children. */
export default function Parents() {
  const [rows, setRows] = useState([]);
  const [link, setLink] = useState({}); // parentId -> { studentId, relation }
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [entry, setEntry] = useState(null); // null = closed, {} = new, { id } = edit
  const openNew = () => {
    setNotice('');
    setEntry({});
  };
  useOpenNew(openNew);

  const load = useCallback(() => {
    api('/parents')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      await fn();
      if (message) setNotice(message);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addLink = (p) => {
    const { studentId, relation } = link[p.id] ?? {};
    if (!studentId) return;
    run(async () => {
      await api(`/parents/${p.id}/students`, { method: 'POST', body: { studentId, relation } });
      setLink({ ...link, [p.id]: { studentId: '', relation: '' } });
    });
  };

  const unlink = (p, c) => run(() => api(`/parents/${p.id}/students/${c.studentId}`, { method: 'DELETE' }));

  const reset = (p) => {
    const password = prompt(`New password for ${p.email} (min 8 characters)`);
    if (password)
      run(() => api(`/parents/${p.id}`, { method: 'PUT', body: { password } }), 'Password changed.');
  };

  const remove = (p) => run(() => api(`/parents/${p.id}`, { method: 'DELETE' }));

  const inTab = (r, k) => k === 'all' || !r.children.length;
  const count = (k) => rows.filter((r) => inTab(r, k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      inTab(r, tab) &&
      (!needle ||
        `${r.name} ${r.email} ${r.phone ?? ''} ${r.children.map((c) => c.name).join(' ')}`
          .toLowerCase()
          .includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const children = rows.reduce((n, r) => n + r.children.length, 0);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Parent accounts</h1>
          <p className="hint">
            Create a login for each parent, then link their children. Parents see only their own children, in
            the Parent Portal.
          </p>
        </div>
        <div className="head-actions">
          <Gate action="create">
            <button type="button" className="big-action" onClick={openNew}>
              + New parent account
            </button>
          </Gate>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Parent accounts" value={rows.length} />
        <Tile icon="▤" tone="green" label="Children linked" value={children} />
        <Tile icon="!" tone="amber" label="No child linked" value={count('noChild')} />
        <Tile icon="✓" tone="violet" label="With a child linked" value={rows.length - count('noChild')} />
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
              placeholder="Search parent, email or child…"
              aria-label="Search parents"
            />
          </label>
          <span className="showing">{shown.length} parents</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Parent</th>
                <th>Children</th>
                <th>Link a child</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.name}</b>
                    <small className="block">
                      {p.email}
                      {p.phone && ` · ${p.phone}`}
                    </small>
                    {(p.occupation || p.city) && (
                      <small className="block">{[p.occupation, p.city].filter(Boolean).join(' · ')}</small>
                    )}
                  </td>
                  <td>
                    {p.children.map((c) => (
                      <div key={c.studentId}>
                        {c.name}{' '}
                        <small>
                          ({c.relation}, {c.className ?? 'no class'})
                        </small>
                        <button
                          type="button"
                          className="link"
                          title="Remove link"
                          onClick={() => unlink(p, c)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {!p.children.length && <span className="badge partial">none linked</span>}
                  </td>
                  <td>
                    <TypeaheadSelect
                      kind="students"
                      value={link[p.id]?.studentId ?? ''}
                      onChange={(id) => setLink({ ...link, [p.id]: { ...link[p.id], studentId: id } })}
                      exclude={p.children.map((c) => c.studentId)}
                      placeholder="Find a student…"
                    />{' '}
                    <input
                      placeholder="Relation"
                      style={{ width: 90 }}
                      value={link[p.id]?.relation ?? ''}
                      onChange={(e) =>
                        setLink({ ...link, [p.id]: { ...link[p.id], relation: e.target.value } })
                      }
                    />{' '}
                    <button type="button" onClick={() => addLink(p)}>
                      Link
                    </button>
                  </td>
                  <td className="row-actions">
                    <Gate action="edit">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setNotice('');
                          setEntry({ id: p.id });
                        }}
                      >
                        Edit
                      </button>
                    </Gate>
                    <button type="button" className="ghost" onClick={() => reset(p)}>
                      Reset password
                    </button>
                    <Gate action="delete">
                      <button type="button" className="ghost" onClick={() => remove(p)}>
                        Delete
                      </button>
                    </Gate>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={4} className="empty-row">
                    {needle || tab !== 'all' ? 'No parents match.' : 'No parent accounts yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal
        open={Boolean(entry)}
        title={entry?.id ? 'Edit parent' : 'New parent account'}
        onClose={() => setEntry(null)}
      >
        {entry && (
          <ParentForm
            embedded
            id={entry.id}
            onCancel={() => setEntry(null)}
            onSaved={(r) => {
              setEntry(null);
              setNotice(
                r.created
                  ? 'Parent account created. Share the email and password with them securely.'
                  : 'Details saved.',
              );
              load();
            }}
          />
        )}
      </Modal>
    </>
  );
}
