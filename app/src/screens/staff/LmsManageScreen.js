import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { api, openPrivateFile, uploadBinary } from '../../api';
import { useCan } from '../../rights';
import ActionModal from '../../components/ActionModal';
import { color, space } from '../../theme';
import { Banner, Button, Card, Chips, Empty, Loading, Muted, Screen, Title } from '../../ui';

const quizFields = [
  { key: 'questionsText', label: 'Questions as JSON (single_choice, multiple_choice, true_false, short_answer; set points for scoring)', required: true, multiline: true },
];
const parseQuestions = (text) => {
  try {
    const rows = JSON.parse(String(text ?? ''));
    if (Array.isArray(rows)) return rows.map((row, index) => ({ ...row, id: row.id || `q${index + 1}` }));
  } catch { /* support the legacy one-question-per-line format below */ }
  return String(text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, i) => {
  const [prompt, ...parts] = line.split('|').map((s) => s.trim());
  const correctIndex = Number(parts.pop()) - 1;
  return { id: `q${i + 1}`, type: 'single_choice', points: 1, prompt, choices: parts, correctIndex };
  });
};
const publishedField = { key: 'published', label: 'Publish now?', options: [{ value: 'false', label: 'Keep as draft' }, { value: 'true', label: 'Publish' }], default: 'false' };
const courseForm = { label: 'New course', path: '/lms/courses', fields: [
  { key: 'classId', label: 'Class', optionsPath: '/classes', required: true },
  { key: 'subjectId', label: 'Subject', optionsPath: '/subjects', required: true },
  { key: 'title', label: 'Course title', required: true }, { key: 'description', label: 'Description', multiline: true },
] };

export default function LmsManageScreen() {
  const can = useCan('lms');
  const [courses, setCourses] = useState(null); const [course, setCourse] = useState(null);
  const [tab, setTab] = useState('Lessons'); const [rows, setRows] = useState([]); const [gradebook, setGradebook] = useState(null);
  const [modules, setModules] = useState([]);
  const [active, setActive] = useState(null); const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const reloadCourses = useCallback(async () => { try { const list = await api('/lms/courses'); setCourses(list); setError(''); return list; } catch (e) { setError(e.message); setCourses([]); return []; } }, []);
  const reloadContent = useCallback(async () => {
    if (!course) return;
    setBusy(true); setError('');
    try {
      const moduleRows = await api(`/lms/courses/${course.id}/modules`); setModules(moduleRows);
      if (tab === 'Gradebook') setGradebook(await api(`/lms/courses/${course.id}/gradebook`));
      else if (tab === 'Enrollment') setRows(await api(`/lms/courses/${course.id}/enrollments`));
      else setRows(await api(`/lms/courses/${course.id}/${tab === 'Modules' ? 'modules' : tab.toLowerCase()}`));
    } catch (e) { setError(e.message); setRows([]); }
    finally { setBusy(false); }
  }, [course, tab]);
  useFocusEffect(useCallback(() => { reloadCourses(); }, [reloadCourses]));
  useFocusEffect(useCallback(() => { reloadContent(); }, [reloadContent]));

  const done = async () => {
    const kind = active?.kind;
    setActive(null); setNotice('Saved.');
    if (kind === 'course-create') { await reloadCourses(); return; }
    if (kind === 'course-update') { const list = await reloadCourses(); setCourse((c) => list.find((x) => x.id === c?.id) ?? c); return; }
    if (kind === 'delete-course') { setCourse(null); await reloadCourses(); return; }
    await reloadContent();
  };
  const courseAction = (kind, action, patch = null) => setActive({ kind, action, patch });
  const courseFields = (c) => [{ key: 'title', label: 'Course title', required: true, default: c.title }, { key: 'description', label: 'Description', multiline: true, default: c.description }, { ...publishedField, default: String(c.published) }];
  const lessonAction = (row = null) => setActive({ action: {
    label: row ? 'Edit lesson' : 'Add lesson', path: row ? `/lms/courses/${course.id}/lessons/${row.id}` : `/lms/courses/${course.id}/lessons`, method: row ? 'PUT' : 'POST',
    fields: [{ key: 'moduleId', label: 'Module', options: [{ value: '', label: 'Unsectioned' }, ...modules.map((m) => ({ value: String(m.id), label: m.title }))], default: row?.moduleId ?? '' }, { key: 'title', label: 'Lesson title', required: true, default: row?.title }, { key: 'sequence', label: 'Order', keyboard: 'number-pad', default: row?.sequence ?? rows.length + 1 }, { key: 'content', label: 'Lesson notes', multiline: true, default: row?.content }, { key: 'videoUrl', label: 'Video URL', default: row?.videoUrl }, { key: 'resourceUrl', label: 'Resource URL', default: row?.resourceUrl }, { ...publishedField, default: String(row?.published ?? false) }], body: (v) => ({ ...v, moduleId: v.moduleId || null, sequence: Number(v.sequence), published: v.published === 'true' })
  }, row });
  const assignmentAction = (row = null) => setActive({ action: {
    label: row ? 'Edit assignment' : 'New assignment', path: row ? `/lms/courses/${course.id}/assignments/${row.id}` : `/lms/courses/${course.id}/assignments`, method: row ? 'PUT' : 'POST',
    fields: [{ key: 'title', label: 'Title', required: true, default: row?.title }, { key: 'instructions', label: 'Instructions', multiline: true, default: row?.instructions }, { key: 'dueOn', label: 'Due date (YYYY-MM-DD)', default: row?.dueOn }, { key: 'maxScore', label: 'Maximum score', keyboard: 'number-pad', default: row?.maxScore ?? 100 }, { ...publishedField, default: String(row?.published ?? false) }], body: (v) => ({ ...v, maxScore: Number(v.maxScore), published: v.published === 'true' })
  }, row });
  const quizAction = (row = null) => setActive({ action: {
    label: row ? 'Edit quiz' : 'New quiz', path: row ? `/lms/courses/${course.id}/quizzes/${row.id}` : `/lms/courses/${course.id}/quizzes`, method: row ? 'PUT' : 'POST',
    fields: [{ key: 'title', label: 'Quiz title', required: true, default: row?.title }, { key: 'description', label: 'Description', default: row?.description }, { key: 'dueOn', label: 'Due date (YYYY-MM-DD)', default: row?.dueOn }, { key: 'maxAttempts', label: 'Attempts allowed', keyboard: 'number-pad', default: row?.maxAttempts ?? 3 }, ...quizFields.map((f) => ({ ...f, default: row?.questions ? JSON.stringify(row.questions, null, 2) : '' })), { ...publishedField, default: String(row?.published ?? false) }],
    body: (v) => ({ title: v.title, description: v.description, dueOn: v.dueOn || null, maxAttempts: Number(v.maxAttempts), questions: parseQuestions(v.questionsText), published: v.published === 'true' })
  }, row });
  const remove = async (path, label) => { try { await api(path, { method: 'DELETE' }); setNotice(`${label} deleted.`); await reloadContent(); } catch (e) { setError(e.message); } };
  const moduleAction = (row = null) => setActive({ action: { label: row ? 'Edit module' : 'Add module', path: row ? `/lms/courses/${course.id}/modules/${row.id}` : `/lms/courses/${course.id}/modules`, method: row ? 'PUT' : 'POST', fields: [{ key: 'title', label: 'Module title', required: true, default: row?.title }, { key: 'description', label: 'Description', default: row?.description }, { key: 'sequence', label: 'Order', keyboard: 'number-pad', default: row?.sequence ?? rows.length + 1 }, { ...publishedField, default: String(row?.published ?? false) }], body: (v) => ({ ...v, sequence: Number(v.sequence), published: v.published === 'true' }) }, row });
  const togglePublish = async (kind, row) => {
    try {
      const body = kind === 'assignments' ? { title: row.title, instructions: row.instructions, dueOn: row.dueOn, maxScore: row.maxScore, published: !row.published } : { title: row.title, description: row.description, dueOn: row.dueOn, maxAttempts: row.maxAttempts, questions: row.questions, published: !row.published };
      await api(`/lms/courses/${course.id}/${kind}/${row.id}`, { method: 'PUT', body }); await reloadContent();
    } catch (e) { setError(e.message); }
  };
  const toggleEnroll = async (row) => {
    try {
      const studentIds = rows.filter((r) => (r.id === row.id ? !r.enrolled : r.enrolled)).map((r) => r.id);
      const result = await api(`/lms/courses/${course.id}/enrollments`, { method: 'PUT', body: { studentIds } });
      setNotice(`${result.enrolled} students enrolled.`); await reloadContent(); await reloadCourses();
    } catch (e) { setError(e.message); }
  };
  const tabs = ['Modules', 'Lessons', 'Enrollment', 'Assignments', 'Quizzes', 'Announcements', 'Gradebook'];

  return <Screen back onRefresh={course ? reloadContent : reloadCourses} refreshing={busy}>
    <Title sub="Courses, lesson documents, assignments, quizzes and student progress">Learning management</Title>
    <Banner text={notice} kind="ok" /><Banner text={error} />
    {!course ? <>
      {can('create') && <Button title="Create course" onPress={() => courseAction('course-create', { ...courseForm, body: (v) => ({ ...v, classId: Number(v.classId), subjectId: Number(v.subjectId) }) })} style={{ marginBottom: space.md }} />}
      {courses === null ? <Loading /> : courses.length ? courses.map((c) => <Pressable key={c.id} onPress={() => { setCourse(c); setTab('Lessons'); }}><Card><Text style={{ color: color.ink, fontWeight: '800', fontSize: 16 }}>{c.title}</Text><Muted>{c.className} · {c.subjectName} · {c.studentCount} enrolled · {c.lessonCount} lessons · {c.published ? 'Published' : 'Draft'}</Muted></Card></Pressable>) : <Empty>No LMS courses yet.</Empty>}
    </> : <>
      <Button title="← All courses" kind="ghost" onPress={() => setCourse(null)} style={{ marginBottom: space.md }} />
      <Card><Text style={{ color: color.ink, fontWeight: '800', fontSize: 18 }}>{course.title}</Text><Muted>{course.className} · {course.subjectName}</Muted></Card>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: space.sm }}>
        {can('edit') && <Button title="Edit / publish" kind="ghost" style={{ flex: 1 }} onPress={() => courseAction('course-update', { label: 'Edit course', path: `/lms/courses/${course.id}`, method: 'PUT', fields: courseFields(course), body: (v) => ({ ...v, published: v.published === 'true' }) }, { published: true })} />}
        {can('delete') && <Button title="Delete course" kind="danger" style={{ flex: 1 }} onPress={() => courseAction('delete-course', { label: 'Delete course', path: `/lms/courses/${course.id}`, method: 'DELETE', confirm: 'Delete this course and its lessons, assessments and progress?', fields: [] })} />}
      </View>
      <Chips options={tabs.map((t) => ({ value: t, label: t }))} value={tab} onChange={setTab} />
      {tab !== 'Gradebook' && tab !== 'Enrollment' && can('create') && <Button title={`Add ${tab === 'Lessons' ? 'lesson' : tab === 'Assignments' ? 'assignment' : tab === 'Quizzes' ? 'quiz' : tab === 'Modules' ? 'module' : 'announcement'}`} onPress={() => tab === 'Modules' ? moduleAction() : tab === 'Lessons' ? lessonAction() : tab === 'Assignments' ? assignmentAction() : tab === 'Quizzes' ? quizAction() : courseAction('announcement-create', { label: 'Post course announcement', path: `/lms/courses/${course.id}/announcements`, method: 'POST', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'body', label: 'Message', required: true, multiline: true }], body: (v) => v })} style={{ marginBottom: space.md }} />}
      {busy ? <Loading /> : tab === 'Gradebook' ? <Gradebook data={gradebook} /> : rows.length ? rows.map((row) => <Card key={row.id ?? row.studentId}>
        {tab === 'Enrollment' ? <><Text style={titleStyle}>{row.name}</Text><Muted>{row.admissionNo} · {row.enrolled ? 'Enrolled' : 'Not enrolled'}</Muted><View style={buttonRow}><SmallButton title={row.enrolled ? 'Unenroll' : 'Enroll'} onPress={() => toggleEnroll(row)} /></View></> : null}
        {tab === 'Modules' ? <><Text style={titleStyle}>{row.sequence}. {row.title}</Text><Muted>{row.description} · {row.published ? 'Published' : 'Draft'}</Muted><View style={buttonRow}><SmallButton title="Edit" onPress={() => moduleAction(row)} /><SmallButton title={row.published ? 'Unpublish' : 'Publish'} onPress={async () => { await api(`/lms/courses/${course.id}/modules/${row.id}`, { method: 'PUT', body: { ...row, published: !row.published } }); await reloadContent(); }} /><SmallButton title="Delete" onPress={() => remove(`/lms/courses/${course.id}/modules/${row.id}`, 'Module')} /></View></> : null}
        {tab === 'Lessons' ? <><Text style={titleStyle}>{row.sequence}. {row.title}</Text><Muted>{row.moduleTitle ? `${row.moduleTitle} · ` : ''}{row.published ? 'Published' : 'Draft'}{row.attachmentName ? ` · ${row.attachmentName}` : ''}</Muted><Text style={copyStyle}>{row.content}</Text><LessonUpload course={course} row={row} onDone={reloadContent} /><View style={buttonRow}>{row.hasAttachment && <SmallButton title="Download document" onPress={() => openPrivateFile(`/lms/courses/${course.id}/lessons/${row.id}/file`, row.attachmentName).catch((e) => setError(e.message))} />}<SmallButton title="Topic parts" onPress={() => setActive({ partsOf: row })} /><SmallButton title="Edit" onPress={() => lessonAction(row)} /><SmallButton title="Delete" onPress={() => remove(`/lms/courses/${course.id}/lessons/${row.id}`, 'Lesson')} /></View></> : null}
        {tab === 'Assignments' ? <><Text style={titleStyle}>{row.title}</Text><Muted>{row.submissions} submissions · {row.graded} graded · {row.published ? 'Published' : 'Draft'}</Muted><View style={buttonRow}><SmallButton title="Edit" onPress={() => assignmentAction(row)} /><SmallButton title="Submissions / grade" onPress={() => setActive({ assignment: row })} /><SmallButton title={row.published ? 'Unpublish' : 'Publish'} onPress={() => togglePublish('assignments', row)} /><SmallButton title="Delete" onPress={() => remove(`/lms/courses/${course.id}/assignments/${row.id}`, 'Assignment')} /></View></> : null}
        {tab === 'Quizzes' ? <><Text style={titleStyle}>{row.title}</Text><Muted>{row.questions.length} questions · {row.attemptCount} attempts{row.dueOn ? ` · due ${row.dueOn}` : ''} · {row.published ? 'Published' : 'Draft'}</Muted><View style={buttonRow}><SmallButton title="Review attempts" onPress={() => setActive({ quiz: row })} />{row.attemptCount === 0 && <SmallButton title="Edit" onPress={() => quizAction(row)} />}<SmallButton title={row.published ? 'Unpublish' : 'Publish'} onPress={() => togglePublish('quizzes', row)} /><SmallButton title="Delete" onPress={() => remove(`/lms/courses/${course.id}/quizzes/${row.id}`, 'Quiz')} /></View></> : null}
        {tab === 'Announcements' ? <><Text style={titleStyle}>{row.title}</Text><Text style={copyStyle}>{row.body}</Text><Muted>{row.createdByName} · {new Date(row.createdAt).toLocaleString()}</Muted><View style={buttonRow}><SmallButton title="Delete" onPress={() => remove(`/lms/courses/${course.id}/announcements/${row.id}`, 'Announcement')} /></View></> : null}
      </Card>) : <Empty>No {tab.toLowerCase()} yet.</Empty>}
    </>}
    <ActionModal visible={Boolean(active?.action)} action={active?.action} row={active?.row ?? null} onClose={() => setActive(null)} onDone={done} />
    <SubmissionModal course={course} assignment={active?.assignment} onClose={() => setActive((a) => ({ ...a, assignment: null }))} onChanged={reloadContent} />
    <PartsModal course={course} lesson={active?.partsOf} onClose={() => setActive((a) => ({ ...a, partsOf: null }))} onChanged={reloadContent} />
    <AttemptsModal course={course} quiz={active?.quiz} onClose={() => setActive((a) => ({ ...a, quiz: null }))} onChanged={reloadContent} />
  </Screen>;
}

const titleStyle = { color: color.ink, fontWeight: '800', fontSize: 16 };
const copyStyle = { color: color.ink, marginTop: 8 };
const buttonRow = { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 };
// the per-row buttons follow the rights on the website's Role Rights page: Delete needs the Delete right; Edit, publish and enrol need the Edit right
function SmallButton({ title, onPress }) {
  const can = useCan('lms');
  const needs = title === 'Delete' ? 'delete' : /^(Edit|Publish|Unpublish|Enroll|Unenroll)$/.test(title) ? 'edit' : null;
  return can(needs) ? <Button title={title} kind="ghost" onPress={onPress} style={{ flexGrow: 1, minWidth: 90 }} /> : null;
}

function LessonUpload({ course, row, onDone, path = null, label = 'Lesson resource' }) {
  const [uploading, setUploading] = useState(false); const [error, setError] = useState('');
  const pick = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size > 25 * 1024 * 1024) throw new Error('Lesson files must be 25 MB or smaller.');
      setUploading(true);
      const bytes = Platform.OS === 'web' ? (asset.file ? await asset.file.arrayBuffer() : await (await fetch(asset.uri)).arrayBuffer()) : await new File(asset.uri).arrayBuffer();
      if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('Lesson files must be 25 MB or smaller.');
      await uploadBinary(`${path ?? `/lms/courses/${course.id}/lessons/${row.id}/file`}?name=${encodeURIComponent(asset.name)}`, bytes, asset.mimeType || 'application/octet-stream');
      await onDone();
    } catch (e) { setError(e.message || 'Could not upload this file.'); }
    finally { setUploading(false); }
  };
  return <View style={{ marginTop: 10 }}><Muted>{label} · PDF, Office, text, images or video · max 25 MB</Muted><Button title={row.attachmentName ? 'Replace resource' : 'Upload resource'} kind="ghost" busy={uploading} onPress={pick} style={{ marginTop: 8 }} /><Banner text={error} /></View>;
}

function SubmissionModal({ course, assignment, onClose, onChanged }) {
  const [data, setData] = useState(null); const [err, setErr] = useState(''); const [target, setTarget] = useState(null);
  useFocusEffect(useCallback(() => { if (!assignment) return; api(`/lms/courses/${course.id}/assignments/${assignment.id}/submissions`).then(setData).catch((e) => setErr(e.message)); }, [assignment, course]));
  const grade = target ? { label: `Grade ${target.name}`, path: `/lms/courses/${course.id}/assignments/${assignment.id}/submissions/${target.studentId}`, method: 'PUT', fields: [{ key: 'score', label: `Score (out of ${assignment.maxScore})`, required: true, keyboard: 'number-pad', default: target.score }, { key: 'feedback', label: 'Feedback', multiline: true, default: target.feedback }] } : null;
  if (!assignment) return null;
  return <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: color.bg, padding: space.lg }}><Screen back><Title sub={assignment.title}>Submissions</Title><Banner text={err} />{data?.rows?.map((r) => <Card key={r.studentId}><Text style={titleStyle}>{r.name}</Text><Muted>{r.admissionNo} · {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : 'Not submitted'}{r.score !== null ? ` · ${r.score}/${assignment.maxScore}` : ''}</Muted>{r.response ? <Text style={copyStyle}>{r.response}</Text> : null}{r.attachmentName ? <><Muted>File: {r.attachmentName}</Muted><SmallButton title="Download submission" onPress={() => openPrivateFile(`/lms/courses/${course.id}/assignments/${assignment.id}/submissions/${r.studentId}/file`, r.attachmentName).catch((e) => setErr(e.message))} /></> : null}{r.resourceUrl ? <SmallButton title="Open link" onPress={() => Linking.openURL(r.resourceUrl)} /> : null}{r.submittedAt && <SmallButton title="Grade / feedback" onPress={() => setTarget(r)} />}</Card>)}</Screen><ActionModal visible={Boolean(target)} action={grade} row={target} onClose={() => setTarget(null)} onDone={async () => { setTarget(null); setData(await api(`/lms/courses/${course.id}/assignments/${assignment.id}/submissions`)); onChanged(); }} /><Button title="Close submissions" kind="ghost" onPress={onClose} /></View>;
}

const partKinds = [{ value: 'text', label: 'Text' }, { value: 'video', label: 'Video link' }, { value: 'link', label: 'Web link' }, { value: 'file', label: 'File (upload after saving)' }];
function PartsModal({ course, lesson, onClose, onChanged }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [form, setForm] = useState(null);
  const base = lesson ? `/lms/courses/${course.id}/lessons/${lesson.id}/parts` : null;
  const load = useCallback(() => { if (!base) return; api(base).then(setRows).catch((e) => setErr(e.message)); }, [base]);
  useFocusEffect(useCallback(() => { setRows(null); load(); }, [load]));
  if (!lesson) return null;
  const edit = form?.row ?? null;
  const action = form ? { label: edit ? 'Edit part' : 'Add part', path: edit ? `${base}/${edit.id}` : base, method: edit ? 'PUT' : 'POST', fields: [
    ...(edit ? [] : [{ key: 'kind', label: 'Part type', options: partKinds, default: 'text' }]),
    { key: 'title', label: 'Part title', required: true, default: edit?.title },
    { key: 'sequence', label: 'Order', keyboard: 'number-pad', default: edit?.sequence ?? (rows?.length ?? 0) + 1 },
    { key: 'content', label: 'Text (or a short note for a file)', multiline: true, default: edit?.content },
    { key: 'url', label: 'Video or web link (for link parts)', default: edit?.url },
    { ...publishedField, default: String(edit?.published ?? true) },
  ], body: (v) => ({ ...v, sequence: Number(v.sequence), published: v.published === 'true' }) } : null;
  const toggle = async (p) => { try { await api(`${base}/${p.id}`, { method: 'PUT', body: { title: p.title, sequence: p.sequence, content: p.content, url: p.url, published: !p.published } }); load(); } catch (e) { setErr(e.message); } };
  const drop = async (p) => { try { await api(`${base}/${p.id}`, { method: 'DELETE' }); load(); onChanged(); } catch (e) { setErr(e.message); } };
  return <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: color.bg, padding: space.lg }}><Screen back><Title sub={lesson.title}>Topic parts</Title><Muted>Add the topic one part at a time. Students read the parts in this order.</Muted><Banner text={err} />
    <Button title="Add part" onPress={() => setForm({ row: null })} style={{ marginVertical: space.md }} />
    {rows === null ? <Loading /> : rows.length ? rows.map((p) => <Card key={p.id}><Text style={titleStyle}>{p.sequence}. {p.title}</Text><Muted>{p.kind === 'video' ? 'Video link' : p.kind === 'link' ? 'Web link' : p.kind === 'file' ? 'File' : 'Text'} · {p.published ? 'Published' : 'Draft'}{p.kind === 'file' ? ` · ${p.hasAttachment ? p.attachmentName : 'no file yet'}` : ''}</Muted>{p.content ? <Text style={copyStyle}>{p.content}</Text> : null}{p.url ? <Muted>{p.url}</Muted> : null}
      {p.kind === 'file' && <LessonUpload course={course} row={p} path={`${base}/${p.id}/file`} label="Part file" onDone={async () => { load(); onChanged(); }} />}
      <View style={buttonRow}>{p.hasAttachment && <SmallButton title="Download" onPress={() => openPrivateFile(`${base}/${p.id}/file`, p.attachmentName).catch((e) => setErr(e.message))} />}<SmallButton title="Edit" onPress={() => setForm({ row: p })} /><SmallButton title={p.published ? 'Unpublish' : 'Publish'} onPress={() => toggle(p)} /><SmallButton title="Delete" onPress={() => drop(p)} /></View></Card>) : <Empty>No parts yet.</Empty>}
  </Screen><ActionModal visible={Boolean(form)} action={action} row={edit} onClose={() => setForm(null)} onDone={() => { setForm(null); load(); onChanged(); }} /><Button title="Close parts" kind="ghost" onPress={onClose} /></View>;
}

function AttemptsModal({ course, quiz, onClose, onChanged }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [target, setTarget] = useState(null);
  const path = quiz ? `/lms/courses/${course.id}/quizzes/${quiz.id}/attempts` : null;
  useFocusEffect(useCallback(() => { if (!path) return; setRows(null); api(path).then(setRows).catch((e) => setErr(e.message)); }, [path]));
  const written = target ? target.questions.filter((q) => q.type === 'short_answer') : [];
  const review = target ? { label: `Review ${target.studentName}`, path: `${path}/${target.id}/review`, method: 'PUT',
    fields: [...written.map((q) => ({ key: `s_${q.id}`, label: `${q.prompt} — answer: ${q.answer} (score 0–${q.points})`, keyboard: 'decimal-pad', default: q.awarded })), { key: 'feedback', label: 'Feedback', multiline: true, default: target.feedback }],
    body: (v) => ({ feedback: v.feedback, questionScores: Object.fromEntries(written.map((q) => [q.id, Number(v[`s_${q.id}`] || 0)])) }) } : null;
  if (!quiz) return null;
  return <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: color.bg, padding: space.lg }}><Screen back><Title sub={quiz.title}>Quiz attempts</Title><Banner text={err} />{rows === null ? <Loading /> : rows.length ? rows.map((a) => <Card key={a.id}><Text style={titleStyle}>{a.studentName}</Text><Muted>{a.admissionNo} · {new Date(a.completedAt).toLocaleDateString()} · {a.score}/{a.maxScore} · {a.reviewStatus === 'pending_review' ? 'Needs review' : 'Reviewed'}</Muted>{a.feedback ? <Text style={copyStyle}>{a.feedback}</Text> : null}{a.questions.some((q) => q.type === 'short_answer') && <SmallButton title="Score written answers" onPress={() => setTarget(a)} />}</Card>) : <Empty>No student attempts yet.</Empty>}</Screen><ActionModal visible={Boolean(target)} action={review} row={target} onClose={() => setTarget(null)} onDone={async () => { setTarget(null); setRows(await api(path)); onChanged(); }} /><Button title="Close attempts" kind="ghost" onPress={onClose} /></View>;
}

function Gradebook({ data }) {
  if (!data) return <Empty>Gradebook loading.</Empty>;
  return <>{data.rows.map((r) => <Card key={r.studentId}><Text style={titleStyle}>{r.name}</Text><Muted>{r.admissionNo} · {r.courseStatus} · Read {r.lessonsViewed}/{r.lessonsTotal} lessons ({r.lessonViews} total reads) · Completed {r.lessonsCompleted}/{r.lessonsTotal}</Muted>{data.assignments.map((a, i) => <Muted key={a.id}>{a.title}: {r.assignments[i]?.score ?? (r.assignments[i]?.submitted ? 'Submitted' : '—')}/{a.maxScore}</Muted>)}{data.quizzes.map((q, i) => <Muted key={q.id}>{q.title}: {r.quizzes[i]?.bestScore ?? '—'}/{q.maxScore} ({r.quizzes[i]?.attempts ?? 0} attempts)</Muted>)}</Card>)}</>;
}
