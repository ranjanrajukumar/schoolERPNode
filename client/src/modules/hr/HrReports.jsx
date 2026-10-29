import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { loadPublicSettings } from '../../services/settings.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;

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

/** HR at a glance: headcount, pending leave and each active staff member's attendance for a month. */
export default function HrReports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [d, setD] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [minPercent, setMinPercent] = useState(75);
  useEffect(() => {
    loadPublicSettings().then((x) => setMinPercent(x.attendanceMinPercent));
  }, []);

  useEffect(() => {
    api(`/hr/reports?month=${month}`)
      .then(setD)
      .catch((e) => setError(e.message));
  }, [month]);

  const needle = q.trim().toLowerCase();
  const shown = (d?.staff ?? []).filter(
    (s) => !needle || `${s.name} ${s.staffNo} ${s.department ?? ''}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const low = (d?.staff ?? []).filter(
    (s) => s.attendancePercent !== null && s.attendancePercent < minPercent,
  ).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>HR reports</h1>
          <p className="hint">Headcount, leave and staff attendance for the chosen month.</p>
        </div>
        <div className="head-actions">
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
            aria-label="Month"
            style={{ minHeight: 44 }}
          />
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {d && (
        <>
          <div className="stats enquiry-tiles four">
            <Tile
              icon="♙"
              tone="blue"
              label="Active staff"
              value={d.headcount}
              hint={`${d.byDepartment.length} department${d.byDepartment.length === 1 ? '' : 's'}`}
            />
            <Tile icon="◷" tone="amber" label="Leave awaiting decision" value={d.pendingLeaves} />
            <Tile icon="!" tone="red" label={`Below ${minPercent}% attendance`} value={low} />
            <Tile
              icon="▤"
              tone="violet"
              label="Largest department"
              value={[...d.byDepartment].sort((a, b) => b.headcount - a.headcount)[0]?.headcount ?? 0}
              hint={[...d.byDepartment].sort((a, b) => b.headcount - a.headcount)[0]?.department}
            />
          </div>

          {d.byDepartment.length > 0 && (
            <section className="card enquiry-card">
              <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
                <span>
                  <h2>Headcount by department</h2>
                  <small>Active staff</small>
                </span>
              </header>
              <div className="table-scroll">
                <table className="enquiry-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.byDepartment.map((x) => (
                      <tr key={x.department}>
                        <td>
                          <b>{x.department}</b>
                        </td>
                        <td>{x.headcount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="card enquiry-card">
            <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
              <span>
                <h2>Attendance — {d.month}</h2>
                <small>
                  Attendance % counts present and late days over the days marked. Rows in red are below{' '}
                  {minPercent}%.
                </small>
              </span>
            </header>
            <div className="toolbar">
              <label className="search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search staff or department…"
                  aria-label="Search staff"
                />
              </label>
              <span className="showing">{shown.length} staff</span>
            </div>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Department</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Leave</th>
                    <th>Attendance %</th>
                    <th>Leave taken this year</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((s) => (
                    <tr
                      key={s.staffId}
                      className={
                        s.attendancePercent !== null && s.attendancePercent < minPercent ? 'failed' : ''
                      }
                    >
                      <td>
                        <b>{s.name}</b>
                        <small className="block">{s.staffNo}</small>
                      </td>
                      <td>{s.department ?? '—'}</td>
                      <td>{s.present}</td>
                      <td>{s.late}</td>
                      <td>{s.absent}</td>
                      <td>{s.leave}</td>
                      <td>{s.attendancePercent ?? '—'}</td>
                      <td>{s.leaveTakenThisYear} day(s)</td>
                    </tr>
                  ))}
                  {!pageRows.length && (
                    <tr>
                      <td colSpan={8} className="empty-row">
                        {needle ? 'No staff match.' : 'No active staff.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
          </section>
        </>
      )}
    </>
  );
}
