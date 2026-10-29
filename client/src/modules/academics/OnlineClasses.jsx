import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const EMPTY = {
  title: '',
  classId: '',
  subjectId: '',
  classDate: '',
  startTime: '',
  endTime: '',
  link: '',
  notes: '',
};
const fmt = (d) =>
  new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Live classes over a video link. Admins and teachers schedule them; the students of that class see them in their portal with a Join button. */
export default function OnlineClasses() {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [when, setWhen] = useState('upcoming');
  const [classId, setClassId] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [entry, setEntry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    const p = new URLSearchParams({ when });
    if (classId) p.set('classId', classId);
    api(`/online-classes?${p}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [when, classId]);
  useEffect(load, [load]);
  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
    api('/subjects')
      .then(setSubjects)
      .catch(() => {});
  }, []);
  const open = (c) => {
    setError('');
    setEditId(c?.id ?? null);
    setForm(
      c
        ? { ...EMPTY, ...c, subjectId: c.subjectId ?? '', endTime: c.endTime ?? '', notes: c.notes ?? '' }
        : EMPTY,
    );
    setEntry(true);
  };
  useOpenNew(() => open(null));

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(editId ? `/online-classes/${editId}` : '/online-classes', {
        method: editId ? 'PUT' : 'POST',
        body: form,
      });
      setEntry(false);
      setNotice(
        editId
          ? 'Online class updated.'
          : 'Online class scheduled. The students of that class can see it in their portal.',
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (c) => {
    setError('');
    setNotice('');
    try {
      await api(`/online-classes/${c.id}`, { method: 'DELETE' });
      setNotice('Online class deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const todayCount = rows.filter((r) => r.classDate === localDate()).length;
  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Online classes</h1>
          <p className="hint">
            Schedule a live class with a video link (Google Meet, Zoom, Teams…). Students of that class see it
            in their portal with a Join button.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="big-action" onClick={() => open(null)}>
            + Schedule class
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {[
            ['upcoming', 'Upcoming'],
            ['past', 'Past'],
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={when === k}
              className={when === k ? 'on' : ''}
              onClick={() => {
                setWhen(k);
                setPage(1);
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="toolbar">
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
                {c.name}-{c.section}
              </option>
            ))}
          </select>
          <span className="showing">
            {rows.length} classes{when === 'upcoming' && todayCount > 0 ? ` · ${todayCount} today` : ''}
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Class</th>
                <th>Topic</th>
                <th>Subject</th>
                <th>Teacher</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id}>
                  <td>{fmt(c.classDate)}</td>
                  <td>
                    {c.startTime}
                    {c.endTime ? ` – ${c.endTime}` : ''}
                  </td>
                  <td>{c.className}</td>
                  <td>
                    <b>{c.title}</b>
                    {c.notes && <small className="block">{c.notes}</small>}
                  </td>
                  <td>{c.subjectName ?? <span className="none">—</span>}</td>
                  <td>{c.teacherName ?? <span className="none">—</span>}</td>
                  <td className="row-actions">
                    <a className="btn ghost" href={c.link} target="_blank" rel="noopener noreferrer">
                      Open link
                    </a>
                    <Gate action="edit">
                      <button type="button" onClick={() => open(c)}>
                        Edit
                      </button>
                    </Gate>
                    <Gate action="delete">
                      <button type="button" className="ghost danger" onClick={() => remove(c)}>
                        Delete
                      </button>
                    </Gate>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {when === 'upcoming'
                      ? 'No online classes scheduled. Add one with “Schedule class”.'
                      : 'No past online classes.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />
      </section>

      <Modal
        open={entry}
        title={editId ? 'Edit online class' : 'Schedule an online class'}
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
            <label className="wide">
              <span>Topic *</span>
              <input
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Fractions: revision"
                required
                maxLength={160}
              />
            </label>
            <label>
              <span>Class *</span>
              <select value={form.classId} onChange={set('classId')} required>
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}-{c.section}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Subject</span>
              <select value={form.subjectId} onChange={set('subjectId')}>
                <option value="">Not specific</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Date *</span>
              <input type="date" value={form.classDate} onChange={set('classDate')} required />
            </label>
            <label>
              <span>Starts *</span>
              <input type="time" value={form.startTime} onChange={set('startTime')} required />
            </label>
            <label>
              <span>Ends</span>
              <input type="time" value={form.endTime} onChange={set('endTime')} />
            </label>
            <label className="wide">
              <span>Joining link *</span>
              <input
                type="url"
                value={form.link}
                onChange={set('link')}
                placeholder="https://meet.google.com/…"
                required
                maxLength={500}
              />
            </label>
            <label className="wide">
              <span>Notes for students</span>
              <input
                value={form.notes}
                onChange={set('notes')}
                placeholder="e.g. Keep your notebook ready"
                maxLength={500}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : editId ? 'Update' : 'Schedule class'}
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
