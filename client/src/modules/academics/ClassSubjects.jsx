import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import SubjectMapModal from '../../components/SubjectMapModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

export const classOption = { path: '/classes', map: (c) => ({ value: c.id, label: `${c.name}-${c.section}` }) };

const TONE = { theory: 'applied', practical: 'partial', theory_practical: 'paid' };

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/**
 * The subject map of a class: each subject, who teaches it, whether it is theory, practical or both, whether it is core or an
 * elective (students pick one from each elective group), and how many periods it gets. Electives are chosen per student.
 */
export default function ClassSubjects() {
  const canWrite = useAuth().user?.role === 'admin';
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [map, setMap] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [tab, setTab] = useState('subjects');
  const [entry, setEntry] = useState(null); // null | { row } (row = the subject being edited, or null to add)
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useOpenNew(() => openNew(), canWrite); // eslint-disable-line no-use-before-define

  useEffect(() => { api('/classes').then((c) => { setClasses(c); if (c[0]) setClassId((id) => id || String(c[0].id)); }).catch((e) => setError(e.message)); }, []);
  const load = useCallback(() => {
    if (!classId) return;
    api(`/class-subjects/map?classId=${classId}`).then(setMap).catch((e) => setError(e.message));
    api(`/class-subjects/electives?classId=${classId}`).then(setSheet).catch(() => {});
  }, [classId]);
  useEffect(() => { setMap(null); setSheet(null); load(); }, [load]);

  const openNew = () => { setError(''); setNotice(''); setEntry({ row: null }); };
  const openEdit = (s) => { setError(''); setNotice(''); setEntry({ row: s }); };

  const remove = async (s) => {
    setError(''); setNotice('');
    try { await api(`/class-subjects/${s.id}`, { method: 'DELETE' }); setNotice('Subject removed.'); load(); } catch (err) { setError(err.message); }
  };
  const choose = async (student, group, classSubjectId) => {
    setError(''); setNotice('');
    const keep = student.choices.filter((id) => !group.subjects.some((s) => s.classSubjectId === id));
    try {
      await api(`/students/${student.id}/electives`, { method: 'PUT', body: { classSubjectIds: classSubjectId ? [...keep, Number(classSubjectId)] : keep } });
      setNotice(`Saved ${student.name}'s choice.`); load();
    } catch (err) { setError(err.message); }
  };

  const rows = map?.subjects ?? [];
  const groups = [...new Set(rows.filter((s) => s.isElective && s.electiveGroup).map((s) => s.electiveGroup))];
  const electiveCount = rows.filter((s) => s.isElective).length;
  const hasElectives = Boolean(sheet?.groups.length);
  const undecided = sheet ? sheet.students.filter((st) => sheet.groups.some((g) => !g.subjects.some((s) => st.choices.includes(s.classSubjectId)))).length : 0;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Subject map</h1>
          <p className="hint">The subjects each class studies, who teaches them, how they are taught and which are electives. Marks, report cards and the timetable follow this map.</p>
        </div>
        <div className="head-actions">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class" style={{ minHeight: 44 }}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.section}</option>)}</select>
          {canWrite && <button type="button" className="big-action" onClick={openNew} disabled={!classId}>＋ Add a subject</button>}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▧" tone="blue" label="Subjects" value={rows.length} hint={map ? `${rows.length - electiveCount} core, ${electiveCount} elective` : null} />
        <Tile icon="◷" tone="violet" label="Periods a week" value={rows.reduce((n, s) => n + (s.periodsPerWeek ?? 0), 0) || '—'} hint={rows.some((s) => s.periodsPerWeek === null) ? 'Some subjects have no period count' : null} />
        <Tile icon="✦" tone="amber" label="Practical" value={rows.filter((s) => s.component !== 'theory').length} hint="with a practical component" />
        <Tile icon="♙" tone="green" label="Students" value={map?.students ?? '…'} hint={hasElectives ? `${undecided} still to choose electives` : null} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'subjects'} className={tab === 'subjects' ? 'on' : ''} onClick={() => setTab('subjects')}>Subjects<span className="count">{rows.length}</span></button>
          <button type="button" role="tab" aria-selected={tab === 'electives'} className={tab === 'electives' ? 'on' : ''} onClick={() => setTab('electives')}>Elective choices<span className="count">{undecided}</span></button>
        </div>

        {tab === 'subjects' && (
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead><tr><th>Subject</th><th>Type</th><th>Taught as</th><th>Periods / week</th><th>Teacher</th><th>Students</th>{canWrite && <th />}</tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td><b>{s.name}</b><small className="block">{s.code}</small></td>
                    <td>{s.isElective ? <span className="badge partial">● Elective{s.electiveGroup ? ` · ${s.electiveGroup}` : ''}</span> : <span className="badge paid">● Core</span>}</td>
                    <td><span className={`badge ${TONE[s.component]}`}>{s.componentLabel}</span>{s.practicalShare ? <small className="block">{s.practicalShare}% practical</small> : null}</td>
                    <td>{s.periodsPerWeek ?? <span className="none">—</span>}</td>
                    <td>{s.teacherName ?? <span className="none">Not assigned</span>}</td>
                    <td>{s.takers}{s.isElective && <small className="block">chose it</small>}</td>
                    {canWrite && <td className="row-actions"><button type="button" className="ghost" onClick={() => openEdit(s)}>Edit</button><button type="button" className="ghost danger" onClick={() => remove(s)}>Remove</button></td>}
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={canWrite ? 7 : 6} className="empty-row">{map ? 'No subjects in this class yet. Add the first one.' : 'Loading…'}</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'electives' && (
          <div className="table-scroll">
            {!hasElectives && <p className="hint" style={{ padding: '18px 22px', margin: 0 }}>This class has no electives. Mark a subject as an elective on the Subjects tab, and give alternatives the same group name (for example “Second language”): each student then picks one.</p>}
            {hasElectives && (
              <table className="enquiry-table">
                <thead><tr><th>Student</th>{sheet.groups.map((g) => <th key={g.name}>{g.name}</th>)}</tr></thead>
                <tbody>
                  {sheet.students.map((st) => (
                    <tr key={st.id}>
                      <td><b>{st.name}</b><small className="block">{st.admissionNo}</small></td>
                      {sheet.groups.map((g) => {
                        const current = g.subjects.find((s) => st.choices.includes(s.classSubjectId))?.classSubjectId ?? '';
                        return (
                          <td key={g.name}>
                            <select value={current} disabled={!canWrite} onChange={(e) => choose(st, g, e.target.value)} aria-label={`${g.name} for ${st.name}`}>
                              <option value="">Not chosen</option>{g.subjects.map((s) => <option key={s.classSubjectId} value={s.classSubjectId}>{s.name}</option>)}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!sheet.students.length && <tr><td colSpan={sheet.groups.length + 1} className="empty-row">No active students in this class.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <SubjectMapModal open={Boolean(entry)} classId={classId} subject={entry?.row ?? null} groups={groups} onClose={() => setEntry(null)} onSaved={(message) => { setNotice(message); setEntry(null); load(); }} />
    </>
  );
}
