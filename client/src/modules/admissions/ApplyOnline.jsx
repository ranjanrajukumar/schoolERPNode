import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

const EMPTY = {
  applicantName: '',
  middleName: '',
  dob: '',
  gender: '',
  nationality: '',
  guardianName: '',
  guardianPhone: '',
  fatherName: '',
  motherName: '',
  email: '',
  address: '',
  city: '',
  pincode: '',
  previousSchool: '',
  previousClass: '',
  classId: '',
  remarks: '',
};

/** Public page (no sign-in): the family's enquiry form. Staff see the result under Admissions → Admission Enquiries (source: Website). */
export default function ApplyOnline() {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/public/classes')
      .then(setClasses)
      .catch(() => {});
  }, []);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/public/apply', { method: 'POST', body: form });
      setDone(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '32px auto', padding: '0 16px' }}>
      <h1>Admission enquiry</h1>
      {done ? (
        <div className="card">
          <p className="success">
            Thank you. Your enquiry has been received and the school office will contact you on the phone
            number you gave.
          </p>
          <button onClick={() => setDone(false)}>Submit another</button>
        </div>
      ) : (
        <form className="card form" onSubmit={submit}>
          <label>
            Child's full name *
            <input value={form.applicantName} onChange={set('applicantName')} required maxLength={160} />
          </label>
          <label>
            Date of birth
            <input type="date" value={form.dob} onChange={set('dob')} />
          </label>
          <label>
            Gender
            <select value={form.gender} onChange={set('gender')}>
              <option value="">--</option>
              {['male', 'female', 'other'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label>
            Class applying for *
            <select value={form.classId} onChange={set('classId')} required>
              <option value="">--</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Middle name
            <input value={form.middleName} onChange={set('middleName')} maxLength={80} />
          </label>
          <label>
            Nationality
            <input value={form.nationality} onChange={set('nationality')} maxLength={50} />
          </label>
          <label>
            Father's name
            <input value={form.fatherName} onChange={set('fatherName')} maxLength={120} />
          </label>
          <label>
            Mother's name
            <input value={form.motherName} onChange={set('motherName')} maxLength={120} />
          </label>
          <label>
            Parent / guardian name *
            <input value={form.guardianName} onChange={set('guardianName')} required maxLength={120} />
          </label>
          <label>
            Phone (with country code) *
            <input
              type="tel"
              value={form.guardianPhone}
              onChange={set('guardianPhone')}
              required
              maxLength={20}
            />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} maxLength={150} />
          </label>
          <label>
            Address
            <input value={form.address} onChange={set('address')} maxLength={255} />
          </label>
          <label>
            City / town
            <input value={form.city} onChange={set('city')} maxLength={80} />
          </label>
          <label>
            PIN / postal code
            <input value={form.pincode} onChange={set('pincode')} maxLength={12} />
          </label>
          <label>
            Previous school (if any)
            <input value={form.previousSchool} onChange={set('previousSchool')} maxLength={160} />
          </label>
          <label>
            Class last attended
            <input value={form.previousClass} onChange={set('previousClass')} maxLength={50} />
          </label>
          <label>
            Anything we should know
            <input value={form.remarks} onChange={set('remarks')} maxLength={255} />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Submit enquiry'}
          </button>
        </form>
      )}
    </div>
  );
}
