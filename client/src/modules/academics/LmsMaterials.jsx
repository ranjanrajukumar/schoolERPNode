import { useEffect, useState } from 'react';
import { api, fetchBlob, uploadFile } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';

const KINDS = { file: 'Document or file', link: 'Web link', video: 'Video link' };
const blank = { kind: 'file', title: '', description: '', url: '', published: true };
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.jpg,.jpeg,.png,.webp,.mp4,.m4v,.mov,.webm';

// Content Library for one course: add documents, files and links for learning, without building a lesson first.
export default function LmsMaterials({ course }) {
  const base = `/lms/courses/${course.id}/materials`;
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const load = async () => setRows(await api(base));
  useEffect(() => { load().catch((e) => setError(e.message)); }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setForm(blank); setEditing(null); setFile(null); setOpen(false); };
  const save = async (e) => {
    e.preventDefault(); setError(''); setNotice('');
    if (form.kind === 'file' && !file && !editing?.hasAttachment) { setError('Choose the document or file to upload.'); return; }
    setBusy(true);
    try {
      const body = { ...form };
      const id = editing ? editing.id : (await api(base, { method: 'POST', body })).id;
      if (editing) await api(`${base}/${id}`, { method: 'PUT', body });
      if (form.kind === 'file' && file) await uploadFile(`${base}/${id}/file?name=${encodeURIComponent(file.name)}`, file);
      setNotice(editing ? 'Material saved.' : 'Material added.'); reset(); await load();
    } catch (err) { setError(err.message); await load().catch(() => {}); } finally { setBusy(false); }
  };
  const edit = (m) => { setEditing(m); setFile(null); setForm({ kind: m.kind, title: m.title, description: m.description ?? '', url: m.url ?? '', published: m.published }); setOpen(true); };
  const toggle = async (m) => { try { await api(`${base}/${m.id}`, { method: 'PUT', body: { title: m.title, description: m.description, url: m.url, published: !m.published } }); await load(); } catch (err) { setError(err.message); } };
  const remove = async (m) => { if (!window.confirm(`Delete “${m.title}”?`)) return; try { await api(`${base}/${m.id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); } };
  const download = async (m) => { try { const url = URL.createObjectURL(await fetchBlob(`${base}/${m.id}/file`)); const a = document.createElement('a'); a.href = url; a.download = m.attachmentName || 'material'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (err) { setError(err.message); } };
  const set = (changes) => setForm({ ...form, ...changes });
  const size = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

  return <section style={{ marginTop: 18 }}>
    {notice && <p className="success" role="status">{notice}</p>}
    <Modal className="lms-ns" open={open} title={editing ? 'Edit material' : `Add learning material · ${course.title}`} onClose={reset}><form className="form" onSubmit={save}>
      <p className="hint">Upload a document or file, or add a web or video link. Students see published materials in their course and in Recent materials.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="enq-grid">
        <label><span>Type *</span><select value={form.kind} disabled={Boolean(editing)} onChange={(e) => set({ kind: e.target.value })}>{Object.entries(KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
        <label><span>Title *</span><input required maxLength={160} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Chapter 3 notes" /></label>
        <label className="wide"><span>Description</span><input maxLength={1000} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="What is this for?" /></label>
        {form.kind === 'file'
          ? <label className="wide"><span>File (PDF, Word, Excel, PowerPoint, text, image, MP4/MOV/WebM video; up to 25 MB){editing?.attachmentName ? ` · current: ${editing.attachmentName}` : ''}</span><input type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          : <label className="wide"><span>{form.kind === 'video' ? 'Video link' : 'Web link'} *</span><input required type="url" placeholder="https://" value={form.url} onChange={(e) => set({ url: e.target.value })} /></label>}
        <label className="check-row"><input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} /> Publish to students</label>
      </div>
      <div className="form-actions"><button disabled={busy}>{busy ? 'Saving…' : editing ? 'Save material' : 'Add material'}</button><button type="button" className="ghost" onClick={reset}>Cancel</button></div>
    </form></Modal>

    <div className="card" style={{ marginTop: 18 }}><div className="profile-head"><h2 style={{ margin: 0 }}>Content library · {course.title}</h2><button type="button" onClick={() => { setEditing(null); setForm(blank); setFile(null); setError(''); setNotice(''); setOpen(true); }}>+ Add material</button></div>
      {error && !open && <p className="error" role="alert">{error}</p>}
      {rows === null && <p role="status">Loading materials…</p>}
      <div className="table-scroll"><table className="enquiry-table"><thead><tr><th>Material</th><th>Type</th><th>Status</th><th /></tr></thead><tbody>
        {rows?.map((m) => <tr key={m.id}><td><b>{m.title}</b>{m.description && <small className="block">{m.description}</small>}<small className="block">{m.kind === 'file' ? (m.hasAttachment ? `${m.attachmentName} · ${size(m.attachmentSize)}` : 'No file uploaded yet') : m.url}</small></td><td>{KINDS[m.kind]}</td><td><span className={`badge ${m.published ? 'active' : 'partial'}`}>{m.published ? 'Published' : 'Draft'}</span></td>
          <td className="row-actions">{m.kind === 'file' ? m.hasAttachment && <button type="button" className="ghost" onClick={() => download(m)}>Download</button> : <a className="btn" href={m.url} target="_blank" rel="noopener noreferrer">Open</a>}<button type="button" className="ghost" onClick={() => edit(m)}>Edit</button><button type="button" className="ghost" onClick={() => toggle(m)}>{m.published ? 'Unpublish' : 'Publish'}</button><button type="button" className="ghost" onClick={() => remove(m)}>Delete</button></td></tr>)}
        {rows && !rows.length && <tr><td colSpan={4} className="empty-row">No materials yet. Add the first document or link above.</td></tr>}
      </tbody></table></div>
    </div>
  </section>;
}
