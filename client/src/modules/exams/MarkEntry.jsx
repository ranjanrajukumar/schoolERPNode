import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** The marks sheet for one exam: a box per student and subject. Only the subjects this user may edit are open. */
export default function MarkEntry() {
  const { examId } = useParams();
  const [sheet, setSheet] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { api(`/exams/${examId}/marks`).then(setSheet).catch((e) => setError(e.message)); }, [examId]);
  useEffect(() => {
    // leaving with unsaved marks is the one way to lose work here
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const stats = useMemo(() => {
    if (!sheet) return null;
    const cells = sheet.students.reduce((n, s) => n + sheet.subjects.filter((sub) => !s.skips.includes(sub.id)).length, 0);
    const filled = sheet.students.reduce((n, s) => n + sheet.subjects.filter((sub) => !s.skips.includes(sub.id) && s.marks[sub.id] !== undefined && s.marks[sub.id] !== '' && s.marks[sub.id] !== null).length, 0);
    return { cells, filled };
  }, [sheet]);

  const setMark = (studentId, subjectId, value) => {
    setDirty(true);
    setSheet({ ...sheet, students: sheet.students.map((s) => (s.studentId === studentId ? { ...s, marks: { ...s.marks, [subjectId]: value } } : s)) });
  };

  const setPart = (studentId, subjectId, part, value) => {
    setDirty(true);
    setSheet({
      ...sheet,
      students: sheet.students.map((s) => {
        if (s.studentId !== studentId) return s;
        const parts = { ...(s.parts ?? {}), [subjectId]: { ...((s.parts ?? {})[subjectId] ?? {}), [part]: value } };
        const p = parts[subjectId];
        const filled = [p.theory, p.practical].some((v) => v !== '' && v !== undefined);
        return { ...s, parts, marks: { ...s.marks, [subjectId]: filled ? String(Number(p.theory || 0) + Number(p.practical || 0)) : '' } };
      }),
    });
  };

  const save = async () => {
    setError(''); setNotice(''); setBusy(true);
    // Only the columns this user may edit are sent; the server refuses anything else.
    const records = sheet.students.flatMap((s) => sheet.subjects.filter((sub) => sub.editable && !s.skips.includes(sub.id)).map((sub) => {
      const base = { studentId: s.studentId, subjectId: sub.id };
      if (!sub.split) return { ...base, marks: s.marks[sub.id] ?? '' };
      const p = s.parts?.[sub.id];
      if (p) return { ...base, theory: p.theory ?? '', practical: p.practical ?? '' };
      // a total entered before the marks were split stays as it is until someone enters the two parts
      return s.marks[sub.id] !== undefined && s.marks[sub.id] !== '' ? { ...base, marks: s.marks[sub.id] } : { ...base, theory: '', practical: '' };
    }));
    try { await api(`/exams/${examId}/marks`, { method: 'POST', body: { records } }); setNotice('Marks saved.'); setDirty(false); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (!sheet) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const { exam, subjects, students } = sheet;
  const canSave = subjects.some((sub) => sub.editable);
  const needle = q.trim().toLowerCase();
  const shown = students.filter((s) => !needle || `${s.name} ${s.admissionNo}`.toLowerCase().includes(needle));
  const pct = stats.cells ? Math.round((stats.filled / stats.cells) * 100) : 0;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Marks · {exam.name}</h1>
          <p className="hint">Each subject is out of {exam.maxMarks}. Leave a box empty if the student was absent or has no mark yet.</p>
        </div>
        <div className="head-actions">
          <Link className="ghost btn" to={`/exams/${examId}/results`}>View results</Link>
          <button type="button" className="big-action" onClick={save} disabled={!canSave || busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save marks' : 'Saved'}</button>
        </div>
      </div>
      {subjects.length > 0 && !canSave && <p className="error">You have no subjects assigned in this class, so this sheet is read-only. An admin can assign you under Class subjects (your login email must match the email on your staff profile).</p>}
      {canSave && subjects.some((sub) => !sub.editable) && <p className="hint">Greyed-out subjects belong to other teachers and are read-only for you.</p>}
      {!subjects.length && <p className="error">This class has no subjects yet. Add them under Class subjects first.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Students" value={students.length} />
        <Tile icon="▧" tone="violet" label="Subjects" value={subjects.length} hint={`${subjects.filter((s) => s.editable).length} you can edit`} />
        <Tile icon="✓" tone="green" label="Marks entered" value={`${stats.filled} / ${stats.cells}`} hint={`${pct}% complete`} />
        <Tile icon="◷" tone="amber" label="Still to enter" value={stats.cells - stats.filled} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student or ID…" aria-label="Search students" /></label>
          <span className="showing">{dirty ? 'Unsaved changes' : `${shown.length} of ${students.length} students`}</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Student</th>{subjects.map((s) => <th key={s.id}>{s.name}{s.elective && <small className="block">elective</small>}{s.split && <small className="block">{s.split.theory > 0 ? `theory ${s.split.theory} + ` : ''}practical {s.split.practical}</small>}{!s.editable && <small className="block">read-only</small>}</th>)}</tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.studentId}>
                  <td><b>{s.name}</b><small className="block">{s.admissionNo}</small></td>
                  {subjects.map((sub) => (
                    <td key={sub.id}>
                      {s.skips.includes(sub.id) ? <span className="none">not taken</span> : sub.split ? (
                        <span className="split-marks">
                          {sub.split.theory > 0 && <input className="mark part" type="number" disabled={!sub.editable} min="0" max={sub.split.theory} step="0.5" placeholder="T" aria-label={`${s.name} ${sub.name} theory`} value={s.parts?.[sub.id]?.theory ?? ''} onChange={(e) => setPart(s.studentId, sub.id, 'theory', e.target.value)} />}
                          <input className="mark part" type="number" disabled={!sub.editable} min="0" max={sub.split.practical} step="0.5" placeholder="P" aria-label={`${s.name} ${sub.name} practical`} value={s.parts?.[sub.id]?.practical ?? ''} onChange={(e) => setPart(s.studentId, sub.id, 'practical', e.target.value)} />
                          <b className="split-total" title="Total">{s.marks[sub.id] !== undefined && s.marks[sub.id] !== '' ? Number(s.marks[sub.id]) : '—'}</b>
                        </span>
                      ) : (
                        <input className="mark" type="number" disabled={!sub.editable} min="0" max={exam.maxMarks} step="0.5" aria-label={`${s.name} ${sub.name}`}
                          value={s.marks[sub.id] ?? ''} onChange={(e) => setMark(s.studentId, sub.id, e.target.value)} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={subjects.length + 1} className="empty-row">{needle ? 'No students match.' : 'No active students in this class.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
