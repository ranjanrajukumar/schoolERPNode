import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import StudentPhoto from '../../components/StudentPhoto.jsx';
import { useLogoUrl } from '../../components/idCardDesign.js';
import { loadPublicSettings } from '../../services/settings.js';

const RESULT = { pass: ['paid', 'Pass'], fail: ['rejected', 'Fail'], incomplete: ['partial', 'Incomplete'] };

function Tile({ label, value, hint }) {
  return (
    <div className="rc-tile">
      <small>{label}</small>
      <b>{value}</b>
      {hint && <small>{hint}</small>}
    </div>
  );
}

/** One student's report card for one exam: marks (with theory and practical where the subject is split), grade, rank and attendance. Prints cleanly. */
export default function ReportCard() {
  const { examId, studentId } = useParams();
  const [card, setCard] = useState(null);
  const [school, setSchool] = useState({ name: 'School' });
  const [error, setError] = useState('');
  const logo = useLogoUrl(true);

  useEffect(() => {
    api(`/exams/${examId}/report-card/${studentId}`)
      .then(setCard)
      .catch((e) => setError(e.message));
  }, [examId, studentId]);
  useEffect(() => {
    loadPublicSettings().then((s) => setSchool(s.school ?? { name: 'School' }));
  }, []);

  if (!card) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const { student, exam, subjects, summary, attendance } = card;
  const split = subjects.some((s) => s.practicalMax !== undefined);
  const [tone, label] = RESULT[summary?.result] ?? ['', '—'];

  return (
    <>
      <div className="profile-head no-print">
        <div>
          <h1>Report card</h1>
          <p className="hint">
            {student.name} · {exam.name}
          </p>
        </div>
        <div className="head-actions">
          <Link className="ghost btn" to={`/exams/${examId}/results`}>
            ← Results
          </Link>
          <button type="button" className="big-action" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      <article className="card report-card-sheet">
        <header className="rc-school">
          {logo && <img src={logo} alt="" className="rc-logo" />}
          <div>
            <h2>{school.name}</h2>
            {(school.address || school.phone) && (
              <small>{[school.address, school.phone].filter(Boolean).join(' · ')}</small>
            )}
          </div>
          <span className="rc-title">
            Report card<small>{exam.name}</small>
          </span>
        </header>

        <section className="rc-student">
          <StudentPhoto
            studentId={student.id}
            alt={student.name}
            className="rc-photo"
            fallback={
              <div className="rc-photo empty" aria-hidden="true">
                {student.name
                  .split(' ')
                  .map((x) => x[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            }
          />
          <dl>
            <div>
              <dt>Student</dt>
              <dd>{student.name}</dd>
            </div>
            <div>
              <dt>Admission no</dt>
              <dd>{student.admissionNo}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>{student.className ?? '—'}</dd>
            </div>
            <div>
              <dt>Class teacher</dt>
              <dd>{student.classTeacher ?? '—'}</dd>
            </div>
            <div>
              <dt>Examination</dt>
              <dd>{exam.name}</dd>
            </div>
          </dl>
        </section>

        <div className="table-scroll">
          <table className="enquiry-table rc-table no-sno">
            <thead>
              <tr>
                <th>Subject</th>
                {split && (
                  <>
                    <th>Theory</th>
                    <th>Practical</th>
                  </>
                )}
                <th>Marks</th>
                <th>Out of</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.subjectId} className={s.passed === false ? 'failed' : ''}>
                  <td>
                    <b>{s.subject}</b>
                    {s.elective && <small className="block">Elective</small>}
                  </td>
                  {split && (
                    <>
                      <td>
                        {s.theoryMax
                          ? s.theoryMarks !== undefined
                            ? `${s.theoryMarks} / ${s.theoryMax}`
                            : `— / ${s.theoryMax}`
                          : '—'}
                      </td>
                      <td>
                        {s.practicalMax
                          ? s.practicalMarks !== undefined
                            ? `${s.practicalMarks} / ${s.practicalMax}`
                            : `— / ${s.practicalMax}`
                          : '—'}
                      </td>
                    </>
                  )}
                  <td>
                    <b>{s.marks ?? '—'}</b>
                  </td>
                  <td>{s.maxMarks}</td>
                  <td>
                    {s.grade ? (
                      <span className={`badge ${s.passed === false ? 'rejected' : 'applied'}`}>
                        {s.grade}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {summary && (
                <tr className="rc-total">
                  <td>
                    <b>Total</b>
                  </td>
                  {split && (
                    <>
                      <td />
                      <td />
                    </>
                  )}
                  <td>
                    <b>{summary.total}</b>
                  </td>
                  <td>{summary.outOf}</td>
                  <td>
                    <span className="badge applied">{summary.grade}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {summary ? (
          <div className="rc-summary">
            <Tile label="Percentage" value={`${summary.percentage}%`} />
            <Tile label="Grade" value={summary.grade} />
            <Tile label="Rank" value={`${summary.rank}`} hint={`of ${card.classSize}`} />
            <div className="rc-tile">
              <small>Result</small>
              <b>
                <span className={`badge ${tone}`}>● {label}</span>
              </b>
            </div>
            <Tile
              label="Attendance"
              value={attendance.percentage === null ? '—' : `${attendance.percentage}%`}
              hint={attendance.percentage === null ? 'no records' : `${attendance.days} days`}
            />
          </div>
        ) : (
          <p className="hint">No marks have been entered for this student yet.</p>
        )}

        <footer className="rc-sign">
          <span>Class teacher</span>
          <span>Parent / guardian</span>
          <span>Principal{school.principal ? `: ${school.principal}` : ''}</span>
        </footer>
      </article>
    </>
  );
}
