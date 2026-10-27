import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StudentFiles from '../../components/StudentFiles.jsx';
import Modal from '../../components/Modal.jsx';
import StudentForm from '../academics/StudentForm.jsx';
import ParentForm from '../portal/ParentForm.jsx';

const fmtPct = (v) => (v === null ? 'no records' : `${v}%`);

export default function StudentProfile() {
  const { id } = useParams();
  const notice = useLocation().state?.notice;
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState(null); // null | 'edit' | 'parent'
  const [reload, setReload] = useState(0);
  const [flash, setFlash] = useState('');

  useEffect(() => { api(`/student-profile/${id}`).then(setP).catch((e) => setError(e.message)); }, [id, reload]);
  if (error) return <p className="error">{error}</p>;
  if (!p) return <p>Loading…</p>;

  const { student: s, health: h, details: d } = p;
  const line = (pairs) => pairs.filter(([, v]) => v).map(([label, v]) => <p key={label}><small>{label}</small><br />{v}</p>);
  return (
    <>
      <h1>{s.name} <span className={`badge ${s.status === 'active' ? 'paid' : 'partial'}`}>{s.status}</span></h1>
      {(flash || notice) && <p className="success">{flash || notice}</p>}
      <p className="hint">Adm. no {s.admissionNo} · {s.className ?? 'no class'} · {s.gender ?? '—'} · born {s.dob ?? '—'}</p>
      <p className="no-print">
        <button type="button" onClick={() => { setFlash(''); setPopup('edit'); }}>Edit details</button>
        <Link className="btn" to={`/student-health?studentId=${s.id}`}>Health record</Link>
        <button type="button" onClick={() => { setFlash(''); setPopup('parent'); }}>Create parent login</button>
        <Link className="btn" to={`/behavior?studentId=${s.id}`}>Behavior</Link>
        <button onClick={() => window.print()}>Print</button>
      </p>

      <div className="stats">
        <div className="card"><span>Attendance (all time)</span><b>{fmtPct(p.attendance.overall.percentage)}</b><small>{p.attendance.overall.absent} absent of {p.attendance.overall.days} days</small></div>
        <div className="card"><span>Attendance (30 days)</span><b>{fmtPct(p.attendance.last30Days.percentage)}</b></div>
        {p.fees && <div className="card"><span>Fees outstanding</span><b>{p.fees.outstanding}</b>{p.fees.overdueItems > 0 && <small className="error">{p.fees.overdueItems} overdue</small>}</div>}
        <div className="card"><span>Behavior points</span><b style={{ color: p.behavior.points < 0 ? '#dc2626' : undefined }}>{p.behavior.points}</b></div>
      </div>

      <div className="profile-grid">
        <section className="card">
          <h2>Personal details</h2>
          {line([['Full name', [s.firstName, d.middleName, s.lastName].filter(Boolean).join(' ')], ['Date of admission', d.admissionDate], ['Roll number', d.rollNo], ['Nationality', d.nationality], ['Religion', d.religion], ['Category', d.category], ['Mother tongue', d.motherTongue], ['Aadhaar / national ID', d.nationalId]])}
        </section>

        <section className="card">
          <h2>Contact &amp; address</h2>
          {line([['Address', [d.address, d.city, d.state, d.pincode].filter(Boolean).join(', ')], ['Email', d.email], ['Phone', d.phone]])}
          {!(d.address || d.email || d.phone || d.city) && <p className="hint">Not filled in.</p>}
        </section>

        <section className="card">
          <h2>Parents</h2>
          {line([['Father', [d.fatherName, d.fatherPhone, d.fatherOccupation].filter(Boolean).join(' · ')], ['Mother', [d.motherName, d.motherPhone, d.motherOccupation].filter(Boolean).join(' · ')]])}
          {!(d.fatherName || d.motherName) && <p className="hint">Not filled in.</p>}
        </section>

        <section className="card">
          <h2>Previous school</h2>
          {line([['School', d.previousSchool], ['Class last attended', d.previousClass], ['Transfer certificate no', d.previousTcNo], ['Last result', d.previousPercent !== null && d.previousPercent !== undefined ? `${d.previousPercent}%` : null]])}
          {!(d.previousSchool || d.previousClass) && <p className="hint">Not filled in.</p>}
        </section>

        <section className="card">
          <h2>Guardians</h2>
          {d.guardianRelation && <p><small>Relation</small><br />{d.guardianRelation}</p>}
          {d.guardianEmail && <p><small>Email</small><br />{d.guardianEmail}</p>}
          <p>{s.guardianName ?? '—'}{s.guardianPhone && ` · ${s.guardianPhone}`}</p>
          {p.parentAccounts.map((g) => <p key={g.email}><b>{g.name}</b> ({g.relation}) — {g.email}{g.phone && ` · ${g.phone}`}<br /><small>Has a portal login</small></p>)}
        </section>

        <section className="card">
          <h2>Health</h2>
          {h ? (
            <>
              {(h.allergies || h.conditions || h.medications) && (
                <p className="error">
                  {h.allergies && <>Allergies: {h.allergies}. </>}{h.conditions && <>Conditions: {h.conditions}. </>}{h.medications && <>Medication: {h.medications}.</>}
                </p>
              )}
              <p>Blood group {h.bloodGroup ?? '—'} · {h.heightCm ?? '—'} cm · {h.weightKg ?? '—'} kg</p>
              <p>Emergency: {h.emergencyName ?? '—'} {h.emergencyPhone}</p>
            </>
          ) : <p className="hint">No health record yet.</p>}
        </section>

        <section className="card">
          <h2>Recent exam results</h2>
          {p.results.map((r) => <p key={r.examId}>{r.name}: <b>{r.total}/{r.outOf}</b> ({r.percentage}%, {r.grade}, rank {r.rank}) <span className={`badge ${r.result}`}>{r.result}</span></p>)}
          {!p.results.length && <p className="hint">No results yet.</p>}
        </section>

        <section className="card">
          <h2>Behavior</h2>
          {p.behavior.recent.map((b) => <p key={b.id}>{b.date} · <span className={`badge ${b.type === 'merit' ? 'paid' : b.type === 'note' ? '' : 'overdue'}`}>{b.type}</span> {b.title} {b.points !== 0 && <b>({b.points > 0 ? '+' : ''}{b.points})</b>}</p>)}
          {!p.behavior.recent.length && <p className="hint">Nothing recorded.</p>}
        </section>

        {p.fees && (
          <section className="card">
            <h2>Fees</h2>
            {p.fees.items.map((f, i) => <p key={i}>{f.title}: {f.amount}, balance {f.balance} <span className={`badge ${f.status}`}>{f.status}</span></p>)}
            {!p.fees.items.length && <p className="hint">No fees.</p>}
          </section>
        )}

        <section className="card">
          <h2>Transport &amp; library</h2>
          <p>{p.transport ? `Route ${p.transport.route}, stop ${p.transport.stop}${p.transport.pickupTime ? ` (${p.transport.pickupTime})` : ''}` : 'Not on school transport.'}</p>
          {p.library.map((l, i) => <p key={i} className={l.overdue ? 'error' : ''}>Borrowed: {l.title}, due {l.dueOn}{l.overdue && ' (overdue)'}</p>)}
          {!p.library.length && <p className="hint">No books on loan.</p>}
        </section>

        <StudentFiles studentId={s.id} />

        <section className="card">
          <h2>Certificates issued</h2>
          {p.documents.map((d) => <p key={d.id}>{d.type} — {d.certificateNo} ({d.issuedOn})</p>)}
          {!p.documents.length && <p className="hint">None.</p>}
        </section>
      </div>
      <Modal open={popup === 'edit'} title="Edit student" onClose={() => setPopup(null)}>
        {popup === 'edit' && <StudentForm embedded id={s.id} onCancel={() => setPopup(null)} onSaved={() => { setPopup(null); setFlash('Details saved.'); setReload((n) => n + 1); }} />}
      </Modal>
      <Modal open={popup === 'parent'} title="New parent account" onClose={() => setPopup(null)}>
        {popup === 'parent' && <ParentForm embedded studentId={String(s.id)} onCancel={() => setPopup(null)} onSaved={() => { setPopup(null); setFlash('Parent account created and linked to this student.'); setReload((n) => n + 1); }} />}
      </Modal>
    </>
  );
}
