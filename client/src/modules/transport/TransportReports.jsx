import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

const money = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

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

/** Transport at a glance: riders, how full each vehicle is, what each route earns, and what maintenance is coming. */
export default function TransportReports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/transport/summary')
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Loading…</p>;

  const income = d.routes.reduce((n, r) => n + Number(r.monthlyFee) * r.studentCount, 0);
  const exportCsv = () => {
    const head = ['Route', 'Vehicle', 'Stops', 'Students', 'Monthly fee', 'Monthly income'];
    const lines = d.routes.map((r) =>
      [
        r.name,
        r.vehicleRegNo,
        r.stopCount,
        r.studentCount,
        r.monthlyFee,
        (Number(r.monthlyFee) * r.studentCount).toFixed(2),
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const l = document.createElement('a');
    l.href = url;
    l.download = 'transport-routes.csv';
    document.body.appendChild(l);
    l.click();
    l.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Transport reports</h1>
          <p className="hint">Riders, vehicles, routes and maintenance at a glance.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={exportCsv}>
            ↓ Export routes
          </button>
        </div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Students on transport" value={d.riders} />
        <Tile
          icon="▤"
          tone="green"
          label="Vehicles"
          value={d.vehicles.length}
          hint={`${d.routes.length} route${d.routes.length === 1 ? '' : 's'}`}
        />
        <Tile icon="▣" tone="violet" label="Monthly route income" value={money(income)} />
        <Tile
          icon="!"
          tone="amber"
          label="Maintenance spend (all time)"
          value={money(d.maintenanceCost)}
          hint={
            d.maintenanceDue.length
              ? `${d.maintenanceDue.length} job${d.maintenanceDue.length === 1 ? '' : 's'} due soon`
              : null
          }
        />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
          <span>
            <h2>Vehicle utilisation</h2>
            <small>Seats used and insurance</small>
          </span>
        </header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Seats used</th>
                <th>Insurance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    <b>{v.regNo}</b>
                  </td>
                  <td>
                    <span className={`badge ${v.seatsTaken >= v.capacity ? 'rejected' : 'paid'}`}>
                      ● {v.seatsTaken} / {v.capacity}
                    </span>
                  </td>
                  <td>
                    {date(v.insuranceExpiry)}
                    {v.insuranceExpiring && (
                      <span className="badge rejected" style={{ marginLeft: 6 }}>
                        expired or expiring soon
                      </span>
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{v.status}</td>
                </tr>
              ))}
              {!d.vehicles.length && (
                <tr>
                  <td colSpan={4} className="empty-row">
                    No vehicles yet.
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
            <h2>Routes</h2>
            <small>What each route carries and earns each month</small>
          </span>
        </header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Stops</th>
                <th>Students</th>
                <th>Monthly fee</th>
                <th>Monthly income</th>
              </tr>
            </thead>
            <tbody>
              {d.routes.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td>{r.vehicleRegNo ?? '—'}</td>
                  <td>{r.stopCount}</td>
                  <td>{r.studentCount}</td>
                  <td>{money(r.monthlyFee)}</td>
                  <td>
                    <b>{money(Number(r.monthlyFee) * r.studentCount)}</b>
                  </td>
                </tr>
              ))}
              {!d.routes.length && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No routes yet.
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
            <h2>Maintenance due</h2>
            <small>Next 30 days</small>
          </span>
        </header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Work</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {d.maintenanceDue.map((m, i) => (
                <tr key={i}>
                  <td>
                    <b>{m.vehicleRegNo}</b>
                  </td>
                  <td>{m.description}</td>
                  <td>
                    {date(m.nextDue)}
                    {m.overdue && (
                      <span className="badge rejected" style={{ marginLeft: 6 }}>
                        overdue
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!d.maintenanceDue.length && (
                <tr>
                  <td colSpan={3} className="empty-row">
                    Nothing due in the next 30 days.
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
