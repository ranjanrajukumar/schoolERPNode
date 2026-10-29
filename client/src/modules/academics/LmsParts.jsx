import { useCallback, useEffect, useState } from 'react';
import { api, fetchBlob, uploadFile } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';

const KINDS = {
  text: 'Text',
  video: 'Video link',
  link: 'Web link',
  file: 'File (PDF, Office, image, video)',
};
const blank = (n) => ({ kind: 'text', title: '', sequence: n, content: '', url: '', published: true });

// Parts of one topic (lesson), uploaded one at a time. Students read them in this order.
export default function LmsParts({ course, lesson, onChanged }) {
  const base = `/lms/courses/${course.id}/lessons/${lesson.id}/parts`;
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState(blank(1));
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const load = useCallback(async () => {
    try {
      const rows = await api(base);
      setParts(rows);
      setForm((f) => (editing ? f : blank(rows.length + 1)));
    } catch (e) {
      setError(e.message);
    }
  }, [base, editing]);
  useEffect(() => {
    load();
  }, [lesson.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = (rows = parts) => {
    setFormOpen(false);
    setEditing(null);
    setFile(null);
    setForm(blank(rows.length + 1));
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = { ...form, sequence: Number(form.sequence) };
      const id = editing ? editing.id : (await api(base, { method: 'POST', body })).id;
      if (editing) await api(`${base}/${id}`, { method: 'PUT', body });
      if (form.kind === 'file' && file)
        await uploadFile(`${base}/${id}/file?name=${encodeURIComponent(file.name)}`, file);
      else if (form.kind === 'file' && !editing)
        setNotice('Part saved. Choose Edit on it to upload its file.');
      if (!(form.kind === 'file' && !file && !editing)) setNotice(editing ? 'Part saved.' : 'Part added.');
      const rows = await api(base);
      setParts(rows);
      reset(rows);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const edit = (p) => {
    setFormOpen(true);
    setEditing(p);
    setFile(null);
    setForm({
      kind: p.kind,
      title: p.title,
      sequence: p.sequence,
      content: p.content ?? '',
      url: p.url ?? '',
      published: p.published,
    });
  };
  const remove = async (p) => {
    if (!window.confirm(`Delete part “${p.title}”?`)) return;
    try {
      await api(`${base}/${p.id}`, { method: 'DELETE' });
      const rows = await api(base);
      setParts(rows);
      reset(rows);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };
  const toggle = async (p) => {
    try {
      await api(`${base}/${p.id}`, {
        method: 'PUT',
        body: {
          title: p.title,
          sequence: p.sequence,
          content: p.content,
          url: p.url,
          published: !p.published,
        },
      });
      setParts(await api(base));
    } catch (err) {
      setError(err.message);
    }
  };
  const download = async (p) => {
    try {
      const blob = await fetchBlob(`${base}/${p.id}/file`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = p.attachmentName || 'lesson-file';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    }
  };
  const set = (changes) => setForm({ ...form, ...changes });

  return (
    <div>
      <p className="hint">
        Add the topic one part at a time: some text, then a video, a file, a link. Students read the parts in
        the order shown here.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <ol style={{ paddingLeft: 20 }}>
        {parts.map((p) => (
          <li key={p.id} style={{ margin: '8px 0' }}>
            <b>{p.title}</b>{' '}
            <small>
              · {KINDS[p.kind].split(' (')[0]} · {p.published ? 'Published' : 'Draft'}
              {p.kind === 'file' ? ` · ${p.hasAttachment ? p.attachmentName : 'no file uploaded yet'}` : ''}
            </small>
            <div className="row-actions">
              <button type="button" className="ghost" onClick={() => edit(p)}>
                Edit
              </button>
              <button type="button" className="ghost" onClick={() => toggle(p)}>
                {p.published ? 'Unpublish' : 'Publish'}
              </button>
              {p.hasAttachment && (
                <button type="button" className="ghost" onClick={() => download(p)}>
                  Download
                </button>
              )}
              <button type="button" className="ghost" onClick={() => remove(p)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!parts.length && <p className="hint">No parts yet. Choose Add a part to upload the first one.</p>}
      <div className="row-actions">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFile(null);
            setForm(blank(parts.length + 1));
            setFormOpen(true);
          }}
        >
          + Add a part
        </button>
      </div>
      <Modal
        className="lms-ns"
        open={formOpen}
        title={editing ? 'Edit part' : 'Add a part'}
        onClose={() => reset()}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <form className="enquiry-form" onSubmit={save}>
          <div className="enq-grid">
            <label>
              <span>Type *</span>
              <select
                value={form.kind}
                disabled={Boolean(editing)}
                onChange={(e) => set({ kind: e.target.value })}
              >
                {Object.entries(KINDS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Order *</span>
              <input
                type="number"
                min="1"
                required
                value={form.sequence}
                onChange={(e) => set({ sequence: e.target.value })}
              />
            </label>
            <label className="wide">
              <span>Part title *</span>
              <input
                required
                maxLength={160}
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Watch: how plants make food"
              />
            </label>
            {form.kind === 'text' && (
              <label className="wide">
                <span>Text *</span>
                <textarea
                  required
                  rows={6}
                  maxLength={12000}
                  value={form.content}
                  onChange={(e) => set({ content: e.target.value })}
                />
              </label>
            )}
            {(form.kind === 'video' || form.kind === 'link') && (
              <label className="wide">
                <span>{form.kind === 'video' ? 'Video link' : 'Web link'} *</span>
                <input
                  required
                  type="url"
                  placeholder="https://"
                  value={form.url}
                  onChange={(e) => set({ url: e.target.value })}
                />
              </label>
            )}
            {form.kind === 'file' && (
              <>
                <label className="wide">
                  <span>Short note (optional)</span>
                  <input
                    maxLength={500}
                    value={form.content}
                    onChange={(e) => set({ content: e.target.value })}
                  />
                </label>
                <label className="wide">
                  <span>
                    File (PDF, Office, text, image, MP4, MOV, WebM; up to 25 MB)
                    {editing?.attachmentName ? ` · current: ${editing.attachmentName}` : ''}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.jpg,.jpeg,.png,.webp,.mp4,.m4v,.mov,.webm"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </>
            )}
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => set({ published: e.target.checked })}
              />{' '}
              Publish part
            </label>
          </div>
          <div className="form-actions">
            <button disabled={busy}>{busy ? 'Saving…' : editing ? 'Save part' : 'Add part'}</button>
            <button type="button" className="ghost" onClick={() => reset()}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
