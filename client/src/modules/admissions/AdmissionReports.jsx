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

/** Admissions at a glance: applicants, conversion, entrance tests, interviews and offers. */
export default function AdmissionReports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/admissions/summary').then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Loading…</p>;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Admission reports</h1>
          <p className="hint">Applicants, conversion, tests, interviews and offers at a glance.</p>
        </div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Applicants" value={d.total} hint={`${d.online} online · ${d.office} office`} />
        <Tile icon="✓" tone="green" label="Enrolled" value={`${d.conversionPercent}%`} hint="of all applicants" />
        <Tile icon="▣" tone="violet" label="Acceptance" value={`${d.acceptancePercent}%`} hint="of decided applicants" />
        <Tile icon="✎" tone="amber" label="Entrance tests" value={d.testsTaken} hint={d.averageTestPercent === null ? 'none marked' : `average ${d.averageTestPercent}%`} />
        <Tile icon="◷" tone="blue" label="Upcoming interviews" value={d.upcomingInterviews} />
        <Tile icon="!" tone="red" label="Expired offers" value={d.expiredOffers} />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>By stage</h2><small>Where applicants are in the process</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr>{d.stages.map((s) => <th key={s.stage}>{s.stage}</th>)}</tr></thead>
            <tbody><tr>{d.stages.map((s) => <td key={s.stage}><b>{s.count}</b></td>)}</tr></tbody>
          </table>
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>By class applied for</h2><small>Applicants, approvals, waiting list and enrolments</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Class</th><th>Applicants</th><th>Approved</th><th>Waitlisted</th><th>Enrolled</th></tr></thead>
            <tbody>
              {d.byClass.map((c) => <tr key={c.className}><td><b>{c.className}</b></td><td>{c.total}</td><td>{c.approved}</td><td>{c.waitlisted}</td><td>{c.enrolled}</td></tr>)}
              {!d.byClass.length && <tr><td colSpan={5} className="empty-row">No applicants yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
