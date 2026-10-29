import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import MasterSelect from '../../components/MasterSelect.jsx';
import FormSection from '../../components/FormSection.jsx';
import DocumentSlots, { useDocuments } from '../../components/DocumentSlots.jsx';
import PhotoField, { savePhoto } from '../../components/PhotoField.jsx';

/** Staff registration, grouped the way HR collects it. Only first and last name are required; the staff number is generated when left blank. */
export const SECTIONS = [
  {
    title: 'Employment',
    fields: [
      { key: 'staffNo', label: 'Staff no (blank = generate)' },
      {
        key: 'staffCategory',
        label: 'Staff category',
        type: 'select',
        options: [
          ['teaching', 'Teaching'],
          ['non_teaching', 'Non-teaching'],
        ],
        blank: true,
        required: true,
      },
      { key: 'designation', label: 'Designation', type: 'designation' },
      { key: 'departmentId', label: 'Department', type: 'department' },
      {
        key: 'employmentType',
        label: 'Employment type',
        type: 'select',
        options: [
          ['permanent', 'Permanent'],
          ['contract', 'Contract'],
          ['part_time', 'Part time'],
          ['visiting', 'Visiting'],
        ],
        blank: true,
      },
      { key: 'joinDate', label: 'Date of joining', type: 'date' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          ['active', 'active'],
          ['inactive', 'inactive'],
        ],
      },
    ],
  },
  {
    title: 'Personal',
    fields: [
      { key: 'firstName', label: 'First name', required: true },
      { key: 'middleName', label: 'Middle name' },
      { key: 'lastName', label: 'Last name', required: true },
      {
        key: 'gender',
        label: 'Gender',
        type: 'select',
        options: [
          ['male', 'male'],
          ['female', 'female'],
          ['other', 'other'],
        ],
        blank: true,
      },
      { key: 'dob', label: 'Date of birth', type: 'date' },
      { key: 'maritalStatus', label: 'Marital status', master: 'marital_status' },
      {
        key: 'bloodGroup',
        label: 'Blood group',
        type: 'select',
        options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => [b, b]),
        blank: true,
      },
      { key: 'nationalId', label: 'Aadhaar / national ID no' },
      { key: 'panNo', label: 'PAN / tax ID' },
    ],
  },
  {
    title: 'Contact & address',
    fields: [
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email (also their login email)', type: 'email' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City / town' },
      { key: 'state', label: 'State', master: 'state' },
      { key: 'pincode', label: 'PIN / postal code' },
    ],
  },
  {
    title: 'Qualification & experience',
    fields: [
      { key: 'qualification', label: 'Highest qualification', master: 'qualification' },
      { key: 'experienceYears', label: 'Years of experience', type: 'number' },
      { key: 'previousEmployer', label: 'Previous employer' },
    ],
  },
  {
    title: 'Emergency contact',
    fields: [
      { key: 'emergencyName', label: 'Name' },
      { key: 'emergencyPhone', label: 'Phone', type: 'tel' },
    ],
  },
  {
    title: 'Bank details (for payroll)',
    fields: [
      { key: 'bankName', label: 'Bank name' },
      { key: 'bankAccountNo', label: 'Account number' },
      { key: 'ifsc', label: 'IFSC / branch code' },
    ],
  },
  { title: 'Remarks', fields: [{ key: 'remarks', label: 'Notes', type: 'textarea' }] },
];

const ALL = SECTIONS.flatMap((s) => s.fields);
const EMPTY = Object.fromEntries(ALL.map((f) => [f.key, f.key === 'status' ? 'active' : '']));

/** Used as a page (route) or, with `embedded`, inside a popup over its list: then it reports back through onSaved / onCancel. */
export default function StaffForm({ embedded = false, id: idProp, onSaved, onCancel } = {}) {
  const routeParams = useParams();
  const id = embedded ? idProp : routeParams.id;
  const nav = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const docs = useDocuments('staff', id);
  const [photo, setPhoto] = useState(null); // picked before the staff member exists; saved right after

  useEffect(() => {
    api('/hr/departments')
      .then(setDepartments)
      .catch(() => {});
    api('/hr/designations')
      .then(setDesignations)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!id) return;
    api(`/staff/${id}`)
      .then((s) => setForm(Object.fromEntries(ALL.map((f) => [f.key, s[f.key] ?? EMPTY[f.key]]))))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api(id ? `/staff/${id}` : '/staff', { method: id ? 'PUT' : 'POST', body: form });
      let photoNote = '';
      const notUploaded = await docs.flush(id ?? r.id);
      if (notUploaded.length) photoNote += ` These documents were not uploaded: ${notUploaded.join('; ')}.`;
      if (photo) {
        try {
          await savePhoto('staff', id ?? r.id, photo);
        } catch (err) {
          photoNote += ` The photo was not saved (${err.message}); add it again by editing.`;
        }
      }
      if (embedded) onSaved({ created: !id, photoNote });
      else nav('/staff');
    } catch (err) {
      setError(err.message);
      (document.querySelector('.modal-body') ?? window).scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  return (
    <>
      {!embedded && <h1>{id ? 'Edit staff member' : 'New staff registration'}</h1>}
      <p className="hint">
        Fields marked * are required. A teacher&apos;s login email must equal the email here for marks entry
        to work. Identity, address and bank details are visible to admins (bank details also to accountants)
        only.
      </p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={save} className="enquiry-form">
        <FormSection
          title="Photo"
          glyph="◉"
          tone="violet"
          sub="A passport-style picture for the profile and ID card"
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <PhotoField entity="staff" id={id} label="Staff photo" picked={photo} onPick={setPhoto} />
          </div>
        </FormSection>
        {SECTIONS.map((section, i) => (
          <FormSection key={section.title} title={section.title} index={i}>
            {section.fields.map((f) => (
              <label key={f.key} className={f.type === 'textarea' ? 'wide' : undefined}>
                <span>
                  {f.label}
                  {f.required && ' *'}
                </span>
                {f.master ? (
                  <MasterSelect type={f.master} value={form[f.key]} onChange={set(f.key)} />
                ) : f.type === 'department' ? (
                  <select value={form[f.key]} onChange={set(f.key)}>
                    <option value="">--</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'select' ? (
                  <select value={form[f.key]} onChange={set(f.key)} required={f.required}>
                    {f.blank && <option value="">--</option>}
                    {f.options.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea rows={3} maxLength={500} value={form[f.key]} onChange={set(f.key)} />
                ) : (
                  <>
                    <input
                      type={f.type === 'designation' ? 'text' : (f.type ?? 'text')}
                      step={f.type === 'number' ? '0.5' : undefined}
                      min={f.type === 'number' ? 0 : undefined}
                      list={
                        f.type === 'designation' ? 'list-designation' : f.list ? `list-${f.key}` : undefined
                      }
                      required={f.required}
                      value={form[f.key]}
                      onChange={set(f.key)}
                    />
                    {f.type === 'designation' && (
                      <datalist id="list-designation">
                        {designations.map((d) => (
                          <option key={d.id} value={d.name} />
                        ))}
                      </datalist>
                    )}
                    {f.list && (
                      <datalist id={`list-${f.key}`}>
                        {f.list.map((o) => (
                          <option key={o} value={o} />
                        ))}
                      </datalist>
                    )}
                  </>
                )}
              </label>
            ))}
          </FormSection>
        ))}
        <FormSection
          title="Documents"
          glyph="▤"
          tone="amber"
          sub="What the school asks for (Settings → Master data → Staff documents)"
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <DocumentSlots docs={docs} />
          </div>
        </FormSection>
        <div className="form-actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : id ? 'Save changes' : 'Register staff member'}
          </button>
          {embedded ? (
            <button type="button" className="ghost" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <Link
              className="btn"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border-strong)',
              }}
              to="/staff"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </>
  );
}
