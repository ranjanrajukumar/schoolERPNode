import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Timetable at a glance: teacher workload, how full each class is, room use and periods with no teacher. */
export default function TimetableReports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/scheduling/report').then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Loading…</p>;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Timetable reports</h1>
          <p className="hint">Workload, room use and gaps in the timetable at a glance.</p>
        </div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Periods in a week" value={d.periodsPerWeek} hint="6 days × 8 periods" />
        <Tile icon="!" tone={d.unassigned.length ? 'red' : 'green'} label="Periods without a teacher" value={d.unassigned.length} />
        <Tile icon="♙" tone="violet" label="Cover periods (30 days)" value={d.substitutionsLast30Days} />
        <Tile icon="◷" tone="amber" label="Classes with no periods" value={d.classes.filter((c) => c.periods === 0).length} />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Teacher workload</h2><small>Periods each week and cover taken in the last 30 days</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Teacher</th><th>Periods / week</th><th>Cover taken (30 days)</th></tr></thead>
            <tbody>
              {d.teacherLoad.map((t) => <tr key={t.id}><td><b>{t.name}</b></td><td>{t.periods}</td><td>{t.coverLast30Days}</td></tr>)}
              {!d.teacherLoad.length && <tr><td colSpan={3} className="empty-row">No active staff.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Periods filled per class</h2><small>Classes with nothing set are flagged</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Class</th><th>Periods set</th></tr></thead>
            <tbody>
              {d.classes.map((c) => <tr key={c.id}><td><b>{c.name}</b></td><td>{c.periods === 0 ? <span className="badge rejected">● 0</span> : c.periods}</td></tr>)}
              {!d.classes.length && <tr><td colSpan={2} className="empty-row">No classes.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Room use</h2><small>How much of the week each room is used</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Room</th><th>Type</th><th>Periods / week</th><th>Use</th></tr></thead>
            <tbody>
              {d.rooms.map((r) => <tr key={r.id}><td><b>{r.name}</b></td><td style={{ textTransform: 'capitalize' }}>{r.kind}</td><td>{r.periods}</td><td>{r.utilisationPercent}%</td></tr>)}
              {!d.rooms.length && <tr><td colSpan={4} className="empty-row">No rooms yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Periods with no teacher</h2><small>Assign a teacher on the Timetable page</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Class</th><th>Subject</th><th>Day</th><th>Period</th></tr></thead>
            <tbody>
              {d.unassigned.map((s) => <tr key={s.id}><td><b>{s.className}</b></td><td>{s.subjectName}</td><td>{DAYS[s.day - 1]}</td><td>{s.period}</td></tr>)}
              {!d.unassigned.length && <tr><td colSpan={4} className="empty-row">Every period has a teacher.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
