import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import MasterSelect from '../../components/MasterSelect.jsx';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import PhotoField, { savePhoto } from '../../components/PhotoField.jsx';
import {
  AddressSections,
  QualificationSection,
  ContactDetailsSection,
  LocalGuardianSection,
  OfficialSection,
  ParentDetailsSection,
  PersonalSection,
  SECTION_EMPTY,
} from './AdmissionSections.jsx';
import { localDate } from '../../utils/dates.js';

const SOURCES = [
  ['online', 'Website'],
  ['office', 'Walk-in'],
  ['phone', 'Phone'],
  ['referral', 'Referral'],
  ['social', 'Social media'],
  ['other', 'Other'],
];
const CONTACT = [
  ['phone', 'Phone call'],
  ['whatsapp', 'WhatsApp'],
  ['sms', 'SMS'],
  ['email', 'Email'],
  ['visit', 'In person'],
];
const FOLLOW_UP = [
  ['phone_call', 'Phone call'],
  ['whatsapp', 'WhatsApp'],
  ['sms', 'SMS'],
  ['email', 'Email'],
  ['visit', 'Campus visit'],
  ['meeting', 'Meeting'],
];
const today = () => localDate();

const EMPTY = {
  ...SECTION_EMPTY,
  firstName: '',
  lastName: '',
  dob: '',
  gender: '',
  classId: '',
  academicYear: '',
  previousSchool: '',
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  email: '',
  address: '',
  source: '',
  assignedToId: '',
  enquiryOn: today(),
  preferredContact: 'phone',
  remarks: '',
  followUpOn: '',
  followUpType: 'phone_call',
  followUpNote: '',
};

function Section({ glyph, tone, title, sub, children }) {
  return (
    <section className="card">
      <header className="card-head">
        <span className={`tile-icon ${tone}`} aria-hidden="true">
          {glyph}
        </span>
        <span>
          <h2>{title}</h2>
          <small>{sub}</small>
        </span>
      </header>
      <div className="enq-grid">{children}</div>
    </section>
  );
}

/**
 * The new / edit enquiry form: student, parent or guardian, how the family found the school, and the follow-up plan.
 * Runs inside a popup: it reports back through onSaved and onCancel.
 */
export default function EnquiryForm({ id, onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(null); // picked before the enquiry exists; saved right after

  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
    api('/academic-years')
      .then((ys) => {
        setYears(ys);
        // a new enquiry starts on the current academic year
        if (!id)
          setForm((f) => ({ ...f, academicYear: f.academicYear || ys.find((y) => y.isCurrent)?.name || '' }));
      })
      .catch(() => {});
  }, [id]);
  useEffect(() => {
    if (!id) return;
    api(`/admissions/enquiries/${id}`)
      .then((e) => setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, e[k] ?? EMPTY[k]]))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api(id ? `/admissions/enquiries/${id}` : '/admissions/enquiries', {
        method: id ? 'PUT' : 'POST',
        body: form,
      });
      let photoNote = '';
      if (photo) {
        try {
          await savePhoto('enquiry', id ?? r.id, photo);
        } catch (err) {
          photoNote = ` The photo was not saved (${err.message}); add it again by editing.`;
        }
      }
      onSaved({ created: !id, photoNote });
    } catch (err) {
      setError(err.message);
      (document.querySelector('.modal-body') ?? window).scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  return (
    <form onSubmit={save} className="enquiry-form">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <Section glyph="♙" tone="blue" title="Student information" sub="Tell us about the prospective student">
        <div className="wide" style={{ gridColumn: '1 / -1' }}>
          <PhotoField
            entity="enquiry"
            id={id}
            label="Student photo (optional)"
            picked={photo}
            onPick={setPhoto}
          />
        </div>
        <label>
          <span>Student first name *</span>
          <input
            value={form.firstName}
            onChange={set('firstName')}
            placeholder="e.g. Aarav"
            required
            maxLength={80}
          />
        </label>
        <label>
          <span>Student last name *</span>
          <input
            value={form.lastName}
            onChange={set('lastName')}
            placeholder="e.g. Khanna"
            required
            maxLength={80}
          />
        </label>
        <label>
          <span>Date of birth</span>
          <input type="date" value={form.dob} onChange={set('dob')} max={today()} />
        </label>
        <label>
          <span>Gender</span>
          <select value={form.gender} onChange={set('gender')}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          <span>Grade applying for *</span>
          <select value={form.classId} onChange={set('classId')} required>
            <option value="">Select grade</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
          {!classes.length && (
            <small className="field-note">
              No classes yet. <Link to="/classes">Create one</Link> first.
            </small>
          )}
        </label>
        <label>
          <span>Academic year *</span>
          {years.length ? (
            <select value={form.academicYear} onChange={set('academicYear')} required>
              <option value="">Select year</option>
              {years.map((y) => (
                <option key={y.id} value={y.name}>
                  {y.name}
                </option>
              ))}
            </select>
          ) : (
            <small className="field-note">
              No academic year yet. <Link to="/academic-years">Add one</Link> (not required until you do).
            </small>
          )}
        </label>
        <label className="wide">
          <span>Previous school (optional)</span>
          <input
            value={form.previousSchool}
            onChange={set('previousSchool')}
            placeholder="Enter previous school name"
            maxLength={160}
          />
        </label>
      </Section>

      <PersonalSection form={form} set={setField} />

      <QualificationSection form={form} set={setField} />

      <Section
        glyph="♧"
        tone="green"
        title="Parent / guardian details"
        sub="Primary contact for admissions communication"
      >
        <label>
          <span>Parent / guardian name *</span>
          <input
            value={form.guardianName}
            onChange={set('guardianName')}
            placeholder="Full name"
            required
            maxLength={120}
          />
        </label>
        <label>
          <span>Relationship to student</span>
          <MasterSelect
            type="relation"
            value={form.guardianRelation}
            onChange={set('guardianRelation')}
            placeholder="Select relationship"
          />
        </label>
        <label>
          <span>Phone number *</span>
          <input
            type="tel"
            value={form.guardianPhone}
            onChange={set('guardianPhone')}
            placeholder="+91 98765 43210"
            required
            maxLength={20}
          />
        </label>
        <label>
          <span>Email address</span>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="name@example.com"
            maxLength={150}
          />
        </label>
      </Section>

      <ParentDetailsSection form={form} set={setField} />

      <ContactDetailsSection form={form} set={setField} />

      <LocalGuardianSection form={form} set={setField} />

      <AddressSections form={form} set={setField} setForm={setForm} />

      <Section glyph="⌖" tone="violet" title="Enquiry details" sub="Record how the family found your school">
        <label>
          <span>Enquiry source *</span>
          <select value={form.source} onChange={set('source')} required>
            <option value="">Select source</option>
            {SOURCES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Assigned to</span>
          <TypeaheadSelect
            kind="staff"
            value={form.assignedToId}
            onChange={(sid) => setForm({ ...form, assignedToId: sid })}
            filters={{ status: 'active' }}
            placeholder="Choose admissions staff"
          />
        </label>
        <label>
          <span>Enquiry date</span>
          <input type="date" value={form.enquiryOn} onChange={set('enquiryOn')} max={today()} />
        </label>
        <label>
          <span>Preferred contact method</span>
          <select value={form.preferredContact} onChange={set('preferredContact')}>
            {CONTACT.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          <span>Notes</span>
          <textarea
            rows={3}
            value={form.remarks}
            onChange={set('remarks')}
            maxLength={255}
            placeholder="Add questions, interests, or any details shared by the family..."
          />
        </label>
      </Section>

      <OfficialSection form={form} set={setField} withReferredBy />

      <Section glyph="◷" tone="amber" title="Follow-up plan" sub="Schedule the next step with this family">
        <label>
          <span>Follow-up date</span>
          <input type="date" value={form.followUpOn} onChange={set('followUpOn')} />
        </label>
        <label>
          <span>Follow-up type</span>
          <select value={form.followUpType} onChange={set('followUpType')}>
            {FOLLOW_UP.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          <span>Internal reminder</span>
          <input
            value={form.followUpNote}
            onChange={set('followUpNote')}
            placeholder="e.g. Share Grade 1 fee structure"
            maxLength={200}
          />
        </label>
      </Section>

      <div className="form-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : id ? 'Save changes' : 'Save enquiry'}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
