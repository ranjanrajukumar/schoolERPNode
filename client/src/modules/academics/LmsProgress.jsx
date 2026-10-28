import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import './lms.css';

export default function LmsProgress() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  useEffect(() => { api('/lms/courses').then((rows) => { setCourses(rows); if (rows.length) setCourseId(String(rows[0].id)); }).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (!courseId) { setData(null); return; } setData(null); api(`/lms/courses/${courseId}/progress`).then(setData).catch((e) => setError(e.message)); }, [courseId]);
  const course = courses.find((row) => String(row.id) === courseId);
  const filteredRows = (data?.rows ?? []).filter((row) => `${row.name} ${row.admissionNo}`.toLowerCase().includes(query.toLowerCase()) && (statusFilter === 'All statuses' || row.courseStatus === statusFilter));
  const exportCsv = () => {
    if (!data || !course) return;
    const columns = ['Admission number', 'Student', 'Course', 'Lessons read', 'Total reads', 'Lessons completed', 'Lessons total', 'Completion percent', 'Status', ...data.assignments.map((a) => `Assignment: ${a.title}`), ...data.quizzes.map((q) => `Test: ${q.title}`)];
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const lines = [columns, ...filteredRows.map((row) => [row.admissionNo, row.name, course.title, row.lessonsViewed, row.lessonViews, row.lessonsCompleted, row.lessonsTotal, row.lessonsTotal ? Math.round(row.lessonsCompleted * 100 / row.lessonsTotal) : 0, row.courseStatus, ...row.assignments.map((a, i) => a.score == null ? (a.submitted ? 'Submitted, awaiting grade' : 'Not submitted') : `${a.score}/${data.assignments[i].maxScore}`), ...row.quizzes.map((q, i) => q.bestScore == null ? 'No attempt' : `${q.bestScore}/${data.quizzes[i].maxScore}`)])];
    const blob = new Blob([`\uFEFF${lines.map((line) => line.map(quote).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${course.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-lms-report.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="lms-ns lms-page">
    <div className="profile-head"><div><h1>LMS Student Progress</h1><p className="hint">See who has opened lessons, total reads, course completion and assessment results.</p></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="card"><label><span>Course</span><select value={courseId} onChange={(e) => setCourseId(e.target.value)}><option value="">Choose course</option>{courses.map((row) => <option key={row.id} value={row.id}>{row.title} · {row.className} · {row.subjectName}</option>)}</select></label></div>
    {course && data && <div className="card" style={{ marginTop: 16 }}><div className="profile-head"><h2>{course.title} · {course.className}</h2><button type="button" className="ghost" onClick={exportCsv}>Export CSV</button></div><div className="enq-grid"><label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student or admission no…" aria-label="Search course progress" /></label><label><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{['All statuses', 'Not started', 'In progress', 'Completed'].map((status) => <option key={status}>{status}</option>)}</select></label></div>
      <div className="table-scroll"><table className="enquiry-table"><thead><tr><th>Student</th><th>Lessons read</th><th>Total reads</th><th>Lessons complete</th><th>Course progress</th><th>Status</th></tr></thead><tbody>
        {filteredRows.map((row) => { const pct = row.lessonsTotal ? Math.round(row.lessonsCompleted * 100 / row.lessonsTotal) : 0; return <tr key={row.studentId}><td><b>{row.name}</b><small className="block">{row.admissionNo}</small></td><td>{row.lessonsViewed}/{row.lessonsTotal}</td><td>{row.lessonViews}</td><td>{row.lessonsCompleted}/{row.lessonsTotal}</td><td><span className="lms-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${row.name} course progress`}><i style={{ width: `${pct}%` }} /></span>{pct}%</td><td><span className={`badge ${row.courseStatus === 'Completed' ? 'active' : row.courseStatus === 'In progress' ? 'partial' : ''}`}>{row.courseStatus}</span></td></tr>; })}
        {!filteredRows.length && <tr><td colSpan={6} className="empty-row">{data.rows.length ? 'No students match this search.' : 'No active students in this class.'}</td></tr>}
      </tbody></table></div>
    </div>}
    {courses.length === 0 && <p className="hint">Create an LMS course to start tracking student progress.</p>}
  </div>;
}
