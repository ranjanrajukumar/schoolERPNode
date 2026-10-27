import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { loadPublicSettings } from '../../services/settings.js';
import Pagination from '../../components/Pagination.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const today = () => localDate();
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const STATUSES = ['present', 'absent', 'late'];
const TABS = [['all', 'All students'], ['present', 'Present'], ['absent', 'Absent'], ['late', 'Late'], ['unmarked', 'Not marked']];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Mark who is in each lesson; the subject comes from the class timetable. */
export default function PeriodAttendance() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState(1);
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [minPercent, setMinPercent] = useState(75);

  useEffect(() => { api('/classes').then(setClasses); loadPublicSettings().then((x) => setMinPercent(x.attendanceMinPercent)); }, []);

  const load = () => {
    if (!classId) { setData(null); setSummary([]); return; }
    api(`/period-attendance?classId=${classId}&date=${date}&period=${period}`).then(setData).catch((e) => setError(e.message));
    api(`/period-attendance/summary?classId=${classId}&from=${date.slice(0, 7)}-01&to=${date}`).then(setSummary).catch(() => {});
  };
  useEffect(() => { setNotice(''); setError(''); setPage(1); load(); }, [classId, date, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = (id, status) => setData({ ...data, students: data.students.map((s) => (s.studentId === id ? { ...s, status } : s)) });
  const markRest = (status) => setData({ ...data, students: data.students.map((s) => (s.status ? s : { ...s, status })) });

  const save = async () => {
    setError(''); setNotice('');
    const records = data.students.filter((s) => s.status).map(({ studentId, status }) => ({ studentId, status }));
    try {
      await api('/period-attendance', { method: 'POST', body: { classId, date, period, subjectId: data.subjectId, records } });
      setNotice(`Saved ${records.length} records.`);
      load();
    } catch (err) { setError(err.message); }
  };

  const students = data?.students ?? [];
  const count = (k) => (k === 'all' ? students.length : k === 'unmarked' ? students.filter((s) => !s.status).length : students.filter((s) => s.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = students.filter((s) => (tab === 'all' || (tab === 'unmarked' ? !s.status : s.status === tab)) && (!needle || `${s.name} ${s.admissionNo}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Period attendance</h1>
          <p className="hint">Mark who is in each lesson. The subject comes from the class timetable for that day and period.{data && ` ${data.subjectName ? `Subject: ${data.subjectName}.` : 'No timetable entry for this period.'}`}</p>
        </div>
        <div className="head-actions">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class" style={{ minHeight: 44 }}><option value="">-- choose class --</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}</select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} aria-label="Date" style={{ minHeight: 44 }} />
          <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} aria-label="Period" style={{ minHeight: 44 }}>{PERIODS.map((p) => <option key={p} value={p}>Period {p}</option>)}</select>
          {data && <button type="button" className="big-action" onClick={save}>Save attendance</button>}
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Students" value={students.length} />
        <Tile icon="✓" tone="green" label="Present" value={count('present')} />
        <Tile icon="×" tone="red" label="Absent" value={count('absent')} hint={count('late') ? `${count('late')} late` : null} />
        <Tile icon="◷" tone="amber" label="Not marked yet" value={count('unmarked')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student…" aria-label="Search students" /></label>
          {data && <button type="button" className="ghost" onClick={() => markRest('present')}>Mark rest present</button>}
          <span className="showing">{shown.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Adm. no</th><th>Student</th><th>Status</th></tr></thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.studentId}>
                  <td>{s.admissionNo}</td>
                  <td><b>{s.name}</b>{s.onApprovedLeave && <> <span className="badge partial">approved leave</span></>}</td>
                  <td>
                    <select className={`att-select ${s.status ?? ''}`} value={s.status ?? ''} onChange={(e) => mark(s.studentId, e.target.value || null)} aria-label={`Status of ${s.name}`}>
                      <option value="">Not marked</option>{STATUSES.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={3} className="empty-row">{!classId ? 'Choose a class.' : needle || tab !== 'all' ? 'No students match.' : 'No active students in this class.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      {summary.length > 0 && (
        <section className="card enquiry-card">
          <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>This month so far</h2><small>Below {minPercent}% is flagged</small></span></header>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead><tr><th>Student</th><th>Periods marked</th><th>Absent</th><th>Late</th><th>Attendance %</th></tr></thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.studentId}>
                    <td><b>{s.name}</b><small className="block">{s.admissionNo}</small></td><td>{s.periods}</td><td>{s.absent}</td><td>{s.late}</td>
                    <td>{s.percentage === null ? '—' : <span className={`badge ${s.percentage < minPercent ? 'rejected' : 'paid'}`}>● {s.percentage}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
