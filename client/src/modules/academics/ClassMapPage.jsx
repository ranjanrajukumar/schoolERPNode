import { useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import SubjectMapModal from '../../components/SubjectMapModal.jsx';

const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const money = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TONE = { theory: 'applied', practical: 'partial', theory_practical: 'paid' };

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

function Panel({ title, sub, to, link, action, children }) {
  return (
    <section className="card dash-card">
      <header className="dash-head">
        <span>
          <h2>{title}</h2>
          {sub && <small>{sub}</small>}
        </span>
        <span className="panel-actions">
          {action}
          {to && <Link to={to}>{link} →</Link>}
        </span>
      </header>
      {children}
    </section>
  );
}

/**
 * One class as the school actually runs it: its teacher and students, the subject map (core and elective, theory and practical),
 * the fee items its students are billed, the activities open to it, and the bus routes and hostel its students use.
 */
export default function ClassMapPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [map, setMap] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [entry, setEntry] = useState(null); // null | { row } (row = the subject being edited, or null to add)
  const canWrite = useAuth().user?.role === 'admin';

  useEffect(() => {
    api('/classes')
      .then((c) => {
        setClasses(c);
        if (c[0]) setClassId((id) => id || String(c[0].id));
      })
      .catch((e) => setError(e.message));
  }, []);
  const load = () =>
    api(`/classes/${classId}/map`)
      .then(setMap)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (classId) {
      setMap(null);
      setNotice('');
      load();
    }
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps
  const remove = async (sub) => {
    setError('');
    setNotice('');
    try {
      await api(`/class-subjects/${sub.id}`, { method: 'DELETE' });
      setNotice('Subject removed.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const core = map?.subjects.filter((s) => !s.isElective) ?? [];
  const electives = map?.subjects.filter((s) => s.isElective) ?? [];
  const pct =
    map && map.timetable.periodsPlanned
      ? Math.min(100, Math.round((map.timetable.periodsPlaced / map.timetable.periodsPlanned) * 100))
      : null;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Class map</h1>
          <p className="hint">
            One class on a page: teacher, subjects, fees, activities, transport and hostel, as the school
            actually runs it.
          </p>
        </div>
        <div className="head-actions">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            aria-label="Class"
            style={{ minHeight: 44 }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.section}
              </option>
            ))}
          </select>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!map && !error && <p>Loading…</p>}

      {map && (
        <>
          <div className="stats enquiry-tiles four">
            <Tile
              icon="♙"
              tone="blue"
              label="Students"
              value={map.students}
              hint={map.teacher ? `Class teacher: ${map.teacher}` : 'No class teacher yet'}
            />
            <Tile
              icon="▧"
              tone="violet"
              label="Subjects"
              value={map.subjects.length}
              hint={`${core.length} core, ${electives.length} elective`}
            />
            <Tile
              icon="▣"
              tone="amber"
              label="Fees per student"
              value={money(map.fees.total)}
              hint={`${map.fees.items.length} fee item${map.fees.items.length === 1 ? '' : 's'}`}
            />
            <Tile
              icon="◷"
              tone="green"
              label="Timetable"
              value={pct === null ? '—' : `${pct}%`}
              hint={
                map.timetable.periodsPlanned
                  ? `${map.timetable.periodsPlaced} of ${map.timetable.periodsPlanned} periods placed`
                  : `${map.timetable.periodsPlaced} periods placed`
              }
            />
          </div>

          <div className="dash-grid">
            <Panel
              title="Subject map"
              sub={`${map.className}${map.room ? ` · room ${map.room}` : ''}`}
              to="/class-subjects"
              link="Elective choices"
              action={
                canWrite && (
                  <button
                    type="button"
                    className="big-action small"
                    onClick={() => {
                      setError('');
                      setNotice('');
                      setEntry({ row: null });
                    }}
                  >
                    ＋ Add a subject
                  </button>
                )
              }
            >
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Taught as</th>
                    <th>Teacher</th>
                    <th>Students</th>
                    {canWrite && <th />}
                  </tr>
                </thead>
                <tbody>
                  {map.subjects.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <b>{s.name}</b>
                      </td>
                      <td>
                        {s.isElective ? (
                          <span className="badge partial">
                            Elective{s.electiveGroup ? ` · ${s.electiveGroup}` : ''}
                          </span>
                        ) : (
                          <span className="badge paid">Core</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${TONE[s.component]}`}>{s.componentLabel}</span>
                        {s.periodsPerWeek ? (
                          <small className="block">{s.periodsPerWeek} periods / week</small>
                        ) : null}
                      </td>
                      <td>{s.teacherName ?? <span className="none">Not assigned</span>}</td>
                      <td>{s.takers}</td>
                      {canWrite && (
                        <td className="row-actions">
                          <Gate action="edit">
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => {
                                setError('');
                                setNotice('');
                                setEntry({ row: s });
                              }}
                            >
                              Edit
                            </button>
                          </Gate>
                          <Gate action="delete">
                            <button type="button" className="ghost danger" onClick={() => remove(s)}>
                              Remove
                            </button>
                          </Gate>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!map.subjects.length && (
                    <tr>
                      <td colSpan={canWrite ? 6 : 5} className="empty-row">
                        No subjects yet. {canWrite ? 'Use “Add a subject”.' : ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Panel>

            <Panel
              title="Fees"
              sub="Billed to every student when the class is billed"
              to="/fee-structures"
              link="Fee structure"
            >
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Amount</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {map.fees.items.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <b>{f.title}</b>
                      </td>
                      <td>{money(f.amount)}</td>
                      <td>{date(f.dueDate)}</td>
                    </tr>
                  ))}
                  {!map.fees.items.length && (
                    <tr>
                      <td colSpan={3} className="empty-row">
                        No fee items yet.
                      </td>
                    </tr>
                  )}
                  {map.fees.items.length > 0 && (
                    <tr>
                      <td>
                        <b>Total</b>
                      </td>
                      <td>
                        <b>{money(map.fees.total)}</b>
                      </td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </Panel>
          </div>

          <div className="dash-grid even">
            <Panel title="Activities" sub="Open to this class" to="/activities" link="All activities">
              <ul className="activity">
                {map.activities.map((a) => (
                  <li key={a.id}>
                    <span className="tile-icon violet" aria-hidden="true">
                      ✦
                    </span>
                    <span>
                      <b>{a.title}</b>
                      <small>
                        {a.kind.replace('_', ' ')}
                        {a.forThisClassOnly ? ' · this class only' : ' · whole school'}
                        {Number(a.fee) > 0 ? ` · fee ${money(a.fee)}` : ''}
                      </small>
                    </span>
                    <time>{date(a.startDate)}</time>
                  </li>
                ))}
                {!map.activities.length && <li className="hint">Nothing planned for this class.</li>}
              </ul>
            </Panel>

            <Panel
              title="Transport and hostel"
              sub="Where the students travel and sleep"
              to="/transport-assignments"
              link="Route assignment"
            >
              <ul className="activity">
                <li>
                  <span className="tile-icon blue" aria-hidden="true">
                    ▤
                  </span>
                  <span>
                    <b>
                      {map.transport.riders} of {map.students} students ride a bus
                    </b>
                    <small>
                      {map.transport.routes.map((r) => `${r.name} (${r.riders})`).join(' · ') ||
                        'No routes used yet'}
                    </small>
                  </span>
                </li>
                <li>
                  <span className="tile-icon green" aria-hidden="true">
                    ♙
                  </span>
                  <span>
                    <b>
                      {map.hostel.boarders} boarder{map.hostel.boarders === 1 ? '' : 's'}
                    </b>
                    <small>
                      <Link to="/hostel-allocation">Room allocation</Link>
                    </small>
                  </span>
                </li>
              </ul>
            </Panel>
          </div>
        </>
      )}
      <SubjectMapModal
        open={Boolean(entry)}
        classId={classId}
        subject={entry?.row ?? null}
        groups={[
          ...new Set(
            (map?.subjects ?? []).filter((x) => x.isElective && x.electiveGroup).map((x) => x.electiveGroup),
          ),
        ]}
        onClose={() => setEntry(null)}
        onSaved={(message) => {
          setNotice(message);
          setEntry(null);
          load();
        }}
      />
    </>
  );
}
