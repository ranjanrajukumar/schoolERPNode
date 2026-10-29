import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Bars, Donut } from '../../components/charts.jsx';
import { localDate, daysFromNow } from '../../utils/dates.js';

const money = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const timeOrDate = (iso) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const submittedLabel = (day) => {
  const t = localDate();
  const y = daysFromNow(-1);
  return day === t
    ? 'Today'
    : day === y
      ? 'Yesterday'
      : new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const ACTIVITY = {
  registration: ['♙', ''],
  admission: ['✓', 'green'],
  enquiry: ['☏', 'amber'],
  attendance: ['▤', ''],
};
const short = (n) =>
  n >= 1e7
    ? `${(n / 1e7).toFixed(1)}Cr`
    : n >= 1e5
      ? `${(n / 1e5).toFixed(1)}L`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}k`
        : String(Math.round(n));
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

function Tile({ icon, tone, label, value, hint, to }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className="tile card">
      {body}
    </Link>
  ) : (
    <div className="tile card">{body}</div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [failed, setFailed] = useState(false);
  const [setup, setSetup] = useState(null);
  const [year, setYear] = useState('');
  useEffect(() => {
    api('/dashboard')
      .then(setD)
      .catch(() => setFailed(true));
    api('/academic-years')
      .then((ys) => setYear(ys.find((y) => y.isCurrent)?.name ?? ''))
      .catch(() => {});
  }, []);
  // Only an admin can read the checklist; for anyone else this quietly stays empty.
  useEffect(() => {
    if (user?.role === 'admin')
      api('/setup/status')
        .then(setSetup)
        .catch(() => {});
  }, [user?.role]);

  if (!d && failed)
    return (
      <p className="error" role="alert">
        The dashboard could not be loaded.{' '}
        <button type="button" className="ghost" onClick={() => window.location.reload()}>
          Try again
        </button>
      </p>
    );
  if (!d) {
    return (
      <>
        <div className="skeleton hero-skeleton" />
        <div className="stats">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton tile-skeleton" />
          ))}
        </div>
      </>
    );
  }

  const att = d.attendanceToday;
  const marked = att.present + att.absent + att.late;
  const first = (user?.name ?? '').split(' ')[0];
  const days = d.attendanceTrend.map((x) => ({
    label: new Date(`${x.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }),
    value: x.percent,
  }));
  const hasTrend = days.some((x) => x.value !== null);
  const months = d.collectionTrend.map((x) => ({ label: x.month, value: x.amount }));
  const hasCollections = months.some((x) => x.value > 0);
  const trendMax = Math.max(0, ...d.enrollmentTrend.map((m) => Math.max(m.admissions, m.enquiries)));

  return (
    <>
      <div className="profile-head welcome-row">
        <div>
          <h1>
            {greeting()}
            {first && `, ${first}`} 👋
          </h1>
          <p className="hint">
            {marked
              ? `${att.present + att.late} of ${marked} students are in today.`
              : 'Attendance has not been marked yet today.'}{' '}
            {d.overdueFees > 0 && `${d.overdueFees} fee item(s) are overdue.`}
          </p>
        </div>
        <div className="head-actions">
          {year && <span className="year-pill">Academic year · {year.replace('-', '–')}</span>}
          {user?.role === 'admin' && (
            <Link className="big-action" to="/students?new=1">
              ＋ Add student
            </Link>
          )}
        </div>
      </div>

      {setup && setup.progress.done < setup.progress.total && (
        <Link to="/setup" className="card setup-banner">
          <span className="tile-icon amber" aria-hidden="true">
            🚀
          </span>
          <span className="setup-banner-text">
            <b>
              Finish setting up your school: {setup.progress.done} of {setup.progress.total} steps done
            </b>
            <small>{setup.steps.find((s) => !s.done && !s.optional)?.title}</small>
            <span className="progress">
              <i style={{ width: `${(setup.progress.done / setup.progress.total) * 100}%` }} />
            </span>
          </span>
          <span className="setup-banner-go">Continue →</span>
        </Link>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="♙"
          tone="blue"
          label="Total students"
          value={d.students.toLocaleString()}
          hint={d.studentsAddedThisMonth ? `↗ ${d.studentsAddedThisMonth} this month` : null}
          to="/students"
        />
        <Tile
          icon="✓"
          tone="green"
          label="Present today"
          value={(att.present + att.late).toLocaleString()}
          hint={
            marked
              ? `${(((att.present + att.late) / marked) * 100).toFixed(1)}% attendance`
              : 'Not marked yet'
          }
          to="/attendance"
        />
        <Tile
          icon="▣"
          tone="amber"
          label="Fee collection"
          value={`₹${short(d.collectedThisMonth)}`}
          hint={d.overdueFees ? `${d.overdueFees} overdue item(s)` : '↗ this month'}
          to="/fees"
        />
        <Tile
          icon="☏"
          tone="violet"
          label="New enquiries"
          value={d.enquiriesThisMonth}
          hint={d.needFollowUp ? `${d.needFollowUp} need follow-up` : 'None need follow-up'}
          to="/admissions"
        />
      </div>

      {d.attention &&
        (() => {
          const a = d.attention;
          const admin = user?.role === 'admin';
          return (
            <>
              <h2 className="dash-more">Needs your attention</h2>
              <div className="stats">
                <Tile
                  icon="✎"
                  tone="amber"
                  label="Student leave to decide"
                  value={a.studentLeaves}
                  hint={a.studentLeaves ? 'waiting for you' : 'nothing waiting'}
                  to="/student-leaves"
                />
                {admin && (
                  <Tile
                    icon="☂"
                    tone="violet"
                    label="Staff leave to decide"
                    value={a.staffLeaves}
                    hint={a.staffLeaves ? 'waiting for you' : 'nothing waiting'}
                    to="/leave-applications"
                  />
                )}
                {admin && (
                  <Tile
                    icon="!"
                    tone="rose"
                    label="Open grievances"
                    value={a.grievances}
                    hint={
                      a.grievancesAtPrincipal
                        ? `${a.grievancesAtPrincipal} with the principal`
                        : a.feedbackOpen
                          ? `${a.feedbackOpen} new feedback`
                          : 'none waiting'
                    }
                    to="/feedback"
                  />
                )}
                {admin && a.staffToday && (
                  <Tile
                    icon="👥"
                    tone="teal"
                    label="Staff in today"
                    value={`${a.staffToday.present + a.staffToday.late} of ${a.staffToday.total}`}
                    hint={
                      a.staffToday.marked
                        ? `${a.staffToday.absent} absent · ${a.staffToday.leave} on leave`
                        : 'not marked yet'
                    }
                    to="/staff-attendance"
                  />
                )}
                <Tile
                  icon="☝"
                  tone="blue"
                  label="Biometric readers"
                  value={`${a.devices.online} of ${a.devices.total} online`}
                  hint={`${a.devices.punchesToday} punches today`}
                  to="/biometric-attendance"
                />
                <Tile
                  icon="🚌"
                  tone="green"
                  label="Buses reporting"
                  value={`${a.buses.live} of ${a.buses.total} live`}
                  hint={
                    a.buses.total
                      ? a.buses.live === a.buses.total
                        ? 'all on the map'
                        : `${a.buses.total - a.buses.live} without a signal`
                      : 'no buses'
                  }
                  to="/bus-tracking"
                />
              </div>
            </>
          );
        })()}

      <div className="dash-grid">
        <section className="card dash-card">
          <header className="dash-head">
            <span>
              <h2>Enrollment overview</h2>
              <small>Student admissions and enquiry trends</small>
            </span>
            <Link to="/applications">View admissions →</Link>
          </header>
          <div className="dash-legend">
            <span>
              <i className="dot blue" /> Admissions
            </span>
            <span>
              <i className="dot orange" /> Enquiries
            </span>
          </div>
          <div className="gbars" role="img" aria-label="Admissions and enquiries per month">
            {d.enrollmentTrend.map((m) => (
              <div key={m.month} className="gbar-group">
                <span className="gbar-pair">
                  <i
                    className="gbar blue"
                    style={{ height: `${(m.admissions / trendMax) * 100}%` }}
                    title={`${m.admissions} admissions`}
                  />
                  <i
                    className="gbar orange"
                    style={{ height: `${(m.enquiries / trendMax) * 100}%` }}
                    title={`${m.enquiries} enquiries`}
                  />
                </span>
                <small>{m.month}</small>
              </div>
            ))}
          </div>
          {!trendMax && <p className="hint">Nothing received in the last eight months yet.</p>}
        </section>
        <section className="card dash-card">
          <header className="dash-head">
            <span>
              <h2>Recent activity</h2>
              <small>Latest updates across your school</small>
            </span>
            <Link to="/admissions">View all →</Link>
          </header>
          {d.recentActivity?.length ? (
            <ul className="activity">
              {d.recentActivity.map((e, i) => (
                <li key={i}>
                  <span className={`tile-icon ${ACTIVITY[e.type][1] || 'blue'}`} aria-hidden="true">
                    {ACTIVITY[e.type][0]}
                  </span>
                  <span>
                    <b>{e.title}</b>
                    <small>{e.sub}</small>
                  </span>
                  <time>{timeOrDate(e.at)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">
              {user?.role === 'admin'
                ? 'Nothing has happened yet.'
                : 'Recent activity is shown to administrators.'}
            </p>
          )}
        </section>
      </div>

      {user?.role === 'admin' && (
        <div className="dash-grid even">
          <section className="card dash-card">
            <header className="dash-head">
              <span>
                <h2>Admissions to review</h2>
                <small>Applications waiting for your attention</small>
              </span>
              <Link to="/applications">All applications →</Link>
            </header>
            {d.toReview?.length ? (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Grade</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.toReview.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.name}</b>
                      </td>
                      <td>{r.grade ?? '—'}</td>
                      <td>{submittedLabel(r.submitted)}</td>
                      <td>
                        <span className={`badge ${r.stage === 'assessment' ? 'applied' : 'partial'}`}>
                          {r.stage === 'assessment' ? 'Assessment' : 'Under review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="hint">No applications are waiting.</p>
            )}
          </section>
          <section className="card dash-card">
            <header className="dash-head">
              <span>
                <h2>Today&apos;s priorities</h2>
                <small>Tasks for your admissions and admin teams</small>
              </span>
              <Link to="/attendance">Attendance →</Link>
            </header>
            <ul className="tasks">
              {[
                d.needFollowUp > 0 && [
                  `Follow up with ${d.needFollowUp} enquir${d.needFollowUp === 1 ? 'y' : 'ies'}`,
                  'Today',
                  '/admissions',
                ],
                d.underReview > 0 && [
                  `Review ${d.underReview} pending application${d.underReview === 1 ? '' : 's'}`,
                  'Today',
                  '/applications',
                ],
                d.unmarkedClasses?.length > 0 && [
                  `Complete attendance: ${d.unmarkedClasses.slice(0, 2).join(', ')}${d.unmarkedClasses.length > 2 ? ` and ${d.unmarkedClasses.length - 2} more` : ''}`,
                  'By 9:00 AM',
                  '/attendance',
                ],
                d.overdueFees > 0 && ['Send fee reminders', `${d.overdueFees} overdue`, '/fee-reminders'],
              ]
                .filter(Boolean)
                .map(([text, when, to]) => (
                  <li key={text}>
                    <span className="check-box" aria-hidden="true" />
                    <Link to={to}>{text}</Link>
                    <time>{when}</time>
                  </li>
                ))}
              {!(d.needFollowUp || d.underReview || d.unmarkedClasses?.length || d.overdueFees) && (
                <li>
                  <span className="check-box done" aria-hidden="true" />
                  You are all caught up.
                </li>
              )}
            </ul>
          </section>
        </div>
      )}

      <h2 className="dash-more">More about the school</h2>
      <div className="stats">
        <Tile icon="🎓" tone="blue" label="Active students" value={d.students} />
        <Tile icon="👥" tone="violet" label="Staff" value={d.staff} />
        <Tile icon="🏫" tone="teal" label="Classes" value={d.classes} />
        <Tile
          icon="📝"
          tone="amber"
          label="Admissions in progress"
          value={d.pendingAdmissions}
          to="/admissions"
        />
        <Tile
          icon="💰"
          tone="rose"
          label="Fees outstanding"
          value={money(d.feesDue)}
          hint={d.overdueFees ? `${d.overdueFees} overdue item(s)` : 'Nothing overdue'}
        />
        <Tile icon="✅" tone="green" label="Collected this month" value={money(d.collectedThisMonth)} />
        <Tile icon="📖" tone="orange" label="Overdue library books" value={d.overdueBooks} to="/library" />
      </div>

      <div className="chart-grid">
        <section className="card chart-card">
          <h2>Today&apos;s attendance</h2>
          {marked ? (
            <Donut
              caption="present"
              centre={`${Math.round(((att.present + att.late) / marked) * 100)}%`}
              segments={[
                { label: 'Present', value: att.present, className: 'seg-green' },
                { label: 'Late', value: att.late, className: 'seg-amber' },
                { label: 'Absent', value: att.absent, className: 'seg-red' },
              ]}
            />
          ) : (
            <p className="empty">
              Not marked yet. <Link to="/attendance">Mark attendance</Link>
            </p>
          )}
        </section>
        <section className="card chart-card">
          <h2>Attendance, last 7 days</h2>
          {hasTrend ? (
            <Bars
              data={days}
              max={100}
              format={(v) => `${Math.round(v)}%`}
              caption="Share of students present"
            />
          ) : (
            <p className="empty">No attendance recorded this week.</p>
          )}
        </section>
        <section className="card chart-card">
          <h2>Fees collected, last 6 months</h2>
          {hasCollections ? (
            <Bars data={months} format={short} caption="Fees collected" className="bar-fill alt" />
          ) : (
            <p className="empty">No payments recorded in the last six months.</p>
          )}
        </section>
      </div>

      <div className="two-col">
        <section>
          <h2>Upcoming events</h2>
          {d.upcomingEvents.length ? (
            <ul className="feed card">
              {d.upcomingEvents.map((e) => (
                <li key={e.id}>
                  <span className="date-pill">
                    {new Date(`${e.startDate}T00:00:00`).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span>
                    {e.title}
                    {e.endDate !== e.startDate && <small> until {e.endDate}</small>}
                  </span>
                  <span className="badge">{e.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">
              Nothing scheduled in the next 30 days. <Link to="/calendar">Open the calendar</Link>
            </p>
          )}
        </section>
        <section>
          <h2>Latest notices</h2>
          {d.notices.length ? (
            d.notices.map((n) => (
              <div className="card notice" key={n.id}>
                <b>{n.title}</b>{' '}
                <small>
                  · {n.audience} · {String(n.createdAt).slice(0, 10)}
                </small>
                <p>{n.body}</p>
              </div>
            ))
          ) : (
            <p className="hint">No notices posted.</p>
          )}
        </section>
      </div>
    </>
  );
}
