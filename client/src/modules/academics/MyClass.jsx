import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const TABS = [
  ['all', 'All students'],
  ['present', 'Present'],
  ['absent', 'Absent'],
  ['late', 'Late'],
  ['none', 'Not marked'],
  ['leave', 'On leave'],
];
const label = (c) => `${c.name} · ${c.section}`;

function Tile({ icon, tone, label: text, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{text}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </div>
  );
}

/** The class teacher's page: their class's roll, today's attendance and leave waiting for a decision. */
export default function MyClass() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // A teacher sees the classes they are class teacher of; an admin can look at any class.
  useEffect(() => {
    api(admin ? '/classes' : '/my-class')
      .then((c) => {
        setClasses(c);
        if (c[0]) setClassId((id) => id || String(c[0].id));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, [admin]);
  useEffect(() => {
    if (!classId) {
      setD(null);
      return;
    }
    setError('');
    setPage(1);
    api(`/my-class/${classId}`)
      .then(setD)
      .catch((e) => setError(e.message));
  }, [classId]);

  const students = d?.students ?? [];
  const isOnLeave = (s) => s.leave === 'on leave';
  const count = (k) =>
    k === 'all'
      ? students.length
      : k === 'none'
        ? students.filter((s) => !s.today).length
        : k === 'leave'
          ? students.filter(isOnLeave).length
          : students.filter((s) => s.today === k).length;
  const needle = q.trim().toLowerCase();
  const shown = students.filter((s) => {
    const inTab =
      tab === 'all' || (tab === 'none' ? !s.today : tab === 'leave' ? isOnLeave(s) : s.today === tab);
    return (
      inTab &&
      (!needle || `${s.name} ${s.admissionNo} ${s.guardianName ?? ''}`.toLowerCase().includes(needle))
    );
  });
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  if (loaded && !classes.length && !error) {
    return (
      <>
        <div className="profile-head">
          <div>
            <h1>My class</h1>
          </div>
        </div>
        <section className="card enquiry-card">
          <p className="empty-row" style={{ padding: 28 }}>
            {admin
              ? 'There are no classes yet.'
              : 'You are not the class teacher of any class yet. Ask the admin to set you as class teacher on the class, and to link your login to your staff record under Users.'}
          </p>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>My class{d ? ` — ${label(d)}` : ''}</h1>
          <p className="hint">
            {d
              ? `Today, ${new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${d.room ? ` · Room ${d.room}` : ''}`
              : 'Your class today.'}
          </p>
        </div>
        <div className="head-actions">
          {classes.length > 1 && (
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              aria-label="Class"
              style={{ minHeight: 44 }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {label(c)}
                </option>
              ))}
            </select>
          )}
          {d && (
            <Link className="big-action" to={`/attendance?classId=${d.id}`}>
              Take attendance
            </Link>
          )}
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {d && (
        <>
          <div className="stats enquiry-tiles four">
            <Tile icon="♙" tone="blue" label="Students" value={d.totals.students} />
            <Tile
              icon="✓"
              tone="green"
              label="Present today"
              value={d.totals.present + d.totals.late}
              hint={d.totals.late ? `${d.totals.late} late` : null}
            />
            <Tile
              icon="×"
              tone="red"
              label="Absent today"
              value={d.totals.absent}
              hint={d.totals.notMarked ? `${d.totals.notMarked} not marked yet` : null}
            />
            <Tile
              icon="◷"
              tone="amber"
              label="Leave to decide"
              value={d.totals.pendingLeaves}
              hint={d.totals.pendingLeaves ? 'Open Student leave' : null}
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
                  placeholder="Search student or guardian…"
                  aria-label="Search students"
                />
              </label>
              <Link to="/student-leaves" style={{ fontWeight: 600 }}>
                Student leave{d.totals.pendingLeaves ? ` (${d.totals.pendingLeaves})` : ''}
              </Link>
              <span className="showing">{shown.length} students</span>
            </div>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Guardian</th>
                    <th>Today</th>
                    <th>Leave</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <b>{s.name}</b>
                        <small className="block">{s.admissionNo}</small>
                      </td>
                      <td>
                        {s.guardianName ?? '—'}
                        {s.guardianPhone && <small className="block">{s.guardianPhone}</small>}
                      </td>
                      <td>
                        {s.today ? (
                          <span
                            className={`badge ${s.today === 'present' ? 'paid' : s.today === 'late' ? 'partial' : 'rejected'}`}
                          >
                            ● {s.today}
                          </span>
                        ) : (
                          <span className="muted">Not marked</span>
                        )}
                      </td>
                      <td>
                        {s.leave ? (
                          <span className={`badge ${s.leave === 'leave requested' ? 'partial' : 'paid'}`}>
                            {s.leave}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="row-actions">
                        <Link to={`/students/${s.id}/profile`}>Details</Link>
                      </td>
                    </tr>
                  ))}
                  {!pageRows.length && (
                    <tr>
                      <td colSpan={5} className="empty-row">
                        {needle || tab !== 'all' ? 'No students match.' : 'No students in this class.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
          </section>
        </>
      )}
    </>
  );
}
