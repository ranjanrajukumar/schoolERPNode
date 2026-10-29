import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';

export default function LmsAnnouncements({ course }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ title: '', body: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const path = `/lms/courses/${course.id}/announcements`;
  const load = async () => setRows(await api(path));
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const post = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(path, { method: 'POST', body: form });
      setForm({ title: '', body: '' });
      setOpen(false);
      await load();
      setNotice(
        course.published
          ? 'Announcement posted and students notified.'
          : 'Announcement saved. Students see it once the course is published.',
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete announcement “${row.title}”?`)) return;
    try {
      await api(`${path}/${row.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div className="profile-head">
        <h2 style={{ margin: 0 }}>Announcements · {course.title}</h2>
        <button type="button" onClick={() => setOpen(true)}>
          + Post announcement
        </button>
      </div>
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
      <Modal className="lms-ns" open={open} title="Post course announcement" onClose={() => setOpen(false)}>
        <form className="enquiry-form" onSubmit={post}>
          <div className="enq-grid">
            <label className="wide">
              <span>Title *</span>
              <input
                required
                maxLength={160}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="wide">
              <span>Message *</span>
              <textarea
                required
                rows={4}
                maxLength={12000}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button disabled={busy}>{busy ? 'Posting…' : 'Post announcement'}</button>
            <button type="button" className="ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
      {rows.map((a) => (
        <article key={a.id} className="card" style={{ marginTop: 10 }}>
          <div className="profile-head">
            <b>{a.title}</b>
            <button type="button" className="ghost" onClick={() => remove(a)}>
              Delete
            </button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{a.body}</p>
          <small>
            {a.createdByName} · {new Date(a.createdAt).toLocaleString()}
          </small>
        </article>
      ))}
      {!rows.length && <p className="hint">No announcements yet.</p>}
    </section>
  );
}
