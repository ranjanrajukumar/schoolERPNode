import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fetchBlob, uploadFile } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PhotoField from './PhotoField.jsx';

const kb = (n) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

/** Photo and document uploads for one student. Only admins can change files; teachers can view them. */
export default function StudentFiles({ studentId }) {
  const canWrite = useAuth().user?.role === 'admin';
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const docInput = useRef(null);

  const load = useCallback(() => {
    api(`/student-files?studentId=${studentId}`)
      .then(setFiles)
      .catch((e) => setError(e.message));
  }, [studentId]);
  useEffect(load, [load]);

  const documents = files.filter((f) => f.kind === 'document');

  const upload = async (kind, input) => {
    const file = input.current?.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const q = new URLSearchParams({ studentId, kind, name: file.name });
      if (kind === 'document' && title.trim()) q.set('title', title.trim());
      await uploadFile(`/student-files?${q}`, file);
      if (kind === 'document') setTitle('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      input.current.value = '';
    }
  };

  const open = async (f) => {
    try {
      window.open(
        URL.createObjectURL(await fetchBlob(`/student-files/${f.id}/download`)),
        '_blank',
        'noopener',
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (f) => {
    try {
      await api(`/student-files/${f.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="card no-print">
      <h2>Photo &amp; documents</h2>
      {error && <p className="error">{error}</p>}
      <PhotoField entity="student" id={studentId} label="Student photo" canEdit={canWrite} />
      <h3>Documents</h3>
      {documents.map((f) => (
        <p key={f.id}>
          <a
            href="#open"
            onClick={(e) => {
              e.preventDefault();
              open(f);
            }}
          >
            {f.title}
          </a>{' '}
          <small>
            {kb(f.size)} · {f.uploadedByName ?? '—'} · {String(f.createdAt).slice(0, 10)}
          </small>
          {canWrite && (
            <>
              {' '}
              <button className="danger" onClick={() => remove(f)}>
                Delete
              </button>
            </>
          )}
        </p>
      ))}
      {!documents.length && <p className="hint">No documents uploaded.</p>}
      {canWrite && (
        <div className="form">
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Birth certificate"
            />
          </label>
          <label>
            File (PDF or image)
            <input
              ref={docInput}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={busy}
            />
          </label>
          <button type="button" disabled={busy} onClick={() => upload('document', docInput)}>
            Upload
          </button>
        </div>
      )}
    </section>
  );
}
