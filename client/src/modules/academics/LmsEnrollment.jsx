import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';

export default function LmsEnrollment({ course }) {
  const [roster, setRoster] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => { setLoading(true); api(`/lms/courses/${course.id}/enrollments`).then(setRoster).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [course.id]);

  const visible = roster.filter((s) => `${s.name} ${s.admissionNo}`.toLowerCase().includes(search.toLowerCase()));
  const setMany = (rows, enrolled) => { const ids = new Set(rows.map((s) => s.id)); setRoster(roster.map((s) => ids.has(s.id) ? { ...s, enrolled } : s)); };
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const result = await api(`/lms/courses/${course.id}/enrollments`, { method: 'PUT', body: { studentIds: roster.filter((s) => s.enrolled).map((s) => s.id) } }); setNotice(`${result.enrolled} students enrolled.`); setOpen(false); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return <div className="card" style={{ marginTop: 18 }}>
    <h2>Enrollment · {course.title}</h2>
    <p className="hint">{course.className} · {course.subjectName} · {roster.filter((s) => s.enrolled).length} of {roster.length} active students enrolled. Students who join the class later must be switched on here.</p>
    {error && !open && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}
    {loading && <p role="status">Loading students…</p>}
    <div className="row-actions"><button type="button" disabled={loading} onClick={() => { setNotice(''); setOpen(true); }}>Manage enrollment</button></div>
    <Modal className="lms-ns" open={open} title={`Enroll students · ${course.title}`} onClose={() => setOpen(false)} wide>
    <form className="enquiry-form" onSubmit={save}>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="enq-grid">
      <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or admission no…" aria-label="Search enrollment roster" /></label>
      <div className="row-actions"><button type="button" className="ghost" onClick={() => setMany(visible, true)}>Enroll shown</button><button type="button" className="ghost" onClick={() => setMany(visible, false)}>Unenroll shown</button></div>
    </div>
    <div style={{ maxHeight: '55vh', overflow: 'auto' }}>
      {visible.map((s) => <label key={s.id} className="check-row"><input type="checkbox" checked={s.enrolled} onChange={(e) => setMany([s], e.target.checked)} /><span>{s.name}<small className="block">{s.admissionNo}</small></span></label>)}
      {!loading && !roster.length && <p className="hint">No active students are available in this class.</p>}
    </div>
    <div className="form-actions"><button disabled={busy || loading}>{busy ? 'Saving…' : 'Save enrollment'}</button><button type="button" className="ghost" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
    </Modal>
  </div>;
}
