import { useState } from 'react';
import { fetchBlob } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CourseCard, longDate } from './lmsUi.jsx';
import './lms.css';

const kindOf = (mime = '', name = '') => (mime.startsWith('video/') ? 'VIDEO' : (name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase());

// Student (and parent) LMS summary, built from the courses the portal already loaded: nothing here is stored separately.
export default function LmsStudentHome({ courses, base, readOnly }) {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const firstName = (user?.name || '').split(' ')[0] || 'there';

  const work = courses.flatMap((c) => [
    ...c.assignments.map((a) => ({ key: `a${a.id}`, kind: 'Assignment', title: a.title, course: c.title, dueOn: a.dueOn, done: Boolean(a.submission), overdue: a.overdue, score: a.submission?.score != null ? `${a.submission.score}/${a.maxScore}` : null })),
    ...c.quizzes.map((q) => ({ key: `q${q.id}`, kind: 'Quiz', title: q.title, course: c.title, dueOn: q.dueOn, done: q.attemptCount > 0, overdue: q.overdue && q.attemptCount === 0, score: q.bestScore != null ? `${q.bestScore}/${q.maxScore}` : null })),
  ]).sort((a, b) => (a.dueOn || '9999').localeCompare(b.dueOn || '9999'));
  const todo = work.filter((w) => !w.done).length;
  const average = courses.length ? Math.round(courses.reduce((sum, c) => sum + c.completionPercent, 0) / courses.length) : 0;

  const materials = courses.flatMap((c) => [
    ...(c.materials ?? []).map((m) => ({ key: `m${m.id}`, name: m.kind === 'file' ? m.attachmentName : m.title, label: m.kind === 'file' ? kindOf(m.attachmentMime, m.attachmentName) : m.kind === 'video' ? 'LINK' : 'WEB', url: m.kind === 'file' ? null : m.url, mime: m.attachmentMime, course: c.title, path: m.kind === 'file' ? `${base}/lms/materials/${m.id}/file` : null, skip: m.kind === 'file' && !m.hasAttachment })).filter((m) => !m.skip),
    ...c.lessons.flatMap((l) => [
    ...(l.hasAttachment ? [{ key: `l${l.id}`, name: l.attachmentName, mime: l.attachmentMime, course: c.title, path: `${base}/lms/lessons/${l.id}/file` }] : []),
    ...(l.parts ?? []).filter((p) => p.kind === 'file' && p.hasAttachment).map((p) => ({ key: `p${p.id}`, name: p.attachmentName, mime: p.attachmentMime, course: c.title, path: `${base}/lms/parts/${p.id}/file` })),
  ])]);
  const resourceCount = (c) => (c.materials ?? []).length + c.lessons.reduce((n, l) => n + (l.hasAttachment ? 1 : 0) + (l.parts ?? []).filter((p) => p.kind === 'file' && p.hasAttachment).length, 0);

  const download = async (m) => {
    try { const url = URL.createObjectURL(await fetchBlob(m.path)); const a = document.createElement('a'); a.href = url; a.download = m.name || 'material'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setError(''); }
    catch (e) { setError(e.message); }
  };
  const openCourse = (id) => document.getElementById(`lms-course-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return <div className="lms-home">
    <div className="profile-head"><div><p className="lms-eyebrow">Your learning space</p><h1>{readOnly ? 'Learning overview' : `Welcome back, ${firstName}`} <span className="lms-spark" aria-hidden="true">✦</span></h1><p className="hint">Your courses, resources, and upcoming work all in one place.</p></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="lms-stats">
      <div className="lms-stat"><span>My courses</span><b>{courses.length}</b><small>Courses you’re enrolled in</small></div>
      <div className="lms-stat"><span>Average progress</span><b>{average}<i>%</i></b><small>Lessons completed so far</small></div>
      <div className="lms-stat"><span>Assessments to do</span><b>{todo}</b><small>{work.length - todo} already submitted</small></div>
    </div>

    <p className="lms-eyebrow">Your learning path</p>
    <h2 style={{ marginTop: 0 }}>My courses</h2>
    <div className="lms-course-grid">
      {courses.map((c, i) => <CourseCard key={c.id} course={c} index={i} meta={[`${c.total} LESSONS`, `${resourceCount(c)} RESOURCES`]} progress={c.completionPercent} progressLabel="complete" action="Open course" onOpen={() => openCourse(c.id)} />)}
    </div>

    <div className="lms-two">
      <section className="card"><p className="lms-eyebrow">Up next</p><h2 style={{ marginTop: 0 }}>Assignments &amp; quizzes</h2>
        {work.slice(0, 5).map((w) => <div className="lms-row" key={w.key}><span className="lms-icon" aria-hidden="true">{w.kind === 'Quiz' ? '?' : '✓'}</span><div><b>{w.title}</b><small className="block">{w.course}{w.dueOn ? ` · Due ${longDate(w.dueOn)}` : ''}</small></div>
          <span className={`badge ${w.score ? 'active' : w.overdue ? 'rejected' : w.done ? '' : 'partial'}`}>{w.score ? `Score ${w.score}` : w.done ? 'Submitted' : w.overdue ? 'Overdue' : 'To do'}</span></div>)}
        {!work.length && <p className="hint">Nothing is due. New assignments and quizzes appear here.</p>}
      </section>
      <section className="card"><p className="lms-eyebrow">Course resources</p><h2 style={{ marginTop: 0 }}>Recent materials</h2>
        {materials.slice(0, 5).map((m) => <div className="lms-row" key={m.key}><span className="lms-icon file">{m.label ?? kindOf(m.mime, m.name)}</span><div><b>{m.name}</b><small className="block">{m.course}</small></div>{m.url ? <a className="btn" href={m.url} target="_blank" rel="noopener noreferrer">Open</a> : <button type="button" className="ghost" onClick={() => download(m)}>Download</button>}</div>)}
        {!materials.length && <p className="hint">Files your teachers upload appear here.</p>}
      </section>
    </div>
    <h2 id="lms-course-list">Course content</h2>
  </div>;
}
