import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { SECTIONS } from '../academics/StudentForm.jsx';
import MasterSelect from '../../components/MasterSelect.jsx';
import FormSection from '../../components/FormSection.jsx';

/**
 * The application form reuses the student registration layout, minus what the school assigns on admission
 * (admission no, date, roll number, status). Everything entered here is copied onto the student when they are enrolled.
 */
const SKIP = ['admissionNo', 'admissionDate', 'rollNo', 'status'];
const LAYOUT = SECTIONS
  .map((s) => ({ ...s, fields: s.fields.filter((f) => !SKIP.includes(f.key)).map((f) => (f.key === 'classId' ? { ...f, label: 'Class applying for' } : f)) }))
  .filter((s) => s.fields.length)
  .map((s) => (s.title === 'Admission' ? { ...s, title: 'Application' } : s));
const SOURCE_OPTIONS = [['online', 'Website'], ['office', 'Walk-in'], ['phone', 'Phone'], ['referral', 'Referral'], ['social', 'Social media'], ['other', 'Other']];
LAYOUT.splice(1, 0, { title: 'Enquiry', fields: [
  { key: 'source', label: 'How did they find us?', type: 'select', options: SOURCE_OPTIONS, noBlank: true },
  { key: 'followUpOn', label: 'Follow up on', type: 'date' },
  { key: 'visitOn', label: 'Campus visit on', type: 'date' },
] });
const ALL = LAYOUT.flatMap((s) => s.fields);
const EMPTY = Object.fromEntries(ALL.map((f) => [f.key, f.key === 'source' ? 'office' : '']));

/** Used as a page (route) or, with `embedded`, inside a popup over its list: then it reports back through onSaved / onCancel. */
export default function AdmissionForm({ embedded = false, id: idProp, onSaved, onCancel, startAs } = {}) {
  const routeParams = useParams();
  const id = embedded ? idProp : routeParams.id;
  const nav = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/classes').then(setClasses); }, []);
  useEffect(() => {
    if (!id) return;
    api('/admissions').then((all) => {
      const a = all.find((x) => String(x.id) === String(id));
      if (!a) throw new Error('Applicant not found');
      const [first, ...rest] = a.applicantName.trim().split(/\s+/);
      setForm({ ...Object.fromEntries(ALL.map((f) => [f.key, a[f.key] ?? ''])), firstName: first, lastName: rest.join(' ') });
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { firstName, lastName, ...rest } = form;
      const body = { ...rest, applicantName: [firstName, lastName].filter(Boolean).join(' ') };
      if (!body.source) delete body.source; // the column cannot be empty; the server keeps what it has
      const r = await api(id ? `/admissions/${id}` : '/admissions', { method: id ? 'PUT' : 'POST', body });
      // A new admission entered from the applications page starts as an application, not an enquiry.
      if (!id && startAs && r?.id) await api(`/admissions/${r.id}/status`, { method: 'POST', body: { status: startAs } });
      if (embedded) onSaved({ created: !id }); else nav('/admissions');
    } catch (err) { setError(err.message); (document.querySelector('.modal-body') ?? window).scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };

  if (loading) return <p>Loading…</p>;
  return (
    <>
      {!embedded && <h1>{id ? 'Edit application' : 'New admission enquiry'}</h1>}
      <p className="hint">Only the first and last name are required. Collect as much as you can now: it is copied to the student record when the applicant is enrolled.</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={save} className="enquiry-form">
        {LAYOUT.map((section, i) => (
          <FormSection key={section.title} title={section.title} index={i}>
              {section.fields.map((f) => (
                <label key={f.key} className={f.type === 'textarea' ? 'wide' : undefined}>
                  <span>{f.label}{f.required && ' *'}</span>
                  {f.master ? (
                    <MasterSelect type={f.master} value={form[f.key]} onChange={set(f.key)} />
                  ) : f.type === 'class' ? (
                    <select value={form[f.key]} onChange={set(f.key)}><option value="">--</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}</select>
                  ) : f.type === 'select' ? (
                    <select value={form[f.key]} onChange={set(f.key)}>{!f.noBlank && <option value="">--</option>}{f.options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}</select>
                  ) : f.type === 'textarea' ? (
                    <textarea rows={3} maxLength={255} value={form[f.key]} onChange={set(f.key)} />
                  ) : (
                    <>
                      <input type={f.type ?? 'text'} step={f.type === 'number' ? '0.01' : undefined} min={f.type === 'number' ? 0 : undefined} max={f.type === 'number' ? 100 : undefined}
                        list={f.list ? `list-${f.key}` : undefined} required={f.required} value={form[f.key]} onChange={set(f.key)} />
                      {f.list && <datalist id={`list-${f.key}`}>{f.list.map((o) => <option key={o} value={o} />)}</datalist>}
                    </>
                  )}
                </label>
              ))}
          </FormSection>
        ))}
        <div className="form-actions">
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Save enquiry'}</button>
          {embedded ? <button type="button" className="ghost" onClick={onCancel}>Cancel</button> : <Link className="btn" style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)' }} to="/admissions">Cancel</Link>}
        </div>
      </form>
    </>
  );
}
