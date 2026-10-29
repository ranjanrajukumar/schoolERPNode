import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const EMPTY = { day: 1, period: 1, subjectId: '', staffId: '', roomId: '' };

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

/** Weekly timetable of a class: pick the class, then set the subject, teacher and room of each period. */
export default function Timetable() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [classId, setClassId] = useState('');
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/classes').then(setClasses);
    api('/subjects').then(setSubjects);
    api('/scheduling/rooms')
      .then(setRooms)
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!classId) {
      setSlots([]);
      return;
    }
    api(`/timetable?classId=${classId}`)
      .then(setSlots)
      .catch((e) => setError(e.message));
  }, [classId]);
  useEffect(load, [load]);

  const cell = (day, period) => slots.find((s) => s.day === day && s.period === period);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/timetable', { method: 'POST', body: { ...form, classId } });
      setEntry(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async (slot) => {
    await api(`/timetable/${slot.id}`, { method: 'DELETE' });
    load();
  };

  const total = DAYS.length * PERIODS.length;
  const subjectCount = new Set(slots.map((s) => s.subjectName)).size;
  const teacherCount = new Set(slots.map((s) => s.teacherName).filter(Boolean)).size;
  const noTeacher = slots.filter((s) => !s.teacherName).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Timetable</h1>
          <p className="hint">
            Choose a class to see its week
            {canEdit ? ' and set the subject, teacher and room of each period' : ''}.
          </p>
        </div>
        <div className="head-actions">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            aria-label="Class"
            style={{ minHeight: 44 }}
          >
            <option value="">-- choose class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
          {canEdit && classId && (
            <button
              type="button"
              className="big-action"
              onClick={() => {
                setError('');
                setForm(EMPTY);
                setEntry(true);
              }}
            >
              + Set period
            </button>
          )}
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Periods set" value={slots.length} hint={`of ${total} in a week`} />
        <Tile icon="✓" tone="green" label="Subjects" value={subjectCount} />
        <Tile icon="♙" tone="violet" label="Teachers" value={teacherCount} />
        <Tile icon="!" tone="amber" label="Periods without a teacher" value={noTeacher} />
      </div>

      <section className="card enquiry-card">
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>Period</th>
                {DAYS.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p) => (
                <tr key={p}>
                  <th>{p}</th>
                  {DAYS.map((d, i) => {
                    const slot = cell(i + 1, p);
                    return (
                      <td key={d}>
                        {slot && (
                          <>
                            <b>{slot.subjectName}</b>
                            <br />
                            <small>
                              {slot.teacherName}
                              {slot.roomName && ` · ${slot.roomName}`}
                            </small>
                            {canEdit && (
                              <button
                                type="button"
                                className="link"
                                onClick={() => clear(slot)}
                                aria-label={`Clear ${slot.subjectName}`}
                              >
                                ×
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!classId && (
          <p className="empty-row" style={{ padding: 22, margin: 0 }}>
            Choose a class to see its timetable.
          </p>
        )}
      </section>

      <Modal open={entry} title="Set period" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label>
              <span>Day</span>
              <select value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Period</span>
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: Number(e.target.value) })}
              >
                {PERIODS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="wide">
              <span>Subject *</span>
              <select
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                required
              >
                <option value="">--</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              <span>Teacher</span>
              <TypeaheadSelect
                kind="staff"
                value={form.staffId}
                onChange={(id) => setForm({ ...form, staffId: id })}
                filters={{ status: 'active' }}
              />
            </label>
            <label className="wide">
              <span>Room</span>
              <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                <option value="">--</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Set period'}
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
