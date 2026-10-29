import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

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

/** The merit list for one exam or exam group: top students who passed every subject; equal scores share a position. */
export default function MeritList() {
  const [exams, setExams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pick, setPick] = useState(''); // "exam:12" or "group:3"
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/exams')
      .then(setExams)
      .catch(() => {});
    api('/exams/groups')
      .then(setGroups)
      .catch(() => {});
  }, []);
  useEffect(() => {
    setError('');
    if (!pick) {
      setData(null);
      return;
    }
    const [kind, id] = pick.split(':');
    api(`/exams/merit?${kind === 'group' ? 'groupId' : 'examId'}=${id}&limit=${limit}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [pick, limit]);

  const byWeighted = data?.basedOn === 'weighted percentage';
  const exportCsv = () => {
    const head = [
      'Position',
      'Admission no',
      'Student',
      byWeighted ? 'Overall %' : 'Total',
      'Percentage',
      'Grade',
    ];
    const lines = data.rows.map((r) =>
      [
        r.merit,
        r.admissionNo,
        r.name,
        byWeighted ? r.percentage : `${r.total} / ${r.outOf}`,
        r.percentage,
        r.grade,
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const l = document.createElement('a');
    l.href = url;
    l.download = 'merit-list.csv';
    document.body.appendChild(l);
    l.click();
    l.remove();
    URL.revokeObjectURL(url);
  };
  const top = data?.rows[0];
  const average = data?.rows.length
    ? data.rows.reduce((n, r) => n + Number(r.percentage), 0) / data.rows.length
    : null;

  return (
    <>
      <div className="profile-head no-print">
        <div>
          <h1>Merit list</h1>
          <p className="hint">
            Top students who passed every subject. Students who failed or have marks missing are left out;
            equal scores share a position.
          </p>
        </div>
        <div className="head-actions">
          {data?.rows.length > 0 && (
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          )}
          {data?.rows.length > 0 && (
            <button type="button" className="big-action" onClick={() => window.print()}>
              Print
            </button>
          )}
        </div>
      </div>

      <section className="card enquiry-card no-print">
        <div className="toolbar">
          <label className="range-field">
            <span>Exam or group</span>
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Choose…</option>
              <optgroup label="Exam groups">
                {groups.map((g) => (
                  <option key={`g${g.id}`} value={`group:${g.id}`}>
                    {g.name} ({g.className})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Single exams">
                {exams.map((e) => (
                  <option key={`e${e.id}`} value={`exam:${e.id}`}>
                    {e.name} ({e.className})
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="range-field">
            <span>Show top</span>
            <input
              type="number"
              min="1"
              max="200"
              style={{ width: 90 }}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </label>
        </div>
      </section>
      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <div className="stats enquiry-tiles four no-print">
            <Tile
              icon="★"
              tone="violet"
              label="Top score"
              value={top ? `${top.percentage}%` : '—'}
              hint={top?.name}
            />
            <Tile icon="♙" tone="blue" label="On the list" value={data.rows.length} />
            <Tile
              icon="◷"
              tone="amber"
              label="Average of the list"
              value={average === null ? '—' : `${average.toFixed(1)}%`}
            />
            <Tile
              icon="▤"
              tone="green"
              label="Class"
              value={data.className}
              hint={byWeighted ? 'Weighted across the group' : 'Single exam'}
            />
          </div>
          <section className="card enquiry-card">
            <header className="card-head" style={{ padding: '22px 22px 12px', marginBottom: 0 }}>
              <span>
                <h2>{data.title} · merit list</h2>
                <small>{data.className}</small>
              </span>
            </header>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Student</th>
                    <th>{byWeighted ? 'Overall %' : 'Total'}</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.studentId}>
                      <td>
                        <b>{r.merit <= 3 ? ['🥇', '🥈', '🥉'][r.merit - 1] : r.merit}</b>
                      </td>
                      <td>
                        <b>{r.name}</b>
                        <small className="block">{r.admissionNo}</small>
                      </td>
                      <td>{byWeighted ? r.percentage : `${r.total} / ${r.outOf}`}</td>
                      <td>{r.percentage}%</td>
                      <td>
                        <span className="badge applied">{r.grade}</span>
                      </td>
                    </tr>
                  ))}
                  {!data.rows.length && (
                    <tr>
                      <td colSpan={5} className="empty-row">
                        Nobody has passed with complete marks yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {!data && !error && <p className="hint">Choose an exam or an exam group to see its merit list.</p>}
    </>
  );
}
