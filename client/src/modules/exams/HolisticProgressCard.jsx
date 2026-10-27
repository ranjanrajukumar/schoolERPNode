import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StudentPhoto from '../../components/StudentPhoto.jsx';
import { useLogoUrl } from '../../components/idCardDesign.js';
import { loadPublicSettings } from '../../services/settings.js';

const RESULT = { pass: ['paid', 'Pass'], fail: ['rejected', 'Fail'], incomplete: ['partial', 'Incomplete'] };

function Tile({ label, value, hint }) {
  return <div className="rc-tile"><small>{label}</small><b>{value}</b>{hint && <small>{hint}</small>}</div>;
}

/** One student's holistic progress card for a term: scholastic marks, the combined result, attendance and co-scholastic grades. Prints cleanly. */
export default function HolisticProgressCard() {
  const { groupId, studentId } = useParams();
  const [card, setCard] = useState(null);
  const [school, setSchool] = useState({ name: 'School' });
  const [error, setError] = useState('');
  const logo = useLogoUrl(true);

  useEffect(() => {
    let live = true;
    setCard(null); setError(''); // never show the previous student while the next one loads
    api(`/progress-card/groups/${groupId}/card/${studentId}`).then((c) => { if (live) setCard(c); }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [groupId, studentId]);
  useEffect(() => { loadPublicSettings().then((s) => setSchool(s.school ?? { name: 'School' })); }, []);

  if (!card) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const { student, group, exams, scholastic, overall, attendance, coScholastic } = card;
  const [tone, label] = RESULT[overall?.result] ?? ['', '—'];
  const categories = [...new Set(coScholastic.map((c) => c.category))];

  return (
    <>
      <div className="profile-head no-print">
        <div>
          <h1>Progress card</h1>
          <p className="hint">{student.name} · {group.name}</p>
        </div>
        <div className="head-actions">
          <Link className="ghost btn" to="/progress-cards">← Progress cards</Link>
          <button type="button" className="big-action" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <article className="card report-card-sheet">
        <header className="rc-school">
          {logo && <img src={logo} alt="" className="rc-logo" />}
          <div>
            <h2>{school.name}</h2>
            {(school.address || school.phone) && <small>{[school.address, school.phone].filter(Boolean).join(' · ')}</small>}
          </div>
          <span className="rc-title">Holistic progress card<small>{group.name}</small></span>
        </header>

        <section className="rc-student">
          <StudentPhoto studentId={student.id} alt={student.name} className="rc-photo" fallback={<div className="rc-photo empty" aria-hidden="true">{student.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</div>} />
          <dl>
            <div><dt>Student</dt><dd>{student.name}</dd></div>
            <div><dt>Admission no</dt><dd>{student.admissionNo}</dd></div>
            <div><dt>Class</dt><dd>{student.className ?? '—'}</dd></div>
            <div><dt>Class teacher</dt><dd>{student.classTeacher ?? '—'}</dd></div>
            <div><dt>Term</dt><dd>{group.name}</dd></div>
          </dl>
        </section>

        <h3>Scholastic areas</h3>
        <div className="table-scroll">
          <table className="enquiry-table rc-table no-sno">
            <thead><tr><th>Subject</th>{exams.map((e) => <th key={e.id}>{e.name}<small className="block">weight {e.weight}</small></th>)}</tr></thead>
            <tbody>
              {scholastic.map((s) => (
                <tr key={s.subjectId}>
                  <td><b>{s.subject}</b></td>
                  {exams.map((e) => {
                    const m = s.marks[e.id];
                    return <td key={e.id} className={m?.passed === false ? 'failed' : ''}>{m ? <><b>{m.marks ?? '—'}</b> / {m.maxMarks}{m.grade && <> <span className={`badge ${m.passed === false ? 'rejected' : 'applied'}`}>{m.grade}</span></>}</> : '—'}</td>;
                  })}
                </tr>
              ))}
              {!scholastic.length && <tr><td colSpan={exams.length + 1} className="empty-row">No exams are in this term yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {overall ? (
          <div className="rc-summary">
            <Tile label="Overall" value={`${overall.percentage}%`} />
            <Tile label="Grade" value={overall.grade} />
            <Tile label="Rank" value={`${overall.rank}`} hint={`of ${card.classSize}`} />
            <div className="rc-tile"><small>Result</small><b><span className={`badge ${tone}`}>● {label}</span></b></div>
            <Tile label="Attendance" value={attendance?.percentage == null ? '—' : `${attendance.percentage}%`} hint={attendance?.percentage == null ? 'no records' : `${attendance.days} days`} />
          </div>
        ) : <p className="hint">No marks have been entered for this term yet.</p>}

        <h3 style={{ marginTop: 28 }}>Co-scholastic areas</h3>
        <div className="table-scroll">
          <table className="enquiry-table rc-table no-sno">
            <thead><tr><th>Area</th><th>Grade</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                coScholastic.filter((a) => a.category === c).map((a, i) => (
                  <tr key={a.area}>
                    <td><b>{a.area}</b><small className="block">{i === 0 ? c : ''}</small></td>
                    <td>{a.grade ? <span className="badge applied">{a.grade}</span> : '—'}</td>
                  </tr>
                ))
              ))}
              {!coScholastic.length && <tr><td colSpan={2} className="empty-row">No co-scholastic areas are set up.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="hint">Grades: A outstanding · B very good · C good · D satisfactory · E needs improvement.</p>

        <footer className="rc-sign">
          <span>Class teacher</span><span>Parent / guardian</span><span>Principal{school.principal ? `: ${school.principal}` : ''}</span>
        </footer>
      </article>
    </>
  );
}
