import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' };
const STATUS_BADGE = { not_started: '', in_progress: 'partial', completed: 'paid' };
const EMPTY = { sequence: '', title: '', objective: '', plannedDate: '' };
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

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

/** Syllabus topics per class and subject, with how far each subject has got. */
export default function Syllabus() {
  const canWrite = ['admin', 'teacher'].includes(useAuth().user?.role);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('progress');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadProgress = () => api('/syllabus/progress').then(setProgress);
  const loadTopics = useCallback(() => {
    if (!classId || !subjectId) {
      setTopics([]);
      return;
    }
    api(`/syllabus?classId=${classId}&subjectId=${subjectId}`)
      .then(setTopics)
      .catch((e) => setError(e.message));
  }, [classId, subjectId]);

  useEffect(() => {
    api('/classes').then(setClasses);
    api('/subjects').then(setSubjects);
    loadProgress();
  }, []);
  useEffect(loadTopics, [loadTopics]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      loadTopics();
      loadProgress();
    } catch (err) {
      setError(err.message);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    await run(async () => {
      await api('/syllabus', {
        method: 'POST',
        body: { ...form, classId, subjectId, sequence: form.sequence || topics.length + 1 },
      });
      setForm(EMPTY);
      setEntry(false);
    });
    setBusy(false);
  };
  const setStatus = (t, status) => run(() => api(`/syllabus/${t.id}`, { method: 'PUT', body: { status } }));
  const remove = (t) => run(() => api(`/syllabus/${t.id}`, { method: 'DELETE' }));

  const today = localDate();
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };
  const needle = q.trim().toLowerCase();
  const progressShown = progress.filter(
    (g) => !needle || `${g.className} ${g.subjectName}`.toLowerCase().includes(needle),
  );
  const topicsShown = topics.filter(
    (t) => !needle || `${t.title} ${t.objective ?? ''}`.toLowerCase().includes(needle),
  );
  const shown = tab === 'progress' ? progressShown : topicsShown;
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalTopics = progress.reduce((n, g) => n + g.total, 0);
  const doneTopics = progress.reduce((n, g) => n + g.completed, 0);
  const behind = progress.filter((g) => g.behind).length;
  const picked = classId && subjectId;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Syllabus &amp; lesson plans</h1>
          <p className="hint">
            List each subject's topics in teaching order, plan a date for each, and update the status as
            lessons are completed.
          </p>
        </div>
        {canWrite && picked && (
          <div className="head-actions">
            <button
              type="button"
              className="big-action"
              onClick={() => {
                setError('');
                setForm(EMPTY);
                setEntry(true);
                setTab('topics');
              }}
            >
              + Add topic
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
        <Tile icon="▤" tone="blue" label="Subjects with a syllabus" value={progress.length} />
        <Tile icon="◷" tone="violet" label="Topics planned" value={totalTopics} />
        <Tile
          icon="✓"
          tone="green"
          label="Topics completed"
          value={doneTopics}
          hint={totalTopics ? `${Math.round((doneTopics / totalTopics) * 100)}% overall` : null}
        />
        <Tile icon="!" tone="red" label="Subjects behind plan" value={behind} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'progress'}
            className={tab === 'progress' ? 'on' : ''}
            onClick={() => goTab('progress')}
          >
            Progress<span className="count">{progress.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'topics'}
            className={tab === 'topics' ? 'on' : ''}
            onClick={() => goTab('topics')}
          >
            Topics<span className="count">{topics.length}</span>
          </button>
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
              placeholder={tab === 'progress' ? 'Search class or subject…' : 'Search topic…'}
              aria-label="Search syllabus"
            />
          </label>
          {tab === 'topics' && (
            <>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
                <option value="">-- class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}-{c.section}
                  </option>
                ))}
              </select>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Subject">
                <option value="">-- subject --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <span className="showing">
            {shown.length} {tab === 'progress' ? 'subjects' : 'topics'}
          </span>
        </div>
        <div className="table-scroll">
          {tab === 'progress' ? (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Completed</th>
                  <th>Topics</th>
                  <th>Behind plan</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((g) => (
                  <tr key={`${g.classId}-${g.subjectId}`}>
                    <td>{g.className}</td>
                    <td>
                      <b>{g.subjectName}</b>
                    </td>
                    <td>
                      <div className="bar">
                        <div style={{ width: `${g.percent}%` }} />
                      </div>{' '}
                      {g.percent}%
                    </td>
                    <td>
                      {g.completed} / {g.total}
                    </td>
                    <td>{g.behind ? <span className="badge rejected">● {g.behind} behind</span> : '—'}</td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      {needle ? 'No subjects match.' : 'No syllabus entered yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Topic</th>
                  <th>Planned</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.sequence}</td>
                    <td>
                      <b>{t.title}</b>
                      {t.objective && <small className="block">{t.objective}</small>}
                    </td>
                    <td>
                      {date(t.plannedDate)}
                      {t.status !== 'completed' && t.plannedDate && t.plannedDate < today && (
                        <span className="badge rejected" style={{ marginLeft: 6 }}>
                          behind
                        </span>
                      )}
                    </td>
                    <td>
                      {canWrite ? (
                        <select
                          value={t.status}
                          onChange={(e) => setStatus(t, e.target.value)}
                          aria-label={`Status of ${t.title}`}
                        >
                          {Object.entries(STATUS_LABEL).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${STATUS_BADGE[t.status]}`}>● {STATUS_LABEL[t.status]}</span>
                      )}
                      {t.completedOn && <small className="block">{date(t.completedOn)}</small>}
                    </td>
                    <td className="row-actions">
                      {canWrite && (
                        <button type="button" className="ghost" onClick={() => remove(t)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      {!picked
                        ? 'Choose a class and subject.'
                        : needle
                          ? 'No topics match.'
                          : 'No topics yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Add topic" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={add} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label>
              <span>Order</span>
              <input
                type="number"
                min="1"
                value={form.sequence}
                onChange={(e) => setForm({ ...form, sequence: e.target.value })}
                placeholder={String(topics.length + 1)}
              />
            </label>
            <label>
              <span>Planned date</span>
              <input
                type="date"
                value={form.plannedDate}
                onChange={(e) => setForm({ ...form, plannedDate: e.target.value })}
              />
            </label>
            <label className="wide">
              <span>Topic *</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label className="wide">
              <span>Learning objective</span>
              <input
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add topic'}
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
