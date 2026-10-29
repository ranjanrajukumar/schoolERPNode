import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CourseCard, initials, longDate, shortDate, todayIso } from './lmsUi.jsx';
import './lms.css';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// Teacher / admin LMS home: everything is computed from the course, gradebook, assignment and quiz records.
export default function LmsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const courses = await api('/lms/courses');
        const detail = await Promise.all(
          courses.map(async (course) => {
            const [progress, assignments, quizzes] = await Promise.all([
              api(`/lms/courses/${course.id}/progress`),
              api(`/lms/courses/${course.id}/assignments`),
              api(`/lms/courses/${course.id}/quizzes`),
            ]);
            const rows = progress.rows;
            const average = rows.length
              ? Math.round(
                  rows.reduce(
                    (sum, r) => sum + (r.lessonsTotal ? (r.lessonsCompleted * 100) / r.lessonsTotal : 0),
                    0,
                  ) / rows.length,
                )
              : 0;
            return { course, rows, assignments, quizzes, average };
          }),
        );
        setData(detail);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  if (error)
    return (
      <div className="lms-ns lms-page">
        <p className="error" role="alert">
          {error}
        </p>
      </div>
    );
  if (!data)
    return (
      <div className="lms-ns lms-page">
        <p role="status">Loading your teaching space…</p>
      </div>
    );

  const learners = new Map();
  for (const d of data)
    for (const r of d.rows) {
      const l = learners.get(r.studentId) ?? {
        id: r.studentId,
        name: r.name,
        admissionNo: r.admissionNo,
        courses: 0,
      };
      l.courses += 1;
      learners.set(r.studentId, l);
    }
  const today = todayIso();
  const published = data.filter((d) => d.course.published);
  const open = data.flatMap((d) => [
    ...d.assignments
      .filter((a) => a.published)
      .map((a) => ({
        ...a,
        kind: 'Assignment',
        course: d.course,
        turned: a.submissions,
        total: d.course.studentCount,
      })),
    ...d.quizzes
      .filter((q) => q.published)
      .map((q) => ({ ...q, kind: 'Quiz', course: d.course, turned: null, total: d.course.studentCount })),
  ]);
  const upcoming = open
    .filter((x) => x.dueOn && x.dueOn >= today)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .slice(0, 5);
  const stillOpen = open.filter((x) => !x.dueOn || x.dueOn >= today).length;
  const firstName = (user?.name || '').split(' ')[0] || 'there';

  return (
    <div className="lms-ns lms-page">
      <div className="profile-head">
        <div>
          <h1>
            {greeting()}, {firstName}{' '}
            <span className="lms-spark" aria-hidden="true">
              ✦
            </span>
          </h1>
          <p className="hint">Here’s what’s happening across your learning space.</p>
        </div>
        <Link className="btn lms-cta" to="/lms">
          + Create a course
        </Link>
      </div>

      <div className="lms-stats">
        <div className="lms-stat">
          <span>Active students</span>
          <b>{learners.size}</b>
          <small>Enrolled across your courses</small>
        </div>
        <div className="lms-stat">
          <span>Published courses</span>
          <b>{published.length}</b>
          <small>{data.reduce((n, d) => n + d.course.lessonCount, 0)} lessons in total</small>
        </div>
        <div className="lms-stat">
          <span>Open assessments</span>
          <b>{stillOpen}</b>
          <small>Assignments and quizzes still open</small>
        </div>
      </div>

      <p className="lms-eyebrow">Your teaching space</p>
      <div className="profile-head">
        <h2 style={{ margin: 0 }}>Course overview</h2>
        <Link className="lms-link" to="/lms">
          Manage courses →
        </Link>
      </div>
      {!data.length && (
        <div className="card">
          <p className="hint">No courses yet. Create a course to start adding lessons.</p>
        </div>
      )}
      <div className="lms-course-grid">
        {data.map((d, i) => (
          <CourseCard
            key={d.course.id}
            course={d.course}
            index={i}
            meta={[
              `${d.course.studentCount} STUDENTS`,
              `${d.course.lessonCount} LESSONS`,
              d.course.published ? 'PUBLISHED' : 'DRAFT',
            ]}
            progress={d.average}
            progressLabel="average completion"
            action="Open course"
            onOpen={() => navigate('/lms')}
          />
        ))}
      </div>

      <div className="lms-two">
        <section className="card">
          <p className="lms-eyebrow">Student success</p>
          <div className="profile-head">
            <h2 style={{ margin: 0 }}>Recent learners</h2>
            <Link className="lms-link" to="/lms-progress">
              View progress →
            </Link>
          </div>
          {[...learners.values()].slice(0, 5).map((l) => (
            <div className="lms-row" key={l.id}>
              <span className="lms-avatar">{initials(l.name)}</span>
              <div>
                <b>{l.name}</b>
                <small className="block">{l.admissionNo}</small>
              </div>
              <span className="badge">
                {l.courses} {l.courses === 1 ? 'course' : 'courses'}
              </span>
            </div>
          ))}
          {!learners.size && <p className="hint">Students appear here once they are enrolled in a course.</p>}
        </section>
        <section className="card">
          <p className="lms-eyebrow">Next up</p>
          <div className="profile-head">
            <h2 style={{ margin: 0 }}>Upcoming deadlines</h2>
            <Link className="lms-link" to="/lms-assignments">
              Assignments →
            </Link>
          </div>
          {upcoming.map((x) => {
            const d = shortDate(x.dueOn);
            return (
              <div className="lms-row" key={`${x.kind}${x.id}`} title={longDate(x.dueOn)}>
                <span className="lms-date">
                  <b>{d.day}</b>
                  <small>{d.month}</small>
                </span>
                <div>
                  <b>{x.title}</b>
                  <small className="block">
                    {x.course.title} · {x.kind}
                  </small>
                </div>
                <span className="badge">
                  {x.turned == null ? `${x.attemptCount ?? 0} attempts` : `${x.turned}/${x.total} turned in`}
                </span>
              </div>
            );
          })}
          {!upcoming.length && (
            <p className="hint">
              No upcoming deadlines. Due dates you set on assignments and quizzes show here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
