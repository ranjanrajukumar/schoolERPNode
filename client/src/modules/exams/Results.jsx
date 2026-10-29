import { useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 10;
const TABS = [
  ['all', 'All students'],
  ['pass', 'Passed'],
  ['fail', 'Failed'],
  ['incomplete', 'Incomplete'],
];
const PILL = { pass: 'paid', fail: 'rejected', incomplete: 'partial' };
const LABEL = { pass: 'Pass', fail: 'Fail', incomplete: 'Incomplete' };
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

/** One exam's results: who passed, the average, the top scorer, and each student's report card. */
export default function Results() {
  const { examId } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/exams/${examId}/results`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [examId]);

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const { exam, rows } = data;
  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.result === k).length);
  const complete = rows.filter((r) => r.result !== 'incomplete');
  const average = rows.length ? rows.reduce((n, r) => n + Number(r.percentage), 0) / rows.length : null;
  const top = rows[0];
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || r.result === tab) &&
      (!needle || `${r.name} ${r.admissionNo}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;

  const exportCsv = () => {
    const head = ['Rank', 'Admission no', 'Student', 'Total', 'Out of', 'Percentage', 'Grade', 'Result'];
    const lines = shown.map((r) =>
      [r.rank, r.admissionNo, r.name, r.total, r.outOf, r.percentage, r.grade, r.result]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${exam.name}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Results · {exam.name}</h1>
          <p className="hint">
            {rows.length} student{rows.length === 1 ? '' : 's'} with marks. Each subject is out of{' '}
            {exam.maxMarks}.
          </p>
        </div>
        <div className="head-actions">
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          <Link className="big-action" to={`/exams/${examId}/marks`}>
            Enter marks
          </Link>
        </div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile
          icon="♙"
          tone="blue"
          label="Students"
          value={rows.length}
          hint={`${complete.length} with every subject marked`}
        />
        <Tile
          icon="✓"
          tone="green"
          label="Passed"
          value={count('pass')}
          hint={complete.length ? `${Math.round((count('pass') / complete.length) * 100)}% pass rate` : null}
        />
        <Tile
          icon="◷"
          tone="amber"
          label="Class average"
          value={average === null ? '—' : `${average.toFixed(1)}%`}
        />
        <Tile
          icon="★"
          tone="violet"
          label="Top score"
          value={top ? `${top.percentage}%` : '—'}
          hint={top?.name}
        />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
            >
              {l}
              <span className="count">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search student or ID…"
              aria-label="Search students"
            />
          </label>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, shown.length)}
            </b>{' '}
            of <b>{shown.length}</b>
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Total</th>
                <th>Percentage</th>
                <th>Grade</th>
                <th>Result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.studentId}>
                  <td>
                    <b>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</b>
                  </td>
                  <td>
                    <b>{r.name}</b>
                    <small className="block">{r.admissionNo}</small>
                  </td>
                  <td>
                    {r.total} / {r.outOf}
                  </td>
                  <td>{r.percentage}%</td>
                  <td>
                    <span className="badge applied">{r.grade}</span>
                  </td>
                  <td>
                    <span className={`badge ${PILL[r.result]}`}>● {LABEL[r.result]}</span>
                  </td>
                  <td className="row-actions">
                    <Link className="btn" to={`/exams/${examId}/report-card/${r.studentId}`}>
                      Report card
                    </Link>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {needle || tab !== 'all' ? 'No students match.' : 'No marks entered yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
