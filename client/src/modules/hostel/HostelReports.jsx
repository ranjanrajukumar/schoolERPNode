import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

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

/** Hostel at a glance: boarders, income, room occupancy and today's roll call. */
export default function HostelReports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/hostel/summary')
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Loading…</p>;

  const marked = d.today.present + d.today.absent + d.today.leave;
  const exportCsv = () => {
    const head = ['Hostel', 'Type', 'Rooms', 'Beds used', 'Capacity', 'Free beds'];
    const lines = d.hostels.map((h) =>
      [h.name, h.type, h.roomCount, h.occupied, h.capacity, h.capacity - h.occupied].map(csvCell).join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const l = document.createElement('a');
    l.href = url;
    l.download = 'hostel-occupancy.csv';
    document.body.appendChild(l);
    l.click();
    l.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Hostel reports</h1>
          <p className="hint">Boarders, rooms and tonight&apos;s roll call at a glance.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={exportCsv}>
            ↓ Export occupancy
          </button>
        </div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Boarders" value={d.boarders} />
        <Tile icon="▣" tone="violet" label="Monthly hostel income" value={d.monthlyIncome} />
        <Tile icon="▤" tone="amber" label="Full rooms" value={d.fullRooms} hint={`${d.emptyRooms} empty`} />
        <Tile icon="!" tone="red" label="Visitors inside now" value={d.visitorsInside ?? 0} />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
          <span>
            <h2>Today&apos;s roll call</h2>
            <small>{marked ? `${marked} of ${d.boarders} boarders marked` : 'Not marked yet today'}</small>
          </span>
        </header>
        <div className="rc-summary" style={{ padding: '0 22px 22px', marginTop: 0 }}>
          <div className="rc-tile">
            <small>Present</small>
            <b>{d.today.present}</b>
          </div>
          <div className="rc-tile">
            <small>Absent</small>
            <b>{d.today.absent}</b>
          </div>
          <div className="rc-tile">
            <small>On leave</small>
            <b>{d.today.leave}</b>
          </div>
          <div className="rc-tile">
            <small>Not marked</small>
            <b>{Math.max(d.boarders - marked, 0)}</b>
          </div>
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
          <span>
            <h2>Occupancy</h2>
            <small>Beds used in each hostel</small>
          </span>
        </header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Hostel</th>
                <th>Type</th>
                <th>Rooms</th>
                <th>Beds used</th>
                <th>Free beds</th>
              </tr>
            </thead>
            <tbody>
              {d.hostels.map((h) => (
                <tr key={h.id}>
                  <td>
                    <b>{h.name}</b>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{h.type}</td>
                  <td>{h.roomCount}</td>
                  <td>
                    <span className={`badge ${h.occupied >= h.capacity ? 'rejected' : 'paid'}`}>
                      ● {h.occupied} / {h.capacity}
                    </span>
                  </td>
                  <td>{h.capacity - h.occupied}</td>
                </tr>
              ))}
              {!d.hostels.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No hostels yet.
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
