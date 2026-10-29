import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

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

/** Clinic visits, incidents and inspections at a glance. */
export default function HealthReports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/safety/summary')
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Loading…</p>;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Health &amp; safety report</h1>
          <p className="hint">Clinic visits, incidents and inspections at a glance.</p>
        </div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile
          icon="♙"
          tone="blue"
          label="Clinic visits"
          value={d.visitsThisMonth}
          hint={`this month, ${d.sentHomeThisMonth} sent home`}
        />
        <Tile
          icon="!"
          tone="red"
          label="Open incidents"
          value={d.openIncidents}
          hint={`${d.seriousOpen} serious`}
        />
        <Tile icon="×" tone="amber" label="Areas needing action" value={d.areasNeedingAction.length} />
        <Tile icon="◷" tone="violet" label="Inspections overdue" value={d.inspectionsOverdue.length} />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
          <span>
            <h2>Areas needing action</h2>
            <small>Latest inspection</small>
          </span>
        </header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Result</th>
                <th>Inspected</th>
              </tr>
            </thead>
            <tbody>
              {d.areasNeedingAction.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.area}</b>
                  </td>
                  <td>
                    <span className="badge rejected">● {a.result.replace('_', ' ')}</span>
                  </td>
                  <td>{a.inspectionDate}</td>
                </tr>
              ))}
              {!d.areasNeedingAction.length && (
                <tr>
                  <td colSpan={3} className="empty-row">
                    Every inspected area passed its latest inspection.
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
            <h2>Inspections overdue</h2>
            <small>Areas past their next-due date</small>
          </span>
        </header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Was due</th>
              </tr>
            </thead>
            <tbody>
              {d.inspectionsOverdue.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.area}</b>
                  </td>
                  <td>{a.nextDue}</td>
                </tr>
              ))}
              {!d.inspectionsOverdue.length && (
                <tr>
                  <td colSpan={2} className="empty-row">
                    None overdue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
