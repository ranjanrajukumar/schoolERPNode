import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { BOARD_BELLS } from '../../config/boardPresets.js';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FALLBACK = [1, 2, 3, 4, 5, 6, 7, 8].map((p) => ({ period: p, label: `Period ${p}`, kind: 'class' }));
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toHHMM = (m) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
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
  // ?view=teacher shows one teacher's week (read-only). A teacher opens their own week first.
  const [params, setParams] = useSearchParams();
  const teacherView = params.get('view') === 'teacher';
  const [teacherId, setTeacherId] = useState(
    user?.role === 'teacher' && user?.staffId ? String(user.staffId) : '',
  );
  const [teacherSlots, setTeacherSlots] = useState([]);
  const switchView = (v) => setParams(v === 'teacher' ? { view: 'teacher' } : {});
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [classId, setClassId] = useState('');
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [times, setTimes] = useState([]); // bell times: [{ period, start, end }]
  const [timesForm, setTimesForm] = useState(null); // the times popup, while it is open
  const [day, setDay] = useState(1); // 0 = the whole week, 1-6 = one day; opens on Monday
  const [avail, setAvail] = useState(null); // the teacher availability popup: { staffId, blocked: Set('day|period') }
  const [gen, setGen] = useState(null); // the auto-generate popup: { scope, replace, result }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // each class follows its board's bell times
  const board = classes.find((c) => String(c.id) === String(classId))?.board ?? 'CBSE';
  useEffect(() => {
    api(`/timetable/periods?board=${encodeURIComponent(board)}`)
      .then(setTimes)
      .catch(() => {});
  }, [board]);

  useEffect(() => {
    api('/classes').then(setClasses);
    api('/subjects').then(setSubjects);
    api('/scheduling/rooms')
      .then(setRooms)
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!classId) return setSlots([]);
    api(`/timetable?classId=${classId}`)
      .then(setSlots)
      .catch((e) => setError(e.message));
  }, [classId]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!teacherView || !teacherId) return setTeacherSlots([]);
    api(`/timetable?staffId=${teacherId}`)
      .then(setTeacherSlots)
      .catch((e) => setError(e.message));
  }, [teacherView, teacherId]);

  const cell = (day, period) =>
    (teacherView ? teacherSlots : slots).find((s) => s.day === day && s.period === period);

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

  // opens the popup for one period, filled with what is already there so it can be changed
  const openSlot = (d, p) => {
    const slot = cell(d, p);
    setError('');
    setForm({
      day: d,
      period: p,
      subjectId: slot?.subjectId ?? '',
      staffId: slot?.staffId ?? '',
      roomId: slot?.roomId ?? '',
    });
    setEntry(true);
  };

  const timeOf = (p) => {
    const t = times.find((x) => x.period === p);
    return t ? `${t.start}–${t.end}` : '';
  };

  // the chosen class's week as a spreadsheet: one row per period, one column per day
  const exportCsv = () => {
    const cls = classes.find((c) => String(c.id) === String(classId));
    const head = ['Period', 'Time', ...DAYS];
    const lines = rows.map((r) => {
      if (r.kind === 'break') return [r.label, timeOf(r.period), ...DAYS.map(() => r.label)];
      return [
        r.label,
        timeOf(r.period),
        ...DAYS.map((_, i) => {
          const c = slots.find((x) => x.day === i + 1 && x.period === r.period);
          return c ? [c.subjectName, c.teacherName, c.roomName].filter(Boolean).join(' · ') : '';
        }),
      ];
    });
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + [head, ...lines].map((l) => l.map(csvCell).join(',')).join('\r\n')], {
        type: 'text/csv',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable-${cls ? `${cls.name}-${cls.section}` : 'class'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openAvail = async (staffId) => {
    setError('');
    const list = staffId ? await api(`/timetable/availability?staffId=${staffId}`).catch(() => []) : [];
    setAvail({ staffId, blocked: new Set(list.map((b) => `${b.day}|${b.period}`)) });
  };
  const saveAvail = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/timetable/availability', {
        method: 'PUT',
        body: {
          staffId: avail.staffId,
          blocked: [...avail.blocked].map((k) => ({
            day: Number(k.split('|')[0]),
            period: Number(k.split('|')[1]),
          })),
        },
      });
      setAvail(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const generate = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api('/timetable/generate', {
        method: 'POST',
        body: { classIds: gen.scope === 'all' ? [] : [Number(classId)], replace: gen.replace },
      });
      setGen({ ...gen, result });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTimes = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      setTimes(
        await api(`/timetable/periods?board=${encodeURIComponent(board)}`, {
          method: 'PUT',
          body: timesForm,
        }),
      );
      setTimesForm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const shownDays = DAYS.map((name, i) => ({ name, n: i + 1 })).filter((d) => !day || d.n === day);
  // the school day: every row (class periods and breaks) in time order; before any times are saved, eight plain periods
  const rows = times.length ? times : FALLBACK;
  const classRows = rows.filter((r) => r.kind !== 'break');
  const labelOf = (p) => rows.find((r) => r.period === p)?.label ?? `Period ${p}`;
  const total = DAYS.length * classRows.length;
  const subjectCount = new Set(slots.map((s) => s.subjectName)).size;
  const teacherCount = new Set(slots.map((s) => s.teacherName).filter(Boolean)).size;
  const editable = canEdit && Boolean(classId);
  const week = () => {
    const canClick = editable && !teacherView;
    return (
      <section className="card enquiry-card">
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>Period</th>
                {shownDays.map((d) => (
                  <th key={d.name}>{d.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = r.period;
                if (r.kind === 'break')
                  return (
                    <tr key={p} className="break-row">
                      <th>
                        {r.label}
                        <br />
                        <small className="slot-time">{timeOf(p)}</small>
                      </th>
                      <td colSpan={shownDays.length}>{r.label}</td>
                    </tr>
                  );
                return (
                  <tr key={p}>
                    <th>
                      {r.label}
                      {timeOf(p) && (
                        <>
                          <br />
                          <small className="slot-time">{timeOf(p)}</small>
                        </>
                      )}
                    </th>
                    {shownDays.map((d) => {
                      const slot = cell(d.n, p);
                      return (
                        <td
                          key={d.name}
                          className={canClick ? 'slot-cell' : undefined}
                          onClick={canClick ? () => openSlot(d.n, p) : undefined}
                        >
                          {!slot && canClick && <span className="slot-add">+ Add</span>}
                          {slot && (
                            <>
                              <b>{teacherView ? slot.className : slot.subjectName}</b>
                              <br />
                              <small>
                                {teacherView ? slot.subjectName : (slot.teacherName ?? 'No teacher yet')}
                                {slot.roomName && ` · ${slot.roomName}`}
                              </small>
                              {canClick && (
                                <button
                                  type="button"
                                  className="link"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clear(slot);
                                  }}
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
                );
              })}
            </tbody>
          </table>
        </div>
        {!teacherView && !classId && (
          <p className="empty-row" style={{ padding: 22, margin: 0 }}>
            Choose a class to see its timetable.
          </p>
        )}
        {teacherView && !teacherId && (
          <p className="empty-row" style={{ padding: 22, margin: 0 }}>
            Choose a teacher to see their week.
          </p>
        )}
      </section>
    );
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Timetable</h1>
          <p className="hint">
            Choose a class to see its week
            {canEdit ? '. Click a period to set its subject, teacher and room' : ''}.
          </p>
        </div>
        <div className="head-actions">
          {canEdit && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setError('');
                setTimesForm(
                  rows.map((t, i) => ({
                    start: toHHMM(8 * 60 + i * 40),
                    end: toHHMM(8 * 60 + i * 40 + 40),
                    ...t,
                  })),
                );
              }}
            >
              Time slots
            </button>
          )}
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="tabs" role="tablist" aria-label="Day">
        {['Whole week', ...DAYS].map((name, i) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={day === i}
            className={`tab${day === i ? ' active' : ''}`}
            onClick={() => setDay(i)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="profile-head">
        <h2 style={{ margin: 0 }}>{teacherView ? 'Teacher timetable' : 'Class timetable'}</h2>
        <div className="head-actions">
          <div className="tabs-line" role="tablist" aria-label="Timetable by">
            {[
              ['class', 'By class'],
              ['teacher', 'By teacher'],
            ].map(([v, text]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={(v === 'teacher') === teacherView}
                className={`tab${(v === 'teacher') === teacherView ? ' active' : ''}`}
                onClick={() => switchView(v)}
              >
                {text}
              </button>
            ))}
          </div>
          {teacherView && (
            <TypeaheadSelect
              kind="staff"
              value={teacherId}
              onChange={(id) => setTeacherId(id ? String(id) : '')}
              filters={{ status: 'active' }}
              placeholder="Find a teacher…"
            />
          )}
          {!teacherView && (
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
          )}
          {canEdit && !teacherView && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setError('');
                setGen({ scope: classId ? 'one' : 'all', replace: true, result: null });
              }}
            >
              ✦ Auto-generate
            </button>
          )}
          {canEdit && (
            <button type="button" className="ghost" onClick={() => openAvail('')}>
              Teacher availability
            </button>
          )}
          {classId && !teacherView && (
            <>
              <button type="button" className="ghost" onClick={exportCsv}>
                Export CSV
              </button>
              <button type="button" className="ghost" onClick={() => window.print()}>
                Print
              </button>
            </>
          )}
          {editable && !teacherView && (
            <button
              type="button"
              className="big-action"
              onClick={() => {
                setError('');
                setForm({ ...EMPTY, day: day || 1 });
                setEntry(true);
              }}
            >
              + Set period
            </button>
          )}
        </div>
      </div>
      {!teacherView && (
        <div className="stats enquiry-tiles four">
          <Tile
            icon="▤"
            tone="blue"
            label="Periods set"
            value={slots.length}
            hint={`of ${total} in a week`}
          />
          <Tile icon="✓" tone="green" label="Subjects" value={subjectCount} />
          <Tile icon="♙" tone="violet" label="Teachers" value={teacherCount} />
          <Tile
            icon="!"
            tone="amber"
            label="Periods without a teacher"
            value={slots.filter((s) => !s.teacherName).length}
          />
        </div>
      )}
      {week()}

      <Modal
        open={entry}
        title={`${DAYS[form.day - 1]} · ${labelOf(form.period)}${timeOf(form.period) ? ` · ${timeOf(form.period)}` : ''}`}
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
                {classRows.map((r) => (
                  <option key={r.period} value={r.period}>
                    {r.label}
                    {timeOf(r.period) && ` (${timeOf(r.period)})`}
                  </option>
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

      <Modal open={Boolean(avail)} title="Teacher availability" wide onClose={() => setAvail(null)}>
        {avail && (
          <form onSubmit={saveAvail} className="enquiry-form">
            <p className="hint">
              Tick the periods this teacher cannot teach. Auto-generate and manual entry will keep them free.
              A period the teacher already has in the timetable must be moved first.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <label>
              <span>Teacher</span>
              <TypeaheadSelect
                kind="staff"
                value={avail.staffId}
                onChange={(id) => openAvail(id)}
                filters={{ status: 'active' }}
                placeholder="Find a teacher…"
              />
            </label>
            {avail.staffId && (
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
                    {classRows.map((r) => (
                      <tr key={r.period}>
                        <th>
                          {r.label}
                          <small className="slot-time">{timeOf(r.period)}</small>
                        </th>
                        {DAYS.map((_, i) => {
                          const key = `${i + 1}|${r.period}`;
                          return (
                            <td key={key}>
                              <input
                                type="checkbox"
                                aria-label={`${DAYS[i]} ${r.label} unavailable`}
                                checked={avail.blocked.has(key)}
                                onChange={(e) => {
                                  const next = new Set(avail.blocked);
                                  if (e.target.checked) next.add(key);
                                  else next.delete(key);
                                  setAvail({ ...avail, blocked: next });
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="form-actions">
              <button type="submit" disabled={busy || !avail.staffId}>
                {busy ? 'Saving…' : 'Save availability'}
              </button>
              <button type="button" className="ghost" onClick={() => setAvail(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(gen)} title="Auto-generate timetable" onClose={() => setGen(null)}>
        {gen && (
          <form onSubmit={generate} className="enquiry-form">
            <p className="hint">
              Fills the week from each class's subjects, periods per week and teacher (set under Class
              subjects). No teacher, class or lab is booked twice, a teacher gets at most six periods a day,
              and practicals take a double period in a lab. Electives are left for you to place by hand.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <label>
              <span>Generate for</span>
              <select
                value={gen.scope}
                onChange={(e) => setGen({ ...gen, scope: e.target.value, result: null })}
              >
                {classId && <option value="one">Only the chosen class</option>}
                <option value="all">All classes</option>
              </select>
            </label>
            <label>
              <span>Existing entries</span>
              <select
                value={gen.replace ? 'replace' : 'keep'}
                onChange={(e) => setGen({ ...gen, replace: e.target.value === 'replace', result: null })}
              >
                <option value="replace">Replace them</option>
                <option value="keep">Keep them and fill the gaps</option>
              </select>
            </label>
            {gen.result && (
              <div className="card" style={{ padding: 12 }}>
                <p className="success">
                  Placed {gen.result.placed} periods for {gen.result.classes} class(es).
                </p>
                {gen.result.unplaced.length > 0 && (
                  <>
                    <b>Could not fit ({gen.result.unplaced.length})</b>
                    <ul>
                      {gen.result.unplaced.slice(0, 12).map((u, i) => (
                        <li key={i}>
                          {u.className} · {u.subject} ({u.periods} period{u.periods > 1 ? 's' : ''})
                        </li>
                      ))}
                    </ul>
                    <p className="hint">
                      Usually a teacher is overloaded or a class has more periods than the week holds.
                    </p>
                  </>
                )}
                {gen.result.noTeacher.length > 0 && (
                  <p className="hint">No teacher assigned: {gen.result.noTeacher.slice(0, 8).join(', ')}</p>
                )}
                {gen.result.defaulted.length > 0 && (
                  <p className="hint">
                    {gen.result.defaulted.length} subject(s) had no periods per week set, so 4 were used (2
                    for practicals).
                  </p>
                )}
                {gen.result.skipped.length > 0 && (
                  <p className="hint">{gen.result.skipped.length} elective(s) skipped.</p>
                )}
              </div>
            )}
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Generating…' : gen.result ? 'Generate again' : 'Generate'}
              </button>
              <button type="button" className="ghost" onClick={() => setGen(null)}>
                Close
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(timesForm)}
        title={`Time slots · ${board}`}
        wide
        onClose={() => setTimesForm(null)}
      >
        {timesForm && (
          <form onSubmit={saveTimes} className="enquiry-form">
            <p className="hint">
              The school day is the same for every class. Add a row for each period or break, in time order,
              using 24-hour times. Class periods can then be mapped to a subject and teacher in the timetable;
              breaks cannot. A row that already has timetable entries cannot be removed or made a break.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="toolbar">
              <span className="hint">Start from a board pattern:</span>
              {Object.entries(BOARD_BELLS)
                .filter(([key]) => (board === 'UP Board') === (key === 'UP'))
                .map(([key, b]) => (
                  <button key={key} type="button" className="ghost" onClick={() => setTimesForm(b.rows())}>
                    {b.label}
                  </button>
                ))}
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {timesForm.map((t, i) => {
                  const set = (patch) =>
                    setTimesForm(timesForm.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <tr key={t.period}>
                      <td>{t.period}</td>
                      <td>
                        <input
                          required
                          maxLength={30}
                          value={t.label}
                          aria-label={`Row ${t.period} name`}
                          onChange={(e) => set({ label: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={t.kind}
                          aria-label={`Row ${t.period} type`}
                          onChange={(e) => set({ kind: e.target.value })}
                        >
                          <option value="class">Class period</option>
                          <option value="break">Break</option>
                        </select>
                      </td>
                      {['start', 'end'].map((k) => (
                        <td key={k}>
                          <input
                            type="time"
                            required
                            value={t[k]}
                            aria-label={`Row ${t.period} ${k}`}
                            onChange={(e) => set({ [k]: e.target.value })}
                          />
                        </td>
                      ))}
                      <td>
                        {i === timesForm.length - 1 && timesForm.length > 1 && (
                          <button
                            type="button"
                            className="link"
                            aria-label="Remove last row"
                            onClick={() => setTimesForm(timesForm.slice(0, -1))}
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {timesForm.length < 12 && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  const start = timesForm.length ? timesForm[timesForm.length - 1].end : '08:00';
                  const n = timesForm.length + 1;
                  setTimesForm([
                    ...timesForm,
                    { period: n, label: `Period ${n}`, kind: 'class', start, end: toHHMM(toMin(start) + 40) },
                  ]);
                }}
              >
                + Add period or break
              </button>
            )}
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save time slots'}
              </button>
              <button type="button" className="ghost" onClick={() => setTimesForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
