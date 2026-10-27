import TableCard from '../../components/TableCard.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

const Cell = ({ ok, children }) => <td className={ok ? 'cell-ok' : 'cell-gap'}>{children}</td>;

/** One row per class: is everything a class needs in place? Gaps link straight to the screen that fixes them. */
export default function ClassMap() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/setup/classes').then(setRows).catch((e) => setError(e.message)); }, []);
  if (!rows) return error ? <p className="error">{error}</p> : <div className="skeleton hero-skeleton" />;

  const ready = rows.filter((r) => r.ready).length;
  return (
    <>
      <h1>Class readiness</h1>
      <p className="hint">A class is ready when it has a class teacher, subjects with a teacher each, a timetable and a fee structure. Students are not required: a class can be set up before it is filled.</p>
      <div className="stats">
        <div className="card tile"><span className="tile-icon green" aria-hidden="true">✅</span><span className="tile-text"><span>Ready</span><b>{ready}</b></span></div>
        <div className="card tile"><span className="tile-icon amber" aria-hidden="true">🛠️</span><span className="tile-text"><span>Need work</span><b>{rows.length - ready}</b></span></div>
        <div className="card tile"><span className="tile-icon blue" aria-hidden="true">🎓</span><span className="tile-text"><span>Students placed</span><b>{rows.reduce((n, r) => n + r.students, 0)}</b></span></div>
      </div>
      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <TableCard>
          <thead><tr><th>Class</th><th>Class teacher</th><th>Students</th><th>Subjects</th><th>Timetable</th><th>Fee items</th><th>Exams</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <Cell ok={Boolean(r.classTeacher)}>{r.classTeacher ?? 'not set'}</Cell>
                <td>{r.students}</td>
                <Cell ok={r.subjects > 0 && r.subjectsWithoutTeacher === 0}>{r.subjects}{r.subjectsWithoutTeacher > 0 && <small> ({r.subjectsWithoutTeacher} without teacher)</small>}</Cell>
                <Cell ok={r.timetablePeriods > 0}>{r.timetablePeriods} period{r.timetablePeriods === 1 ? '' : 's'}</Cell>
                <Cell ok={r.feeItems > 0}>{r.feeItems}</Cell>
                <td>{r.exams}</td>
                <td>
                  {r.ready ? <span className="badge paid">ready</span> : (
                    <ul className="gaps">{r.issues.map((i) => <li key={i.text}><Link to={i.link}>{i.text}</Link></li>)}</ul>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8}>No classes yet. <Link to="/classes">Create the first class</Link></td></tr>}
          </tbody>
        </TableCard>
      </div>
    </>
  );
}
