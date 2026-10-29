import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const EMPTY = { classId: '', subjectId: '', title: '', url: '', description: '' };

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

/** Links to notes, videos and documents shared with a class. */
export default function StudyMaterials() {
  const { user } = useAuth();
  const canWrite = ['admin', 'teacher'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/study-materials${filter ? `?classId=${filter}` : ''}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [filter]);
  useEffect(() => {
    api('/classes').then(setClasses);
    api('/subjects').then(setSubjects);
  }, []);
  useEffect(load, [load]);
  useOpenNew(() => {
    setForm(EMPTY);
    setEntry(true);
  }, canWrite);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/study-materials', { method: 'POST', body: form });
      setEntry(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m) => {
    try {
      await api(`/study-materials/${m.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  // Tabs are the subjects that have materials.
  const subjectNames = [...new Set(rows.map((r) => r.subjectName))].sort();
  const tabs = [['all', 'All'], ...subjectNames.map((s) => [s, s])];
  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.subjectName === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || r.subjectName === tab) &&
      (!needle ||
        `${r.className} ${r.subjectName} ${r.title} ${r.description ?? ''} ${r.createdByName}`
          .toLowerCase()
          .includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const classCount = new Set(rows.map((r) => r.classId ?? r.className)).size;
  const sharers = new Set(rows.map((r) => r.createdByName)).size;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Study materials</h1>
          <p className="hint">
            Share links to notes, videos or documents (a Drive or website address starting with https://).
            Parents see the materials for their child's class.
          </p>
        </div>
        {canWrite && (
          <div className="head-actions">
            <button
              type="button"
              className="big-action"
              onClick={() => {
                setError('');
                setForm(EMPTY);
                setEntry(true);
              }}
            >
              + Add material
            </button>
          </div>
        )}
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Materials shared" value={rows.length} />
        <Tile icon="✓" tone="green" label="Subjects covered" value={subjectNames.length} />
        <Tile icon="♙" tone="violet" label="Classes covered" value={classCount} />
        <Tile icon="◷" tone="amber" label="Shared by" value={sharers} hint="people" />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {tabs.map(([k, l]) => (
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
              placeholder="Search title, subject or class…"
              aria-label="Search materials"
            />
          </label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setTab('all');
              setPage(1);
            }}
            aria-label="Class"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
          <span className="showing">{shown.length} materials</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Subject</th>
                <th>Material</th>
                <th>Added by</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((m) => (
                <tr key={m.id}>
                  <td>{m.className}</td>
                  <td>{m.subjectName}</td>
                  <td>
                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                      <b>{m.title}</b>
                    </a>
                    {m.description && <small className="block">{m.description}</small>}
                  </td>
                  <td>{m.createdByName}</td>
                  <td className="row-actions">
                    {canWrite && (user.role === 'admin' || m.createdByName === user.name) && (
                      <Gate action="delete">
                        <button type="button" className="ghost" onClick={() => remove(m)}>
                          Delete
                        </button>
                      </Gate>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {needle || tab !== 'all' || filter ? 'No materials match.' : 'No materials shared yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Add material" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label>
              <span>Class *</span>
              <select value={form.classId} onChange={set('classId')} required>
                <option value="">--</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}-{c.section}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Subject *</span>
              <select value={form.subjectId} onChange={set('subjectId')} required>
                <option value="">--</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              <span>Title *</span>
              <input value={form.title} onChange={set('title')} required />
            </label>
            <label className="wide">
              <span>Link *</span>
              <input type="url" placeholder="https://" value={form.url} onChange={set('url')} required />
            </label>
            <label className="wide">
              <span>Description</span>
              <input value={form.description} onChange={set('description')} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add material'}
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
