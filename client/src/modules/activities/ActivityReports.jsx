import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const yearEnd = () => `${new Date().getFullYear()}-12-31`;

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

const TONES = ['blue', 'green', 'violet', 'amber'];

/** Activities in a date range: turnout, achievements and the most active students. */
export default function ActivityReports() {
  const [range, setRange] = useState({ from: yearStart(), to: yearEnd() });
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/activities/summary?from=${range.from}&to=${range.to}`)
      .then(setD)
      .catch((e) => setError(e.message));
  }, [range]);

  return (
    <>
      <div className="profile-head no-print">
        <div>
          <h1>Activity reports</h1>
          <p className="hint">Turnout, achievements and the most active students for a period.</p>
        </div>
        <div className="head-actions">
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            aria-label="From"
            style={{ minHeight: 44 }}
          />
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            aria-label="To"
            style={{ minHeight: 44 }}
          />
          <button type="button" className="big-action" onClick={() => window.print()}>
            Print
          </button>
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
            {d.byKind.map((k, i) => (
              <Tile
                key={k.kind}
                icon="▤"
                tone={TONES[i % TONES.length]}
                label={`${k.label}s`}
                value={k.activities}
                hint={`${k.participants} registered · ${k.attended} attended`}
              />
            ))}
            {!d.byKind.length && (
              <Tile icon="▤" tone="blue" label="Activities" value={0} hint="none in this period" />
            )}
          </div>

          <section className="card enquiry-card">
            <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
              <span>
                <h2>Turnout</h2>
                <small>Registered against attended for each activity</small>
              </span>
            </header>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Attended</th>
                    <th>Turnout</th>
                  </tr>
                </thead>
                <tbody>
                  {d.activities.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/activities/${a.id}`}>
                          <b>{a.title}</b>
                        </Link>
                      </td>
                      <td>{a.kindLabel}</td>
                      <td>{a.startDate}</td>
                      <td style={{ textTransform: 'capitalize' }}>{a.status}</td>
                      <td>{a.registered}</td>
                      <td>{a.attended}</td>
                      <td>{a.turnoutPercent === null ? '—' : `${a.turnoutPercent}%`}</td>
                    </tr>
                  ))}
                  {!d.activities.length && (
                    <tr>
                      <td colSpan={7} className="empty-row">
                        Nothing to report.
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
                <h2>Achievements</h2>
                <small>Results and awards recorded</small>
              </span>
            </header>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Activity</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {d.achievements.map((a, i) => (
                    <tr key={i}>
                      <td>
                        <b>{a.studentName}</b>
                        <small className="block">{a.admissionNo}</small>
                      </td>
                      <td>{a.activity}</td>
                      <td>{a.kindLabel}</td>
                      <td>{a.date}</td>
                      <td>
                        <b>{a.result}</b>
                      </td>
                    </tr>
                  ))}
                  {!d.achievements.length && (
                    <tr>
                      <td colSpan={5} className="empty-row">
                        No results recorded.
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
                <h2>Most active students</h2>
                <small>By activities attended</small>
              </span>
            </header>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Activities attended</th>
                  </tr>
                </thead>
                <tbody>
                  {d.mostActive.map((s) => (
                    <tr key={s.studentId}>
                      <td>
                        <b>{s.name}</b>
                        <small className="block">{s.admissionNo}</small>
                      </td>
                      <td>{s.count}</td>
                    </tr>
                  ))}
                  {!d.mostActive.length && (
                    <tr>
                      <td colSpan={2} className="empty-row">
                        No attendance recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
