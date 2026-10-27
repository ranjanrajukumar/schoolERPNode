import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** The library at a glance: stock, loans, overdue books, reservations and fines. */
export default function LibraryReports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/library/summary').then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Loading…</p>;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Library reports</h1>
          <p className="hint">Stock, loans and fines at a glance.</p>
        </div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Titles" value={d.titles} hint={`${d.copies} copies`} />
        <Tile icon="✓" tone="green" label="On loan" value={d.onLoan} hint={`${d.activeReservations} reserved`} />
        <Tile icon="!" tone="red" label="Overdue" value={d.overdue} />
        <Tile icon="▣" tone="amber" label="Fines charged" value={d.finesCharged} />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Most borrowed</h2><small>Titles with the most loans</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Title</th><th>Loans</th></tr></thead>
            <tbody>
              {d.mostBorrowed.map((b) => <tr key={b.title}><td><b>{b.title}</b></td><td>{b.loans}</td></tr>)}
              {!d.mostBorrowed.length && <tr><td colSpan={2} className="empty-row">No loans yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>By category</h2><small>Titles and copies in each</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Category</th><th>Titles</th><th>Copies</th></tr></thead>
            <tbody>
              {d.byCategory.map((c) => <tr key={c.name}><td><b>{c.name}</b></td><td>{c.titles}</td><td>{c.copies}</td></tr>)}
              {!d.byCategory.length && <tr><td colSpan={3} className="empty-row">No categories yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
