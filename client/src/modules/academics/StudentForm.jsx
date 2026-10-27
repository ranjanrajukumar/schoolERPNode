import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import MasterSelect from '../../components/MasterSelect.jsx';
import FormSection from '../../components/FormSection.jsx';
import DocumentSlots, { useDocuments } from '../../components/DocumentSlots.jsx';
import PhotoField, { savePhoto } from '../../components/PhotoField.jsx';
import { AdmissionInfoSection, SiblingsSection, SignaturesSection, SIGNATURES, CLASS_LEVELS, AddressSections, ContactDetailsSection, LocalGuardianSection, OfficialSection, ParentDetailsSection, PersonalSection, QualificationSection, SECTION_EMPTY } from '../admissions/AdmissionSections.jsx';

/** One registration form for a student, grouped the way the school collects the information. */
export const SECTIONS = [
  { title: 'Admission', fields: [
    { key: 'admissionNo', label: 'Admission no (blank = generate)' },
    { key: 'admissionDate', label: 'Date of admission', type: 'date' },
    { key: 'classId', label: 'Class & section', type: 'class' },
    { key: 'rollNo', label: 'Roll number' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
    { key: 'registrationStatus', label: 'Registration status', type: 'select', options: ['complete', 'pending', 'under_review'] },
  ] },
  { title: 'Student', fields: [
    { key: 'firstName', label: 'First name', required: true },
    { key: 'middleName', label: 'Middle name' },
    { key: 'lastName', label: 'Last name', required: true },
    { key: 'dob', label: 'Date of birth', type: 'date' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'], blank: true },
    { key: 'nationality', label: 'Nationality', master: 'nationality' },
    { key: 'religion', label: 'Religion', master: 'religion' },
    { key: 'category', label: 'Category', master: 'category' },
    { key: 'motherTongue', label: 'Mother tongue', master: 'mother_tongue' },
    { key: 'nationalId', label: 'Aadhaar / national ID no' },
  ] },
  { title: 'Contact & address', fields: [
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City / town' },
    { key: 'state', label: 'State', master: 'state' },
    { key: 'pincode', label: 'PIN / postal code' },
    { key: 'email', label: 'Student email', type: 'email' },
    { key: 'phone', label: 'Student phone', type: 'tel' },
  ] },
  { title: 'Parents', fields: [
    { key: 'fatherName', label: "Father's name" },
    { key: 'fatherPhone', label: "Father's phone", type: 'tel' },
    { key: 'fatherOccupation', label: "Father's occupation", master: 'occupation' },
    { key: 'motherName', label: "Mother's name" },
    { key: 'motherPhone', label: "Mother's phone", type: 'tel' },
    { key: 'motherOccupation', label: "Mother's occupation", master: 'occupation' },
  ] },
  { title: 'Guardian (primary contact for the school)', fields: [
    { key: 'guardianName', label: 'Guardian name' },
    { key: 'guardianRelation', label: 'Relation to student', master: 'relation' },
    { key: 'guardianPhone', label: 'Guardian phone (SMS goes here)', type: 'tel' },
    { key: 'guardianEmail', label: 'Guardian email', type: 'email' },
  ] },
  { title: 'Previous school', fields: [
    { key: 'previousSchool', label: 'School name' },
    { key: 'previousClass', label: 'Class last attended', list: CLASS_LEVELS },
    { key: 'previousTcNo', label: 'Transfer certificate no' },
    { key: 'previousPercent', label: 'Last result (%)', type: 'number' },
  ] },
  { title: 'Remarks', fields: [{ key: 'remarks', label: 'Notes about the student', type: 'textarea' }] },
];

export const ALL = SECTIONS.flatMap((s) => s.fields);
export const EMPTY = { ...SECTION_EMPTY, ...Object.fromEntries(ALL.map((f) => [f.key, f.key === 'status' ? 'active' : f.key === 'registrationStatus' ? 'complete' : ''])) };

// fields the shared sections (personal info, parents, contacts, addresses, official info) ask, so the plain list does not ask them twice
const ASKED_BELOW = new Set(['middleName', 'nationality', 'religion', 'category', 'nationalId', 'phone', 'email', 'address', 'city', 'state', 'pincode',
  'fatherName', 'fatherPhone', 'fatherOccupation', 'motherName', 'motherPhone', 'motherOccupation']);

/** Used as a page (route) or, with `embedded`, inside a popup over its list: then it reports back through onSaved / onCancel. */
export default function StudentForm({ embedded = false, id: idProp, onSaved, onCancel } = {}) {
  const routeParams = useParams();
  const id = embedded ? idProp : routeParams.id;
  const nav = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const docs = useDocuments('student', id);
  const [photo, setPhoto] = useState(null); // picked before the student exists; saved right after
  const [extraPhotos, setExtraPhotos] = useState({}); // the signature, thumb and parents' pictures picked the same way
  const [billFees, setBillFees] = useState(false);

  useEffect(() => { api('/classes').then(setClasses); }, []);
  useEffect(() => {
    if (!id) return;
    api(`/students/${id}`).then((s) => setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? EMPTY[k]])))).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      let r;
      try {
        r = await api(id ? `/students/${id}` : '/students', { method: id ? 'PUT' : 'POST', body: { ...form, billFees } });
      } catch (err) {
        // Same name and birthday as an existing student: the message is shown and nothing is saved.
        throw err;
      }
      let photoNote = '';
      const notUploaded = await docs.flush(id ?? r.id);
      if (notUploaded.length) photoNote += ` These documents were not uploaded: ${notUploaded.join('; ')}.`;
      for (const [entity, label] of SIGNATURES) {
        const file = extraPhotos[entity];
        if (file) { try { await savePhoto(entity, id ?? r.id, file); } catch (err) { photoNote += ` The ${label.toLowerCase()} was not saved (${err.message}); add it again by editing.`; } }
      }
      if (photo) { try { await savePhoto('student', id ?? r.id, photo); } catch (err) { photoNote += ` The photo was not saved (${err.message}); add it again by editing.`; } }
      const notice = (id ? 'Details saved.' : `Registered as ${r.admissionNo}.${r.feesBilled ? ` ${r.feesBilled} fee item(s) billed.` : ''}`) + photoNote;
      if (embedded) onSaved({ id: id ?? r.id, notice, created: !id }); else nav(`/students/${id ?? r.id}/profile`, { state: { notice } });
    } catch (err) { setError(err.message); (document.querySelector('.modal-body') ?? window).scrollTo({ top: 0, behavior: 'smooth' }); } finally { setBusy(false); }
  };

  const plain = (title) => {
    const section = SECTIONS.find((x) => x.title === title);
    const fields = section.fields.filter((f) => !ASKED_BELOW.has(f.key));
    if (!fields.length) return null;
    return (
          <FormSection key={section.title} title={section.title} index={SECTIONS.indexOf(section)}>
              {fields.map((f) => (
                <label key={f.key} className={f.type === 'textarea' ? 'wide' : undefined}>
                  <span>{f.label}{f.required && ' *'}</span>
                  {f.master ? (
                    <MasterSelect type={f.master} value={form[f.key]} onChange={set(f.key)} />
                  ) : f.type === 'class' ? (
                    <select value={form[f.key]} onChange={set(f.key)}>
                      <option value="">--</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}
                    </select>
                  ) : f.type === 'select' ? (
                    <select value={form[f.key]} onChange={set(f.key)}>
                      {f.blank && <option value="">--</option>}{f.options.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea rows={3} maxLength={500} value={form[f.key]} onChange={set(f.key)} placeholder={`Enter ${String(f.label ?? '').toLowerCase()}`} />
                  ) : (
                    <>
                      <input type={f.type ?? 'text'} step={f.type === 'number' ? '0.01' : undefined} min={f.type === 'number' ? 0 : undefined} max={f.type === 'number' ? 100 : undefined}
                        list={f.list ? `list-${f.key}` : undefined} required={f.required} value={form[f.key]} onChange={set(f.key)} placeholder={f.type === 'date' ? undefined : `Enter ${String(f.label ?? '').replace(/ [*]$/, '').toLowerCase()}`} />
                      {f.list && <datalist id={`list-${f.key}`}>{f.list.map((o) => <option key={o} value={o} />)}</datalist>}
                    </>
                  )}
                </label>
              ))}
          </FormSection>
    );
  };
  if (loading) return <p>Loading…</p>;
  return (
    <>
      {!embedded && <h1>{id ? 'Edit student' : 'New student registration'}</h1>}
      <p className="hint">Fields marked * are required; everything else can be filled in later. After saving you can add the photo, documents and health record from the student's profile.</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={save} className="enquiry-form">
        <FormSection title="Photo" glyph="◉" tone="violet" sub="A passport-style picture for the profile and ID card"><div className="wide" style={{ gridColumn: '1 / -1' }}><PhotoField entity="student" id={id} label="Student photo" picked={photo} onPick={setPhoto} /></div></FormSection>
        {plain('Admission')}
        {plain('Student')}
        <PersonalSection form={form} set={setField} withEmail />
        <QualificationSection form={form} set={setField} />
        {plain('Guardian (primary contact for the school)')}
        <ParentDetailsSection form={form} set={setField} />
        <ContactDetailsSection form={form} set={setField} />
        <LocalGuardianSection form={form} set={setField} />
        <AddressSections form={form} set={setField} setForm={setForm} />
        {plain('Previous school')}
        <OfficialSection form={form} set={setField} withReferredBy withSource />
        <AdmissionInfoSection form={form} set={setField} />
        <SiblingsSection form={form} set={setField} />
        <SignaturesSection id={id} picked={extraPhotos} onPick={(entity, file) => setExtraPhotos((p) => ({ ...p, [entity]: file }))} />
        {plain('Remarks')}
        <FormSection title="Documents" glyph="▤" tone="amber" sub="What the school asks for (Settings → Master data → Student documents)"><div style={{ gridColumn: '1 / -1' }}><DocumentSlots docs={docs} /></div></FormSection>
        {!id && (
          <FormSection title="On registration" glyph="✓" tone="green" sub="What happens when you save">
            <label className="inline wide"><input type="checkbox" checked={billFees} onChange={(e) => setBillFees(e.target.checked)} disabled={!form.classId} /> Bill this class&apos;s fee structure now{!form.classId && ' (choose a class first)'}</label>
            <p className="hint wide" style={{ gridColumn: '1 / -1' }}>Afterwards, from the profile: add documents, record health details, and create the parent&apos;s portal login.</p>
          </FormSection>
        )}
        <div className="form-actions">
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Register student'}</button>
          {embedded ? <button type="button" className="ghost" onClick={onCancel}>Cancel</button> : <Link className="btn" style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border-strong)' }} to="/students">Cancel</Link>}
        </div>
      </form>
    </>
  );
}
