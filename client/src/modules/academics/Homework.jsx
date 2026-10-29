import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const EMPTY = { classId: '', subjectId: '', title: '', description: '', dueDate: '', maxMarks: '' };
const TABS = [
  ['all', 'All'],
  ['pending', 'Awaiting hand-in'],
  ['overdue', 'Overdue'],
  ['done', 'All handed in'],
];
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const state = (h) => (h.total && h.submitted >= h.total ? 'done' : h.overdue ? 'overdue' : 'pending');

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

/** Homework set for each class, with how many pupils have handed it in. */
export default function Homework() {
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
    api(`/homework${filter ? `?classId=${filter}` : ''}`)
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
      await api('/homework', { method: 'POST', body: form });
      setEntry(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (h) => {
    try {
      await api(`/homework/${h.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => state(r) === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || state(r) === tab) &&
      (!needle ||
        `${r.className} ${r.subjectName} ${r.title} ${r.createdByName}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const notTracked = rows.filter((r) => !r.total).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Homework &amp; assignments</h1>
          <p className="hint">Set homework for a class and track who has handed it in.</p>
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
              + Set homework
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
        <Tile icon="▤" tone="blue" label="Homework set" value={rows.length} />
        <Tile icon="◷" tone="amber" label="Awaiting hand-in" value={count('pending')} />
        <Tile icon="!" tone="red" label="Overdue" value={count('overdue')} />
        <Tile
          icon="✓"
          tone="green"
          label="All handed in"
          value={count('done')}
          hint={notTracked ? `${notTracked} not tracked` : null}
        />
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
              placeholder="Search class, subject or title…"
              aria-label="Search homework"
            />
          </label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
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
          <span className="showing">{shown.length} assignments</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Subject</th>
                <th>Homework</th>
                <th>Due</th>
                <th>Handed in</th>
                <th>Set by</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((h) => (
                <tr key={h.id}>
                  <td>{h.className}</td>
                  <td>{h.subjectName}</td>
                  <td>
                    <b>{h.title}</b>
                    {h.description && <small className="block">{h.description}</small>}
                  </td>
                  <td>
                    {date(h.dueDate)}
                    {state(h) === 'overdue' && (
                      <span className="badge rejected" style={{ marginLeft: 6 }}>
                        overdue
                      </span>
                    )}
                  </td>
                  <td>
                    {h.total ? (
                      <span className={`badge ${state(h) === 'done' ? 'paid' : 'partial'}`}>
                        ● {h.submitted} / {h.total}
                      </span>
                    ) : (
                      'not tracked'
                    )}
                  </td>
                  <td>{h.createdByName}</td>
                  <td className="row-actions">
                    <Link className="btn" to={`/homework/${h.id}`}>
                      {canWrite ? 'Track' : 'View'}
                    </Link>
                    {canWrite && (user.role === 'admin' || h.createdByName === user.name) && (
                      <button type="button" className="ghost" onClick={() => remove(h)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {needle || tab !== 'all' || filter ? 'No homework matches.' : 'No homework set yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Set homework" wide={false} onClose={() => setEntry(false)}>
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
            <label>
              <span>Due date *</span>
              <input type="date" value={form.dueDate} onChange={set('dueDate')} required />
            </label>
            <label>
              <span>Max marks (optional)</span>
              <input type="number" min="1" value={form.maxMarks} onChange={set('maxMarks')} />
            </label>
            <label className="wide">
              <span>Instructions</span>
              <input value={form.description} onChange={set('description')} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Set homework'}
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
