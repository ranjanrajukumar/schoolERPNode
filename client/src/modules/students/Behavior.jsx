import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { useAuth } from '../../context/AuthContext.jsx';

const PAGE_SIZE = 25;
const TYPES = ['merit', 'demerit', 'incident', 'note'];
const badge = { merit: 'paid', demerit: 'rejected', incident: 'rejected', note: '' };
const TABS = [['', 'All'], ...TYPES.map((t) => [t, t.charAt(0).toUpperCase() + t.slice(1)])];

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

/** Merits, demerits, incidents and notes for students, with a points table. */
export default function Behavior() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [filters, setFilters] = useState({ studentId: params.get('studentId') ?? '', classId: '', type: '' });
  const [form, setForm] = useState({
    studentId: params.get('studentId') ?? '',
    type: 'merit',
    title: '',
    description: '',
    points: 1,
  });
  const [entry, setEntry] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    api(`/behavior?${q}`)
      .then(setRows)
      .catch((e) => setError(e.message));
    api(`/behavior/summary${filters.classId ? `?classId=${filters.classId}` : ''}`).then(setSummary);
  }, [filters]);

  useEffect(() => {
    api('/classes').then(setClasses);
  }, []);
  useEffect(load, [load]);
  useOpenNew(() => setEntry(true));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/behavior', { method: 'POST', body: form });
      setForm({ ...form, title: '', description: '' });
      setEntry(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    try {
      await api(`/behavior/${r.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      !needle ||
      `${r.studentName} ${r.title} ${r.description ?? ''} ${r.recordedByName}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const countOf = (t) => rows.filter((r) => r.type === t).length;
  const negative = summary.filter((s) => s.points < 0).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Student behavior</h1>
          <p className="hint">
            Merits add points, demerits subtract them (enter points as a positive number). Incidents and notes
            record what happened without points.
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="big-action"
            onClick={() => {
              setError('');
              setEntry(true);
            }}
          >
            + Record behavior
          </button>
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Records" value={rows.length} />
        <Tile icon="✓" tone="green" label="Merits" value={countOf('merit')} />
        <Tile
          icon="!"
          tone="amber"
          label="Demerits and incidents"
          value={countOf('demerit') + countOf('incident')}
        />
        <Tile icon="×" tone="red" label="Students below zero" value={negative} />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
          <span>
            <h2>Points by student</h2>
            <small>Click a name to see only that student's records</small>
          </span>
        </header>
        <div className="toolbar">
          <label>
            Class
            <select
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
            >
              <option value="">All</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}-{c.section}
                </option>
              ))}
            </select>
          </label>
          {filters.studentId && (
            <button type="button" className="ghost" onClick={() => setFilters({ ...filters, studentId: '' })}>
              Show all students
            </button>
          )}
          <span className="showing">{summary.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Records</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.studentId}>
                  <td>
                    <a
                      href="#filter"
                      onClick={(e) => {
                        e.preventDefault();
                        setFilters({ ...filters, studentId: String(s.studentId) });
                        setPage(1);
                      }}
                    >
                      <b>{s.name}</b>
                    </a>
                    <small className="block">{s.admissionNo}</small>
                  </td>
                  <td>{s.className}</td>
                  <td>{s.records}</td>
                  <td>
                    <span className={`badge ${s.points < 0 ? 'rejected' : 'paid'}`}>● {s.points}</span>
                  </td>
                </tr>
              ))}
              {!summary.length && (
                <tr>
                  <td colSpan={4} className="empty-row">
                    No records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
          <span>
            <h2>Records</h2>
            <small>{filters.studentId ? 'For the chosen student' : 'Newest first'}</small>
          </span>
        </header>
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k || 'all'}
              type="button"
              role="tab"
              aria-selected={filters.type === k}
              className={filters.type === k ? 'on' : ''}
              onClick={() => {
                setFilters({ ...filters, type: k });
                setPage(1);
              }}
            >
              {l}
              {filters.type === k && <span className="count">{rows.length}</span>}
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
              placeholder="Search student or title…"
              aria-label="Search records"
            />
          </label>
          <span className="showing">{shown.length} records</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Type</th>
                <th>Title</th>
                <th>Points</th>
                <th>By</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>
                    <b>{r.studentName}</b>
                  </td>
                  <td>
                    <span className={`badge ${badge[r.type]}`}>● {r.type}</span>
                  </td>
                  <td>
                    {r.title}
                    {r.description && <small className="block">{r.description}</small>}
                  </td>
                  <td>{r.points || ''}</td>
                  <td>{r.recordedByName}</td>
                  <td className="row-actions">
                    {(user?.role === 'admin' || r.recordedByName === user?.name) && (
                      <button type="button" className="ghost" onClick={() => remove(r)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {needle || filters.type ? 'No records match.' : 'No records.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Record behavior" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Student *</span>
              <TypeaheadSelect
                kind="students"
                value={form.studentId}
                onChange={(id) => setForm({ ...form, studentId: id })}
                filters={{ status: 'active' }}
                required
              />
            </label>
            <label>
              <span>Type</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            {['merit', 'demerit'].includes(form.type) && (
              <label>
                <span>Points</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                />
              </label>
            )}
            <label className="wide">
              <span>Title *</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label className="wide">
              <span>Details</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Record'}
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
