import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import MasterSelect from '../../components/MasterSelect.jsx';
import FormSection from '../../components/FormSection.jsx';

/** Parent or guardian profile and portal login. New accounts can be filled from what the student's record already says about a parent. */
const SECTIONS = [
  {
    title: 'Login',
    fields: [
      { key: 'name', label: 'Full name', required: true },
      { key: 'email', label: 'Email (the login)', type: 'email', required: true, newOnly: true },
      { key: 'password', label: 'Password (min 8 characters)', type: 'password', newOnly: true },
    ],
  },
  {
    title: 'Contact & address',
    fields: [
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'alternatePhone', label: 'Alternate phone', type: 'tel' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City / town' },
      { key: 'state', label: 'State', master: 'state' },
      { key: 'pincode', label: 'PIN / postal code' },
    ],
  },
  {
    title: 'Work & identity',
    fields: [
      { key: 'occupation', label: 'Occupation', master: 'occupation' },
      { key: 'employer', label: 'Employer / business' },
      { key: 'nationalId', label: 'Aadhaar / national ID no' },
    ],
  },
];
const ALL = SECTIONS.flatMap((s) => s.fields);
const EMPTY = Object.fromEntries(ALL.map((f) => [f.key, '']));

/** Used as a page (route) or, with `embedded`, inside a popup over its list: then it reports back through onSaved / onCancel. */
export default function ParentForm({
  embedded = false,
  id: idProp,
  onSaved,
  onCancel,
  studentId: studentIdProp,
} = {}) {
  const routeParams = useParams();
  const id = embedded ? idProp : routeParams.id;
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState(EMPTY);
  const [from, setFrom] = useState({
    studentId: (embedded ? studentIdProp : params.get('studentId')) ?? '',
    who: 'father',
  }); // arriving from a student's profile preselects them
  const [linkStudent, setLinkStudent] = useState(null); // set when filled from a student: that child is linked on save
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api('/parents')
      .then((all) => {
        const p = all.find((x) => String(x.id) === String(id));
        if (!p) throw new Error('Parent not found');
        setForm({ ...EMPTY, ...Object.fromEntries(ALL.map((f) => [f.key, p[f.key] ?? ''])) });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const fill = async () => {
    setError('');
    try {
      const s = await api(`/students/${from.studentId}`);
      const pick = {
        father: {
          name: s.fatherName,
          phone: s.fatherPhone,
          occupation: s.fatherOccupation,
          relation: 'Father',
        },
        mother: {
          name: s.motherName,
          phone: s.motherPhone,
          occupation: s.motherOccupation,
          relation: 'Mother',
        },
        guardian: {
          name: s.guardianName,
          phone: s.guardianPhone,
          occupation: '',
          relation: s.guardianRelation || 'Guardian',
          email: s.guardianEmail,
        },
      }[from.who];
      if (!pick.name) {
        setError(`The student record has no ${from.who} name yet.`);
        return;
      }
      setForm({
        ...form,
        name: pick.name,
        phone: pick.phone ?? '',
        occupation: pick.occupation ?? '',
        email: pick.email ?? form.email,
        address: s.address ?? '',
        city: s.city ?? '',
        state: s.state ?? '',
        pincode: s.pincode ?? '',
      });
      setLinkStudent({ studentId: s.id, relation: pick.relation, label: `${s.firstName} ${s.lastName}` });
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (id) {
        const { email, password, ...rest } = form;
        await api(`/parents/${id}`, { method: 'PUT', body: { ...rest, ...(password && { password }) } });
      } else {
        const created = await api('/parents', { method: 'POST', body: form });
        if (linkStudent)
          await api(`/parents/${created.id}/students`, {
            method: 'POST',
            body: { studentId: linkStudent.studentId, relation: linkStudent.relation },
          });
      }
      if (embedded) onSaved({ created: !id });
      else nav('/parents');
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
      {!embedded && <h1>{id ? 'Edit parent' : 'New parent account'}</h1>}
      <p className="hint">
        The parent signs in to the Parent Portal with the email and password below and sees only their linked
        children.{id && ' Leave the password blank to keep it.'}
      </p>
      {error && <p className="error">{error}</p>}

      {!id && (
        <div className="card form">
          <b>Fill from a student&apos;s record</b>
          <label>
            Student
            <TypeaheadSelect
              kind="students"
              value={from.studentId}
              onChange={(id) => setFrom({ ...from, studentId: id })}
            />
          </label>
          <label>
            Who
            <select value={from.who} onChange={(e) => setFrom({ ...from, who: e.target.value })}>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="guardian">Guardian</option>
            </select>
          </label>
          <button type="button" disabled={!from.studentId} onClick={fill}>
            Fill the form
          </button>
          {linkStudent && (
            <p className="hint" style={{ flexBasis: '100%' }}>
              {linkStudent.label} will be linked to this account as {linkStudent.relation} when you save.
            </p>
          )}
        </div>
      )}

      <form onSubmit={save} className="enquiry-form">
        {SECTIONS.map((section, i) => (
          <FormSection key={section.title} title={section.title} index={i}>
            {section.fields
              .filter((f) => !(f.newOnly && id && f.key === 'email'))
              .map((f) => (
                <label key={f.key}>
                  <span>
                    {f.label}
                    {f.required && ' *'}
                  </span>
                  {f.master ? (
                    <MasterSelect type={f.master} value={form[f.key]} onChange={set(f.key)} />
                  ) : (
                    <input
                      type={f.type ?? 'text'}
                      required={f.required || (f.key === 'password' && !id)}
                      minLength={f.key === 'password' ? 8 : undefined}
                      autoComplete={f.type === 'password' ? 'new-password' : undefined}
                      value={form[f.key]}
                      onChange={set(f.key)}
                    />
                  )}
                </label>
              ))}
          </FormSection>
        ))}
        <div className="form-actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : id ? 'Save changes' : 'Create account'}
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
              to="/parents"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </>
  );
}
