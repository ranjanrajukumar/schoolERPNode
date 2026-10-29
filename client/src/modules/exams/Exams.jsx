import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 10;
const EMPTY = { name: '', classId: '', startDate: '', endDate: '', maxMarks: 100 };
const TABS = [
  ['all', 'All exams'],
  ['upcoming', 'Upcoming'],
  ['ongoing', 'Ongoing'],
  ['done', 'Completed'],
];
const PILL = { upcoming: 'applied', ongoing: 'partial', done: 'paid', undated: '' };
const LABEL = { upcoming: 'Upcoming', ongoing: 'Ongoing', done: 'Completed', undated: 'No dates' };
const today = () => localDate();
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Where an exam stands today, from its dates. */
function stateOf(e) {
  const now = today();
  if (!e.startDate && !e.endDate) return 'undated';
  if (e.startDate && e.startDate > now) return 'upcoming';
  if (e.endDate && e.endDate < now) return 'done';
  return 'ongoing';
}

function Tile({ icon, tone, label, value, hint, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="tile card tile-button" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="tile card">{body}</div>
  );
}

/** The exam list: what is coming, running or finished, with marks and results one click away. Add and edit in a popup. */
export default function Exams() {
  const { user } = useAuth();
  const canMark = ['admin', 'teacher'].includes(user?.role);
  const canEdit = user?.role === 'admin';
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [tab, setTab] = useState('all');
  const [classId, setClassId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [entry, setEntry] = useState(null); // null | { id? }
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), canEdit); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/exams')
      .then(setExams)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
  }, []);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
    setEntry({});
  };
  const openEdit = (e) => {
    setError('');
    setNotice('');
    setForm({
      name: e.name,
      classId: e.classId,
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      maxMarks: e.maxMarks,
    });
    setEntry({ id: e.id });
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError('The exam cannot end before it starts.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api(entry.id ? `/exams/${entry.id}` : '/exams', {
        method: entry.id ? 'PUT' : 'POST',
        body: form,
      });
      setNotice(entry.id ? 'Exam updated.' : 'Exam created.');
      setEntry(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (e) => {
    setError('');
    setNotice('');
    try {
      await api(`/exams/${e.id}`, { method: 'DELETE' });
      setNotice('Exam deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const withState = exams.map((e) => ({ ...e, state: stateOf(e) }));
  const inClass = withState.filter((e) => !classId || String(e.classId) === String(classId));
  const count = (k) =>
    k === 'all'
      ? inClass.length
      : inClass.filter((e) => (k === 'upcoming' ? e.state === 'upcoming' : e.state === k)).length;
  const needle = q.trim().toLowerCase();
  const shown = inClass.filter(
    (e) =>
      (tab === 'all' || e.state === tab) &&
      (!needle || `${e.name} ${e.className}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const next = withState
    .filter((e) => e.state === 'upcoming')
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))[0];
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const exportCsv = () => {
    const head = ['Exam', 'Class', 'Starts', 'Ends', 'Max marks', 'Status'];
    const lines = shown.map((e) =>
      [e.name, e.className, e.startDate, e.endDate, e.maxMarks, LABEL[e.state]].map(csvCell).join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const l = document.createElement('a');
    l.href = url;
    l.download = 'exams.csv';
    document.body.appendChild(l);
    l.click();
    l.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Exams</h1>
          <p className="hint">Create an exam, enter marks, see results and ranks, then print report cards.</p>
        </div>
        <div className="head-actions">
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          {canEdit && (
            <button type="button" className="big-action" onClick={openNew}>
              ＋ New exam
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
        <Tile icon="▧" tone="blue" label="Exams" value={withState.length} onClick={() => goTab('all')} />
        <Tile
          icon="◷"
          tone="violet"
          label="Upcoming"
          value={withState.filter((e) => e.state === 'upcoming').length}
          hint={next ? `Next: ${next.name}, ${date(next.startDate)}` : 'Nothing scheduled'}
          onClick={() => goTab('upcoming')}
        />
        <Tile
          icon="!"
          tone="amber"
          label="Ongoing"
          value={withState.filter((e) => e.state === 'ongoing').length}
          onClick={() => goTab('ongoing')}
        />
        <Tile
          icon="✓"
          tone="green"
          label="Completed"
          value={withState.filter((e) => e.state === 'done').length}
          onClick={() => goTab('done')}
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
              onClick={() => goTab(k)}
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
              placeholder="Search exam or class…"
              aria-label="Search exams"
            />
          </label>
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPage(1);
            }}
            aria-label="Class"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.section}
              </option>
            ))}
          </select>
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
                <th>Exam</th>
                <th>Class</th>
                <th>Starts</th>
                <th>Ends</th>
                <th>Max marks</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <b>{e.name}</b>
                  </td>
                  <td>{e.className}</td>
                  <td>{date(e.startDate)}</td>
                  <td>{date(e.endDate)}</td>
                  <td>{e.maxMarks}</td>
                  <td>
                    <span className={`badge ${PILL[e.state]}`}>● {LABEL[e.state]}</span>
                  </td>
                  <td className="row-actions">
                    {canMark && (
                      <Link className="btn" to={`/exams/${e.id}/marks`}>
                        Marks
                      </Link>
                    )}
                    <Link className="btn" to={`/exams/${e.id}/results`}>
                      Results
                    </Link>
                    {canEdit && (
                      <Gate action="edit">
                        <button type="button" className="ghost" onClick={() => openEdit(e)}>
                          Edit
                        </button>
                      </Gate>
                    )}
                    {canEdit && (
                      <Gate action="delete">
                        <button type="button" className="ghost danger" onClick={() => remove(e)}>
                          Delete
                        </button>
                      </Gate>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {needle || classId || tab !== 'all'
                      ? 'No exams match.'
                      : 'No exams yet. Create the first with “New exam”.'}
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
        title={entry?.id ? 'Edit exam' : 'New exam'}
        wide={false}
        onClose={() => setEntry(null)}
      >
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Exam name *</span>
              <input
                value={form.name}
                onChange={set('name')}
                required
                maxLength={120}
                placeholder="e.g. Mid-Term Exam"
              />
            </label>
            <label>
              <span>Class *</span>
              <select value={form.classId} onChange={set('classId')} required>
                <option value="">Choose a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.section}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Max marks per subject *</span>
              <input type="number" min="1" value={form.maxMarks} onChange={set('maxMarks')} required />
            </label>
            <label>
              <span>Starts</span>
              <input type="date" value={form.startDate} onChange={set('startDate')} />
            </label>
            <label>
              <span>Ends</span>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={set('endDate')}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : entry?.id ? 'Save changes' : 'Create exam'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(null)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
