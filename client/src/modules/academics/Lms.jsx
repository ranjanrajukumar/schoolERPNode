import { useCallback, useEffect, useState } from 'react';
import { api, fetchBlob, uploadFile } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import LmsAssessmentPanel from './LmsAssessmentPanel.jsx';
import LmsParts from './LmsParts.jsx';
import { BannerPicker, TagInput, TagList } from './LmsCourseMeta.jsx';
import './lms.css';

const EMPTY_LESSON = { moduleId: '', title: '', sequence: '', content: '', videoUrl: '', resourceUrl: '', published: true };

export default function Lms() {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tab, setTab] = useState('content');
  const [tagMaster, setTagMaster] = useState([]);
  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [bannerImage, setBannerImage] = useState('');
  const [editingCourse, setEditingCourse] = useState(null);
  const [selected, setSelected] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [modules, setModules] = useState([]);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', sequence: 1, published: true });
  const [editingModule, setEditingModule] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' });
  const [roster, setRoster] = useState([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterSaving, setRosterSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);
  const [lessonFile, setLessonFile] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [modal, setModal] = useState(false);
  const [courseModal, setCourseModal] = useState(false);
  const [moduleModal, setModuleModal] = useState(false);
  const [announceModal, setAnnounceModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [partsOf, setPartsOf] = useState(null);
  const [viewParts, setViewParts] = useState([]);
  const [partVideo, setPartVideo] = useState(null);
  const partPath = (p) => `/lms/courses/${selected.id}/lessons/${viewing.id}/parts/${p.id}/file`;
  const downloadPart = async (p) => { try { const url = URL.createObjectURL(await fetchBlob(partPath(p))); const a = document.createElement('a'); a.href = url; a.download = p.attachmentName || 'lesson-file'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (err) { setError(err.message); } };
  const playPart = async (p) => { try { if (partVideo) URL.revokeObjectURL(partVideo.url); setPartVideo({ id: p.id, url: URL.createObjectURL(await fetchBlob(partPath(p))) }); } catch (err) { setError(err.message); } };
  useEffect(() => { setPartVideo((v) => { if (v) URL.revokeObjectURL(v.url); return null; }); }, [viewing]);
  useEffect(() => { setViewParts([]); if (viewing && selected) api(`/lms/courses/${selected.id}/lessons/${viewing.id}/parts`).then(setViewParts).catch(() => {}); }, [viewing, selected]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const loadCourses = useCallback(async () => { setLoadingCourses(true); try { setCourses(await api('/lms/courses')); setError(''); } catch (e) { setError(e.message); } finally { setLoadingCourses(false); } }, []);
  const loadLessons = useCallback(async (course) => {
    setSelected(course);
    setLoadingLessons(true);
    try {
      const [lessonRows, announcementRows, enrolledStudents, moduleRows] = await Promise.all([api(`/lms/courses/${course.id}/lessons`), api(`/lms/courses/${course.id}/announcements`), api(`/lms/courses/${course.id}/enrollments`), api(`/lms/courses/${course.id}/modules`)]);
      setLessons(lessonRows); setAnnouncements(announcementRows); setRoster(enrolledStudents); setModules(moduleRows); setError('');
    } catch (e) { setError(e.message); } finally { setLoadingLessons(false); }
  }, []);
  useEffect(() => { api('/classes').then(setClasses).catch((e) => setError(e.message)); api('/subjects').then(setSubjects).catch(() => {}); api('/lms-tags').then((rows) => setTagMaster(rows.map((t) => t.name))).catch(() => {}); api('/class-subjects').then(setClassSubjects).catch(() => {}); loadCourses(); }, [loadCourses]);

  const saveCourse = async (e) => {
    e.preventDefault(); setError('');
    if (!tags.length) { setError('Add at least 1 tag to continue.'); return; }
    setBusy(true);
    try {
      const media = { tags, bannerImage: bannerImage || null, certificateEnabled };
      const body = editingCourse ? { title, description, ...media } : { classId, subjectId, title, description, ...media };
      const result = await api(editingCourse ? `/lms/courses/${editingCourse.id}` : '/lms/courses', { method: editingCourse ? 'PUT' : 'POST', body });
      const row = { id: editingCourse?.id ?? result.id, classId: Number(classId), subjectId: Number(subjectId), title, description, published: editingCourse?.published ?? false, lessonCount: editingCourse?.lessonCount ?? 0,
        className: classes.find((c) => c.id === Number(classId)) && `${classes.find((c) => c.id === Number(classId)).name}-${classes.find((c) => c.id === Number(classId)).section}`,
        subjectName: subjects.find((s) => s.id === Number(subjectId))?.name };
      setNotice(editingCourse ? 'Course changes saved.' : 'Course created and its class roster enrolled.'); setTitle(''); setDescription(''); setTags([]); setBannerImage(''); setCertificateEnabled(false); setEditingCourse(null); setCourseModal(false); await loadCourses(); await loadLessons(row);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const saveLesson = async (e) => {
    e.preventDefault(); if (!selected) return;
    setBusy(true); setError('');
    try {
      const path = `/lms/courses/${selected.id}/lessons${editingLesson ? `/${editingLesson.id}` : ''}`;
      const result = await api(path, { method: editingLesson ? 'PUT' : 'POST', body: { ...lessonForm, moduleId: lessonForm.moduleId || null } });
      const lessonId = editingLesson?.id ?? result.id;
      if (!editingLesson) setEditingLesson({ ...lessonForm, id: lessonId });
      if (lessonFile) await uploadFile(`/lms/courses/${selected.id}/lessons/${lessonId}/file?name=${encodeURIComponent(lessonFile.name)}`, lessonFile);
      setNotice(editingLesson ? 'Topic saved.' : 'Topic added. Upload its content below.'); if (!editingLesson) setPartsOf({ id: lessonId, title: lessonForm.title }); setModal(false); setEditingLesson(null); setLessonForm(EMPTY_LESSON); setLessonFile(null); await loadLessons(selected); await loadCourses();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const publish = async (course) => { try { await api(`/lms/courses/${course.id}`, { method: 'PUT', body: { published: !course.published } }); await loadCourses(); if (selected?.id === course.id) setSelected({ ...selected, published: !course.published }); } catch (e) { setError(e.message); } };
  const removeCourse = async (course) => { if (!window.confirm(`Delete the course “${course.title}” and its lessons?`)) return; try { await api(`/lms/courses/${course.id}`, { method: 'DELETE' }); if (selected?.id === course.id) { setSelected(null); setLessons([]); } await loadCourses(); } catch (e) { setError(e.message); } };
  const removeLesson = async (lesson) => { if (!window.confirm(`Delete lesson “${lesson.title}”?`)) return; try { await api(`/lms/courses/${selected.id}/lessons/${lesson.id}`, { method: 'DELETE' }); await loadLessons(selected); await loadCourses(); } catch (e) { setError(e.message); } };
  const saveModule = async (e) => { e.preventDefault(); setBusy(true); setError(''); try { await api(`/lms/courses/${selected.id}/modules${editingModule ? `/${editingModule.id}` : ''}`, { method: editingModule ? 'PUT' : 'POST', body: { ...moduleForm, sequence: Number(moduleForm.sequence) } }); setModuleForm({ title: '', description: '', sequence: modules.length + 1, published: true }); setNotice(editingModule ? 'Module updated.' : 'Module added.'); setEditingModule(null); setModuleModal(false); await loadLessons(selected); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const toggleModule = async (module) => { try { await api(`/lms/courses/${selected.id}/modules/${module.id}`, { method: 'PUT', body: { ...module, published: !module.published } }); await loadLessons(selected); } catch (e) { setError(e.message); } };
  const removeModule = async (module) => { if (!window.confirm(`Delete module “${module.title}”?`)) return; try { await api(`/lms/courses/${selected.id}/modules/${module.id}`, { method: 'DELETE' }); setNotice('Module deleted.'); await loadLessons(selected); } catch (e) { setError(e.message); } };
  const saveAnnouncement = async (e) => { e.preventDefault(); try { await api(`/lms/courses/${selected.id}/announcements`, { method: 'POST', body: announcementForm }); setAnnouncementForm({ title: '', body: '' }); setAnnounceModal(false); setAnnouncements(await api(`/lms/courses/${selected.id}/announcements`)); setNotice('Announcement posted.'); } catch (e) { setError(e.message); } };
  const removeAnnouncement = async (row) => { try { await api(`/lms/courses/${selected.id}/announcements/${row.id}`, { method: 'DELETE' }); setAnnouncements(await api(`/lms/courses/${selected.id}/announcements`)); } catch (e) { setError(e.message); } };
  const saveRoster = async (e) => { e.preventDefault(); setRosterSaving(true); setError(''); setNotice(''); try { const result = await api(`/lms/courses/${selected.id}/enrollments`, { method: 'PUT', body: { studentIds: roster.filter((student) => student.enrolled).map((student) => student.id) } }); setNotice(`${result.enrolled} students enrolled.`); setRosterOpen(false); await loadLessons(selected); await loadCourses(); } catch (e) { setError(e.message); } finally { setRosterSaving(false); } };
  const editLesson = (lesson) => { setEditingLesson(lesson); setLessonFile(null); setLessonForm({ moduleId: lesson.moduleId ?? '', title: lesson.title, sequence: lesson.sequence, content: lesson.content ?? '', videoUrl: lesson.videoUrl ?? '', resourceUrl: lesson.resourceUrl ?? '', published: lesson.published }); setModal(true); };
  const downloadLesson = async (lesson) => {
    try { const blob = await fetchBlob(`/lms/courses/${selected.id}/lessons/${lesson.id}/file`); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = lesson.attachmentName || 'lesson-document'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (err) { setError(err.message); }
  };
  const availableSubjects = subjects.filter((s) => classSubjects.some((x) => Number(x.classId) === Number(classId) && Number(x.subjectId) === s.id));

  return <div className="lms-ns lms-page">
    <div className="profile-head"><div><h1>Learning Management</h1><p className="hint">Build class courses from sequenced lessons, learning notes, video links and resources. Publish a course when it is ready for students.</p></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}
    <div className="profile-head" style={{ marginBottom: 12 }}><span className="hint">Create a course for a class and subject, then add its sections, topics and materials.</span><button type="button" onClick={() => { setEditingCourse(null); setTitle(''); setDescription(''); setTags([]); setBannerImage(''); setCertificateEnabled(false); setClassId(''); setSubjectId(''); setCourseModal(true); }}>+ Create course</button></div>
    <Modal className="lms-ns" open={courseModal} title={editingCourse ? 'Edit course' : 'Create a course'} onClose={() => setCourseModal(false)}>
      <form className="enquiry-form" onSubmit={saveCourse}><div className="enq-grid">
        {!editingCourse && <><label><span>Class *</span><select required value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(''); }}><option value="">Choose class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}</select></label>
        <label><span>Subject *</span><select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Choose subject</option>{availableSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></>}
        <label className="wide"><span>Course title *</span><input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fractions and decimals" /></label>
        <label className="wide"><span>Description</span><textarea maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="wide"><span className="lms-field-label">Course tags *</span><TagInput value={tags} onChange={setTags} options={tagMaster} /></div>
        <label className="check-row wide"><input type="checkbox" checked={certificateEnabled} onChange={(e) => setCertificateEnabled(e.target.checked)} /> Give students a completion certificate when they finish every lesson</label>
        <div className="wide"><span className="lms-field-label">Banner image</span><BannerPicker value={bannerImage} onChange={setBannerImage} onError={setError} /></div>
      </div><div className="form-actions"><button disabled={busy}>{busy ? 'Saving…' : editingCourse ? 'Save course' : 'Create course'}</button><button type="button" className="ghost" onClick={() => setCourseModal(false)}>Cancel</button></div></form>
    </Modal>
    <div className="card" style={{ marginTop: 18 }}><h2>Courses</h2>
      {loadingCourses && <p role="status">Loading courses…</p>}
      {!loadingCourses && !courses.length && <p className="hint">No courses yet. Create a course to start adding lessons.</p>}
      <p className="hint">Active students are enrolled automatically through their class. Teachers come from the class subject assignment.</p>
      <div className="table-scroll"><table className="enquiry-table"><thead><tr><th>Course</th><th>Class</th><th>Subject</th><th>Enrolled students</th><th>Lessons</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {!loadingCourses && courses.map((c) => <tr key={c.id} className={selected?.id === c.id ? 'selected' : ''}><td><button className="link-button" type="button" onClick={() => { setTab('content'); loadLessons(c); }}><b>{c.title}</b></button>{c.description && <small className="block">{c.description}</small>}<TagList tags={c.tags} />{c.certificateEnabled && <small className="block">Certificate on completion</small>}</td><td>{c.className}</td><td>{c.subjectName}</td><td>{c.studentCount}</td><td>{c.lessonCount}</td><td><span className={`badge ${c.published ? 'active' : 'partial'}`}>{c.published ? 'Published' : 'Draft'}</span></td><td className="row-actions"><button type="button" onClick={() => { setTab('content'); loadLessons(c); }}>Manage content</button><button type="button" className="ghost" onClick={() => publish(c)}>{c.published ? 'Unpublish' : 'Publish'}</button><button type="button" className="ghost" onClick={() => { setEditingCourse(c); setTitle(c.title); setDescription(c.description ?? ''); setTags(c.tags ?? []); setBannerImage(c.bannerImage ?? ''); setCertificateEnabled(Boolean(c.certificateEnabled)); setClassId(String(c.classId)); setSubjectId(String(c.subjectId)); setCourseModal(true); }}>Edit</button><button type="button" className="ghost" onClick={() => removeCourse(c)}>Delete</button></td></tr>)}
      </tbody></table></div>
    </div>
    <Modal className="lms-ns lms-workspace" open={Boolean(selected)} title={selected?.title ?? ''} onClose={() => setSelected(null)}>{selected && <>
    <div className="lms-workspace-head"><span>{selected.className} · {selected.subjectName}</span><span className={`badge ${selected.published ? 'active' : 'partial'}`}>{selected.published ? 'Published' : 'Draft'}</span><TagList tags={selected.tags} /></div>
    <div className="lms-tabs" role="tablist">{[['content', 'Content'], ['announcements', 'Announcements'], ['assessments', 'Assignments & quizzes']].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'content' && <div className="card" style={{ marginTop: 18 }}><div className="profile-head"><div><h2>Headings, topics & content</h2><p className="hint">{selected.className} · {selected.subjectName} · {roster.filter((student) => student.enrolled).length} enrolled</p></div><div className="row-actions"><button type="button" className="ghost" onClick={() => setRosterOpen(true)}>Manage enrollment</button><button type="button" onClick={() => { setEditingLesson(null); setLessonFile(null); setLessonForm({ ...EMPTY_LESSON, sequence: lessons.length + 1 }); setModal(true); }}>+ Add topic</button></div></div>
      {loadingLessons && <p role="status">Loading course content…</p>}
      <div className="row-actions" style={{ margin: '10px 0' }}><button type="button" onClick={() => { setEditingModule(null); setModuleForm({ title: '', description: '', sequence: modules.length + 1, published: true }); setModuleModal(true); }}>+ Add heading</button></div><Modal className="lms-ns" open={moduleModal} title={editingModule ? 'Edit heading' : 'Add heading'} onClose={() => { setModuleModal(false); setEditingModule(null); }}><form onSubmit={saveModule} className="enquiry-form"><div className="enq-grid"><label><span>Heading *</span><input required maxLength={160} value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} /></label><label><span>Order</span><input type="number" min="1" max="10000" value={moduleForm.sequence} onChange={(e) => setModuleForm({ ...moduleForm, sequence: e.target.value })} /></label><label className="wide"><span>Description</span><input maxLength={1000} value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} /></label><label className="check-row"><input type="checkbox" checked={moduleForm.published} onChange={(e) => setModuleForm({ ...moduleForm, published: e.target.checked })} /> Publish module</label></div><button disabled={busy}>{busy ? 'Saving…' : editingModule ? 'Save module' : 'Add module'}</button><button type="button" className="ghost" onClick={() => { setModuleModal(false); setEditingModule(null); }}>Cancel</button></form></Modal>
      {[...modules.map((m) => ({ module: m, items: lessons.filter((l) => l.moduleId === m.id) })), { module: null, items: lessons.filter((l) => !l.moduleId) }].filter((g) => g.module || g.items.length).map((g) => <section className="lms-tree-group" key={g.module?.id ?? 'none'}>
        <div className="lms-tree-head"><div><b>{g.module ? `Heading ${g.module.sequence}: ${g.module.title}` : 'Topics without a heading'}</b>{g.module?.description && <small className="block">{g.module.description}</small>}<small className="block">{g.module ? `${g.module.published ? 'Published' : 'Draft'} · ` : ''}{g.items.length} {g.items.length === 1 ? 'topic' : 'topics'}</small></div>
          <div className="row-actions"><button type="button" onClick={() => { setEditingLesson(null); setLessonFile(null); setLessonForm({ ...EMPTY_LESSON, moduleId: g.module ? g.module.id : '', sequence: g.items.length + 1 }); setModal(true); }}>+ Add topic</button>
            {g.module && <><button type="button" className="ghost" onClick={() => { setEditingModule(g.module); setModuleForm({ title: g.module.title, description: g.module.description ?? '', sequence: g.module.sequence, published: g.module.published }); setModuleModal(true); }}>Edit heading</button><button type="button" className="ghost" onClick={() => toggleModule(g.module)}>{g.module.published ? 'Unpublish' : 'Publish'}</button><button type="button" className="ghost" onClick={() => removeModule(g.module)}>Delete</button></>}</div></div>
        {g.items.map((l) => <div className="lms-tree-topic" key={l.id}><div><b>{l.sequence}. {l.title}</b><small className="block">{l.published ? 'Published' : 'Draft'}{[l.content && 'Notes', l.videoUrl && 'Video', l.resourceUrl && 'Link', l.hasAttachment && 'Document'].filter(Boolean).length ? ` · ${[l.content && 'Notes', l.videoUrl && 'Video', l.resourceUrl && 'Link', l.hasAttachment && 'Document'].filter(Boolean).join(' · ')}` : ''}{l.attachmentName ? ` · ${l.attachmentName}` : ''}</small></div>
          <div className="row-actions"><button type="button" onClick={() => setPartsOf(l)}>Upload content</button><button type="button" className="ghost" onClick={() => setViewing(l)}>View</button>{l.hasAttachment && <button type="button" className="ghost" onClick={() => downloadLesson(l)}>Download</button>}<button type="button" className="ghost" onClick={() => editLesson(l)}>Edit</button><button type="button" className="ghost" onClick={() => removeLesson(l)}>Delete</button></div></div>)}
        {!g.items.length && <p className="hint" style={{ margin: '8px 0 0' }}>No topics yet. Add a topic, then upload its content.</p>}
      </section>)}
      {!modules.length && !lessons.length && <p className="hint">Start with a heading (a chapter or unit), add topics under it, then use Upload content on each topic. Publish the course when it is ready.</p>}
    </div>}
    {tab === 'announcements' && <div className="card" style={{ marginTop: 18 }}><div className="profile-head"><h2 style={{ margin: 0 }}>Course announcements</h2><button type="button" onClick={() => setAnnounceModal(true)}>+ Post announcement</button></div><Modal className="lms-ns" open={announceModal} title="Post course announcement" onClose={() => setAnnounceModal(false)}><form className="enquiry-form" onSubmit={saveAnnouncement}><div className="enq-grid"><label className="wide"><span>Title *</span><input required maxLength={160} value={announcementForm.title} onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} /></label><label className="wide"><span>Message *</span><textarea required rows={3} maxLength={12000} value={announcementForm.body} onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })} /></label></div><div className="form-actions"><button type="submit">Post announcement</button><button type="button" className="ghost" onClick={() => setAnnounceModal(false)}>Cancel</button></div></form></Modal>{announcements.map((a) => <article key={a.id} className="card" style={{ marginTop: 10 }}><div className="profile-head"><b>{a.title}</b><button type="button" className="ghost" onClick={() => removeAnnouncement(a)}>Delete</button></div><p style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p><small>{a.createdByName} · {new Date(a.createdAt).toLocaleString()}</small></article>)}</div>}
    {tab === 'assessments' && <LmsAssessmentPanel key={selected.id} course={selected} />}
    </>}</Modal>
    <Modal className="lms-ns" open={modal} title={editingLesson ? 'Edit topic' : 'Add topic'} onClose={() => { setModal(false); setLessonFile(null); }} wide>
      <form className="enquiry-form" onSubmit={saveLesson}><div className="enq-grid">
        <label className="wide"><span>Heading</span><select value={lessonForm.moduleId ?? ''} onChange={(e) => setLessonForm({ ...lessonForm, moduleId: e.target.value })}><option value="">No heading</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.sequence}. {m.title}{m.published ? '' : ' (draft)'}</option>)}</select></label>
        <label><span>Order *</span><input type="number" min="1" required value={lessonForm.sequence} onChange={(e) => setLessonForm({ ...lessonForm, sequence: e.target.value })} /></label>
        <label><span>Title *</span><input required maxLength={160} value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} /></label>
        <label className="wide"><span>Lesson notes</span><textarea rows={7} maxLength={12000} value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} /></label>
        <label className="wide"><span>Video URL</span><input type="url" placeholder="https://" value={lessonForm.videoUrl} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} /></label>
        <label className="wide"><span>Resource URL</span><input type="url" placeholder="https://" value={lessonForm.resourceUrl} onChange={(e) => setLessonForm({ ...lessonForm, resourceUrl: e.target.value })} /></label>
        <label className="wide"><span>Digital document or video (PDF, Office, text, image, MP4, MOV, WebM; up to 25 MB){editingLesson?.attachmentName ? ` · current: ${editingLesson.attachmentName}` : ''}</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.jpg,.jpeg,.png,.webp,.mp4,.m4v,.mov,.webm" onChange={(e) => setLessonFile(e.target.files?.[0] ?? null)} /></label>
        <label className="check-row"><input type="checkbox" checked={lessonForm.published} onChange={(e) => setLessonForm({ ...lessonForm, published: e.target.checked })} /> Publish lesson</label>
      </div><div className="form-actions"><button disabled={busy}>{busy ? 'Saving…' : 'Save lesson'}</button><button type="button" className="ghost" onClick={() => setModal(false)}>Cancel</button></div></form>
    </Modal>
    <Modal className="lms-ns" open={Boolean(viewing)} title={viewing ? `${viewing.moduleTitle ? `${viewing.moduleTitle} · ` : ''}${viewing.title}` : ''} onClose={() => setViewing(null)} wide>
      {viewing && <div>
        <p className="hint">{viewing.published ? 'Published: students can see this lesson.' : 'Draft: students cannot see this lesson yet.'} Teacher preview; it does not count as student progress.</p>
        {viewing.content ? <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, maxWidth: '75ch' }}>{viewing.content}</div> : <p className="hint">This lesson has no notes.</p>}
        {viewParts.map((p) => <section key={p.id} style={{ marginTop: 14 }}><b>{p.sequence}. {p.title}</b> <small>· {p.kind}{p.published ? '' : ' · draft'}</small>{p.kind === 'text' && <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{p.content}</div>}{(p.kind === 'video' || p.kind === 'link') && <div><a target="_blank" rel="noopener noreferrer" href={p.url}>{p.url}</a></div>}{p.kind === 'file' && <div>{p.hasAttachment ? <><button type="button" className="ghost" onClick={() => downloadPart(p)}>Download {p.attachmentName}</button>{p.attachmentMime?.startsWith('video/') && <button type="button" onClick={() => playPart(p)}>Play video</button>}{partVideo?.id === p.id && <video controls playsInline src={partVideo.url} style={{ display: 'block', width: '100%', maxHeight: 420, marginTop: 10 }} />}</> : <span className="hint">No file uploaded yet</span>}</div>}</section>)}
        <div className="row-actions" style={{ marginTop: 14 }}>
          {viewing.videoUrl && <a className="ghost button" target="_blank" rel="noopener noreferrer" href={viewing.videoUrl}>Open video</a>}
          {viewing.resourceUrl && <a className="ghost button" target="_blank" rel="noopener noreferrer" href={viewing.resourceUrl}>Open resource link</a>}
          {viewing.hasAttachment && <button type="button" className="ghost" onClick={() => downloadLesson(viewing)}>Download {viewing.attachmentName}</button>}
        </div>
        {!viewing.content && !viewing.videoUrl && !viewing.resourceUrl && !viewing.hasAttachment && <p className="hint">Nothing has been added to this lesson yet.</p>}
      </div>}
    </Modal>
    <Modal className="lms-ns" open={Boolean(partsOf)} title={partsOf ? `Topic parts · ${partsOf.title}` : ''} onClose={() => setPartsOf(null)} wide>
      {partsOf && selected && <LmsParts key={partsOf.id} course={selected} lesson={partsOf} />}
    </Modal>
    <Modal className="lms-ns" open={rosterOpen} title={`Enroll students · ${selected?.title ?? ''}`} onClose={() => setRosterOpen(false)} wide>
      <form className="enquiry-form" onSubmit={saveRoster}><label className="search-field"><span aria-hidden="true">⌕</span><input value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} placeholder="Search student or admission no…" aria-label="Search enrollment roster" /></label><div style={{ maxHeight: '55vh', overflow: 'auto' }}>{roster.filter((student) => `${student.name} ${student.admissionNo}`.toLowerCase().includes(rosterSearch.toLowerCase())).map((student) => <label key={student.id} className="check-row"><input type="checkbox" checked={student.enrolled} onChange={(e) => setRoster(roster.map((row) => row.id === student.id ? { ...row, enrolled: e.target.checked } : row))} /><span>{student.name}<small className="block">{student.admissionNo}</small></span></label>)}{!roster.length && <p className="hint">No active students are available in this class.</p>}</div><div className="form-actions"><button disabled={rosterSaving}>{rosterSaving ? 'Saving…' : 'Save enrollment'}</button><button type="button" className="ghost" onClick={() => setRosterOpen(false)}>Cancel</button></div></form>
    </Modal>
  </div>;
}
