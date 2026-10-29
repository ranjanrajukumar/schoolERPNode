import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

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

/** One teacher's week of lessons. */
export default function TeacherTimetable() {
  const [staffId, setStaffId] = useState('');
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!staffId) {
      setSlots([]);
      return;
    }
    api(`/timetable?staffId=${staffId}`)
      .then(setSlots)
      .catch((e) => setError(e.message));
  }, [staffId]);

  const cell = (day, period) => slots.find((s) => s.day === day && s.period === period);
  const periodsPerWeek = slots.length;
  const busiest = DAYS.map((d, i) => [d, slots.filter((s) => s.day === i + 1).length]).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Teacher timetable</h1>
          <p className="hint">Choose a teacher to see every lesson they take in the week.</p>
        </div>
        <div className="head-actions" style={{ minWidth: 260 }}>
          <TypeaheadSelect
            kind="staff"
            value={staffId}
            onChange={(id) => setStaffId(id)}
            filters={{ status: 'active' }}
          />
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Periods a week" value={periodsPerWeek} />
        <Tile
          icon="✓"
          tone="green"
          label="Classes taught"
          value={new Set(slots.map((s) => s.className)).size}
        />
        <Tile
          icon="♙"
          tone="violet"
          label="Subjects taught"
          value={new Set(slots.map((s) => s.subjectName)).size}
        />
        <Tile
          icon="◷"
          tone="amber"
          label="Busiest day"
          value={busiest && busiest[1] ? busiest[0] : '—'}
          hint={busiest && busiest[1] ? `${busiest[1]} periods` : null}
        />
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
                            <small>{slot.className}</small>
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
        {!staffId && (
          <p className="empty-row" style={{ padding: 22, margin: 0 }}>
            Choose a teacher to see their timetable.
          </p>
        )}
      </section>
    </>
  );
}
