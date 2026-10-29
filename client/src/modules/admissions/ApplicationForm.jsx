import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import DocumentSlots, { useDocuments } from '../../components/DocumentSlots.jsx';
import FormSection from '../../components/FormSection.jsx';
import MasterSelect from '../../components/MasterSelect.jsx';
import PhotoField, { savePhoto } from '../../components/PhotoField.jsx';
import {
  CLASS_LEVELS,
  AddressSections,
  QualificationSection,
  ContactDetailsSection,
  LocalGuardianSection,
  OfficialSection,
  SiblingsSection,
  ParentDetailsSection,
  PersonalSection,
  SECTION_EMPTY,
} from './AdmissionSections.jsx';
import { localDate } from '../../utils/dates.js';

const STEPS = [
  ['Student', 'Personal details'],
  ['Guardians', 'Family contacts'],
  ['Schooling', 'Previous education'],
  ['Review', 'Confirm & submit'],
];
const GRADES = CLASS_LEVELS; // Nursery to Class 12
const SOURCES = [
  ['online', 'Website'],
  ['referral', 'Referral'],
  ['office', 'Walk-in'],
  ['social', 'Social media'],
  ['phone', 'Phone'],
  ['other', 'Other'],
];
const NO_CHOICES = {
  electiveIds: [],
  activityIds: [],
  transportRouteId: '',
  transportStopId: '',
  needsHostel: false,
  hostelRoomId: '',
  feeGroupId: '',
};
const EMPTY = {
  ...SECTION_EMPTY,
  firstName: '',
  lastName: '',
  dob: '',
  gender: '',
  classId: '',
  academicYear: '',
  nationality: '',
  motherTongue: '',
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  guardianEmail: '',
  secondaryGuardianName: '',
  secondaryGuardianPhone: '',
  address: '',
  previousSchool: '',
  previousClass: '',
  previousTcNo: '',
  specialNeeds: '',
  source: '',
  referredBy: '',
  remarks: '',
  choices: NO_CHOICES,
};
const today = () => localDate();
const niceDate = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const GENDER = { male: 'Male', female: 'Female', other: 'Prefer not to say' };

/**
 * The student application: four steps (student, guardians, schooling, review) over one admissions record. A draft can be saved and
 * finished later; submitting moves it to "under review". Opened from an enquiry, it continues that enquiry instead of starting a new one.
 */
export default function ApplicationForm({ id: openId, onClose, onDone }) {
  const { id: paramId } = useParams();
  const embedded = Boolean(onClose); // inside a popup: no page chrome, and it closes instead of navigating
  const routeId = openId ?? paramId;
  const nav = useNavigate();
  const [id, setId] = useState(routeId ?? null);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('draft');
  const [appNo, setAppNo] = useState(null);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(Boolean(routeId));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(null); // picked before the draft exists; saved right after
  const formEl = useRef(null);
  const [options, setOptions] = useState({
    groups: [],
    activities: [],
    routes: [],
    stops: [],
    feeGroups: [],
    rooms: [],
  });
  const [fees, setFees] = useState(null); // what would be billed at enrolment, from the grade and the choices
  useEffect(() => {
    api('/activities')
      .then((all) =>
        setOptions((o) => ({ ...o, activities: all.filter((a) => ['planned', 'open'].includes(a.status)) })),
      )
      .catch(() => {});
    api('/transport/routes')
      .then((routes) => setOptions((o) => ({ ...o, routes })))
      .catch(() => {});
    api('/transport/stops')
      .then((stops) => setOptions((o) => ({ ...o, stops })))
      .catch(() => {});
    api('/fee-groups')
      .then((feeGroups) => setOptions((o) => ({ ...o, feeGroups })))
      .catch(() => {});
    api('/hostel/rooms')
      .then((rooms) => setOptions((o) => ({ ...o, rooms })))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!form.classId) {
      setOptions((o) => ({ ...o, groups: [] }));
      return;
    }
    api(`/class-subjects/electives?classId=${form.classId}`)
      .then((sheet) => setOptions((o) => ({ ...o, groups: sheet.groups })))
      .catch(() => {});
  }, [form.classId]);
  const { transportRouteId, hostelRoomId, feeGroupId } = form.choices;
  useEffect(() => {
    if (!form.classId && !transportRouteId && !hostelRoomId && !feeGroupId) {
      setFees(null);
      return;
    }
    api('/admissions/fee-preview', {
      method: 'POST',
      body: { classId: form.classId, choices: { transportRouteId, hostelRoomId, feeGroupId } },
    })
      .then(setFees)
      .catch(() => setFees(null));
  }, [form.classId, transportRouteId, hostelRoomId, feeGroupId]);
  const pick = (k, v) => setForm((f) => ({ ...f, choices: { ...f.choices, [k]: v } }));
  const pickElective = (group, id) =>
    setForm((f) => {
      const others = f.choices.electiveIds.filter(
        (x) => !group.subjects.some((sub) => sub.classSubjectId === x),
      );
      return { ...f, choices: { ...f.choices, electiveIds: id ? [...others, Number(id)] : others } };
    });
  const toggleActivity = (id) =>
    setForm((f) => ({
      ...f,
      choices: {
        ...f.choices,
        activityIds: f.choices.activityIds.includes(id)
          ? f.choices.activityIds.filter((x) => x !== id)
          : [...f.choices.activityIds, id],
      },
    }));

  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
    api('/academic-years')
      .then((ys) => {
        setYears(ys);
        if (!routeId)
          setForm((f) => ({
            ...f,
            academicYear: f.academicYear || ys.find((y) => y.isCurrent)?.name || ys[0]?.name || '',
          }));
      })
      .catch(() => {});
  }, [routeId]);
  useEffect(() => {
    if (!routeId) return;
    api(`/admissions/applications/${routeId}`)
      .then((a) => {
        setForm({
          ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, a[k] ?? EMPTY[k]])),
          choices: {
            ...NO_CHOICES,
            ...(a.choices ?? {}),
            transportRouteId: a.choices?.transportRouteId ?? '',
            transportStopId: a.choices?.transportStopId ?? '',
            hostelRoomId: a.choices?.hostelRoomId ?? '',
            feeGroupId: a.choices?.feeGroupId ?? '',
          },
        });
        setStatus(a.status);
        setAppNo(
          a.status === 'draft' || a.status === 'enquiry'
            ? null
            : `ADM-${String(a.enquiryOn ?? a.createdAt).slice(0, 4)}-${String(a.id).padStart(4, '0')}`,
        );
        if (a.status === 'enrolled')
          setError('This applicant is already enrolled. Edit the student record instead.');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [routeId]);

  const docs = useDocuments('application', id, { ensureId: () => saveDraft({ quiet: true }) }); // eslint-disable-line no-use-before-define
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const locked = ['enrolled', 'rejected'].includes(status);
  const className = classes.find((c) => String(c.id) === String(form.classId));
  const gradeLabel = className ? `${className.name}-${className.section}` : 'Not selected';

  /** Saves what is typed so far. A new draft gets its record number, and the address moves to that record. */
  const saveDraft = async ({ quiet = false } = {}) => {
    if (!id && !form.firstName.trim()) {
      setError('Enter the first name before saving a draft.');
      return null;
    }
    setError('');
    const body = { ...form };
    const savedId = id ?? (await api('/admissions/applications', { method: 'POST', body })).id;
    if (id) await api(`/admissions/applications/${id}`, { method: 'PUT', body });
    if (!id) {
      setId(String(savedId));
      if (!embedded) window.history.replaceState(window.history.state, '', `/applications/${savedId}`);
    } // new address for a reload, without remounting the form
    if (photo) {
      try {
        await savePhoto('enquiry', savedId, photo);
        setPhoto(null);
      } catch (err) {
        setError(`The photo was not saved (${err.message}); choose it again.`);
      }
    }
    if (!quiet) setNotice('Draft saved. You can come back and finish it later.');
    return savedId;
  };
  const run = async (fn) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const next = (e) => {
    e.preventDefault();
    run(async () => {
      if ((await saveDraft({ quiet: true })) !== null) {
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
        if (!embedded) window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };
  const submit = () =>
    run(async () => {
      if (!formEl.current?.reportValidity()) return;
      const savedId = await saveDraft({ quiet: true });
      if (savedId === null) return;
      await api(`/admissions/applications/${savedId}/submit`, { method: 'POST', body: { ...form, consent } });
      if (embedded) onDone('Application submitted. It is now under review.');
      else nav('/applications', { state: { notice: 'Application submitted. It is now under review.' } });
    });

  if (loading) return <p>Loading…</p>;
  const last = step === STEPS.length - 1;
  const row = (label, value) => (
    <div className="summaryline">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );

  return (
    <div className="application-page">
      {!embedded && (
        <Link className="back-link" to="/applications">
          ←&nbsp; Back to applications
        </Link>
      )}
      <div className="profile-head" style={embedded ? undefined : { marginTop: 10 }}>
        <div>
          {!embedded && <h1>Student application</h1>}
          <p className="hint">Complete the application details to continue the admission process.</p>
        </div>
        <span className="ref-badge">
          {appNo ?? `APPLICATION · ${status === 'enquiry' ? 'FROM ENQUIRY' : 'DRAFT'}`}
        </span>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <ol className="app-progress card" aria-label="Application steps">
        {STEPS.map(([title, sub], i) => (
          <li key={title} className={i === step ? 'current' : i < step ? 'done' : ''}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i >= step}
              aria-current={i === step ? 'step' : undefined}
            >
              <span className="num">{i < step ? '✓' : i + 1}</span>
              <span>
                <strong>{title}</strong>
                <small>{sub}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="app-layout">
        <form ref={formEl} onSubmit={next} className="enquiry-form">
          <fieldset disabled={locked || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {step === 0 && (
              <FormSection
                title="Student details"
                glyph="♙"
                tone="blue"
                sub="Enter the student's legal information"
              >
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
                  <span>First name *</span>
                  <input
                    value={form.firstName}
                    onChange={set('firstName')}
                    placeholder="First name"
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  <span>Last name *</span>
                  <input
                    value={form.lastName}
                    onChange={set('lastName')}
                    placeholder="Last name"
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  <span>Date of birth *</span>
                  <input type="date" value={form.dob} onChange={set('dob')} max={today()} required />
                </label>
                <label>
                  <span>Gender</span>
                  <select value={form.gender} onChange={set('gender')}>
                    <option value="">Select gender</option>
                    {Object.entries(GENDER).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
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
                </label>
                <label>
                  <span>Academic year *</span>
                  <select
                    value={form.academicYear}
                    onChange={set('academicYear')}
                    required={years.length > 0}
                  >
                    <option value="">Select year</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.name}>
                        {y.name.replace('-', ' – ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Nationality</span>
                  <MasterSelect
                    type="nationality"
                    value={form.nationality}
                    onChange={set('nationality')}
                    placeholder="e.g. Indian"
                  />
                </label>
                <label>
                  <span>Language spoken at home</span>
                  <MasterSelect
                    type="mother_tongue"
                    value={form.motherTongue}
                    onChange={set('motherTongue')}
                    placeholder="Select or enter language"
                  />
                </label>
              </FormSection>
            )}

            {step === 0 && <PersonalSection form={form} set={setField} hideNationality />}

            {step === 1 && (
              <FormSection
                title="Parent / guardian details"
                glyph="♧"
                tone="green"
                sub="At least one primary guardian is required"
              >
                <label>
                  <span>Primary guardian name *</span>
                  <input
                    value={form.guardianName}
                    onChange={set('guardianName')}
                    placeholder="Full name"
                    required
                    maxLength={120}
                  />
                </label>
                <label>
                  <span>Relationship to student *</span>
                  <MasterSelect
                    type="relation"
                    value={form.guardianRelation}
                    onChange={set('guardianRelation')}
                    placeholder="Select relationship"
                    required
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
                    value={form.guardianEmail}
                    onChange={set('guardianEmail')}
                    placeholder="name@example.com"
                    maxLength={150}
                  />
                </label>
                <label>
                  <span>Secondary guardian (optional)</span>
                  <input
                    value={form.secondaryGuardianName}
                    onChange={set('secondaryGuardianName')}
                    placeholder="Full name"
                    maxLength={120}
                  />
                </label>
                <label>
                  <span>Secondary contact</span>
                  <input
                    type="tel"
                    value={form.secondaryGuardianPhone}
                    onChange={set('secondaryGuardianPhone')}
                    placeholder="Phone number"
                    maxLength={20}
                  />
                </label>
                <label className="wide">
                  <span>Residential address *</span>
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={set('address')}
                    placeholder="Street, area, city, state and postal code"
                    required
                    maxLength={255}
                  />
                </label>
              </FormSection>
            )}

            {step === 1 && (
              <>
                <ParentDetailsSection form={form} set={setField} />
                <ContactDetailsSection form={form} set={setField} />
                <LocalGuardianSection form={form} set={setField} />
                <SiblingsSection form={form} set={setField} />
                <AddressSections form={form} set={setField} setForm={setForm} skipAddress />
              </>
            )}

            {step === 2 && (
              <FormSection
                title="Previous schooling"
                glyph="▤"
                tone="violet"
                sub="Current or most recent school attended"
              >
                <label>
                  <span>Previous school</span>
                  <input
                    value={form.previousSchool}
                    onChange={set('previousSchool')}
                    placeholder="School name"
                    maxLength={160}
                  />
                </label>
                <label>
                  <span>Last grade completed</span>
                  <select value={form.previousClass} onChange={set('previousClass')}>
                    <option value="">Select grade</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Transfer certificate no.</span>
                  <input
                    value={form.previousTcNo}
                    onChange={set('previousTcNo')}
                    placeholder="If available"
                    maxLength={40}
                  />
                </label>
                <label>
                  <span>Known learning or medical needs</span>
                  <input
                    value={form.specialNeeds}
                    onChange={set('specialNeeds')}
                    placeholder="Optional"
                    maxLength={255}
                  />
                </label>
                <div className="wide" style={{ gridColumn: '1 / -1' }}>
                  <DocumentSlots docs={docs} disabled={locked} />
                </div>
              </FormSection>
            )}

            {step === 2 && <QualificationSection form={form} set={setField} />}

            {step === 2 && (
              <FormSection
                title="Subjects, activities & services"
                glyph="✦"
                tone="green"
                sub="What the family would like for the student. These are set up when the student is enrolled."
              >
                {options.groups.map((g) => (
                  <label key={g.name}>
                    <span>{g.name} (elective)</span>
                    <select
                      value={
                        g.subjects.find((x) => form.choices.electiveIds.includes(x.classSubjectId))
                          ?.classSubjectId ?? ''
                      }
                      onChange={(e) => pickElective(g, e.target.value)}
                    >
                      <option value="">Decide later</option>
                      {g.subjects.map((x) => (
                        <option key={x.classSubjectId} value={x.classSubjectId}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                {!form.classId && (
                  <p className="hint wide" style={{ gridColumn: '1 / -1' }}>
                    Choose the grade on the first step to see its electives.
                  </p>
                )}
                {form.classId && !options.groups.length && (
                  <p className="hint wide" style={{ gridColumn: '1 / -1' }}>
                    This grade has no electives.
                  </p>
                )}
                <label>
                  <span>Transport route</span>
                  <select
                    value={form.choices.transportRouteId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        choices: { ...form.choices, transportRouteId: e.target.value, transportStopId: '' },
                      })
                    }
                  >
                    <option value="">No transport</option>
                    {options.routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {r.monthlyFee}/month
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Pickup stop</span>
                  <select
                    value={form.choices.transportStopId}
                    onChange={(e) => pick('transportStopId', e.target.value)}
                    disabled={!form.choices.transportRouteId}
                    required={Boolean(form.choices.transportRouteId)}
                  >
                    <option value="">Choose a stop</option>
                    {options.stops
                      .filter((x) => String(x.routeId) === String(form.choices.transportRouteId))
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.sequence}. {x.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span>Fee group</span>
                  <select
                    value={form.choices.feeGroupId}
                    onChange={(e) => pick('feeGroupId', e.target.value)}
                  >
                    <option value="">None</option>
                    {options.feeGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} · {g.total}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check-row">
                  <span className="check-list">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.choices.needsHostel}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            choices: {
                              ...form.choices,
                              needsHostel: e.target.checked,
                              hostelRoomId: e.target.checked ? form.choices.hostelRoomId : '',
                            },
                          })
                        }
                      />{' '}
                      Needs a hostel bed
                    </label>
                  </span>
                </label>
                {form.choices.needsHostel && (
                  <label>
                    <span>Preferred hostel room</span>
                    <select
                      value={form.choices.hostelRoomId}
                      onChange={(e) => pick('hostelRoomId', e.target.value)}
                    >
                      <option value="">Decide later</option>
                      {options.rooms
                        .filter((r) => r.occupied < r.capacity)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.hostelName} · room {r.roomNo} · {r.capacity - r.occupied} bed(s) free ·{' '}
                            {r.monthlyFee}/month
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {options.activities.length > 0 && (
                  <div className="wide" style={{ gridColumn: '1 / -1' }}>
                    <span className="field-title">Activities and clubs</span>
                    <span className="check-list">
                      {options.activities
                        .filter((a) => !a.classId || String(a.classId) === String(form.classId))
                        .map((a) => (
                          <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={form.choices.activityIds.includes(a.id)}
                              onChange={() => toggleActivity(a.id)}
                              style={{ width: 'auto', minHeight: 0 }}
                            />{' '}
                            {a.title}
                            {Number(a.fee) > 0 && <small> · fee {a.fee}</small>}
                          </label>
                        ))}
                    </span>
                  </div>
                )}
                {fees && fees.items.length > 0 && (
                  <div className="wide" style={{ gridColumn: '1 / -1' }}>
                    <span className="field-title">Fees for this admission</span>
                    <table className="enquiry-table no-sno">
                      <tbody>
                        {fees.items.map((i) => (
                          <tr key={`${i.source}-${i.title}`}>
                            <td>
                              {i.title}
                              <small className="block">{i.source}</small>
                            </td>
                            <td style={{ textAlign: 'right' }}>{Number(i.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td>
                            <b>Billed at enrolment</b>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <b>{fees.oneTime}</b>
                          </td>
                        </tr>
                        {Number(fees.monthly) > 0 && (
                          <tr>
                            <td>
                              <b>Monthly (transport and hostel)</b>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <b>{fees.monthly}</b>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </FormSection>
            )}

            {step === 3 && (
              <>
                <FormSection
                  title="Additional information"
                  glyph="▧"
                  tone="amber"
                  sub="Help us understand the student's interests and needs"
                >
                  <label>
                    <span>How did you hear about us?</span>
                    <select value={form.source} onChange={set('source')}>
                      <option value="">Select source</option>
                      {SOURCES.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Referred by</span>
                    <input
                      value={form.referredBy}
                      onChange={set('referredBy')}
                      placeholder="Person or organization"
                      maxLength={100}
                    />
                  </label>
                  <label className="wide">
                    <span>Notes for admissions team</span>
                    <textarea
                      rows={3}
                      value={form.remarks}
                      onChange={set('remarks')}
                      placeholder="Share any relevant information..."
                      maxLength={255}
                    />
                  </label>
                </FormSection>
                <OfficialSection form={form} set={setField} />
                <section className="card review">
                  <header className="card-head">
                    <span className="tile-icon blue" aria-hidden="true">
                      ✓
                    </span>
                    <span>
                      <h2>Review</h2>
                      <small>
                        Check everything before you submit. Use the steps above to go back and change
                        anything.
                      </small>
                    </span>
                  </header>
                  <div className="review-grid">
                    <div>
                      <h4>Student</h4>
                      {row('Name', `${form.firstName} ${form.lastName}`.trim())}
                      {row('Date of birth', niceDate(form.dob))}
                      {row('Gender', GENDER[form.gender])}
                      {row('Grade', gradeLabel === 'Not selected' ? '' : gradeLabel)}
                      {row('Academic year', form.academicYear)}
                      {row('Nationality', form.nationality)}
                      {row('Home language', form.motherTongue)}
                    </div>
                    <div>
                      <h4>Guardians</h4>
                      {row('Primary guardian', form.guardianName)}
                      {row('Relationship', form.guardianRelation)}
                      {row('Phone', form.guardianPhone)}
                      {row('Email', form.guardianEmail)}
                      {row(
                        'Siblings',
                        (form.siblings ?? [])
                          .map((x) => x.name)
                          .filter(Boolean)
                          .join(', '),
                      )}
                      {row('Secondary guardian', form.secondaryGuardianName)}
                      {row('Secondary contact', form.secondaryGuardianPhone)}
                      {row('Address', form.address)}
                    </div>
                    <div>
                      <h4>Schooling</h4>
                      {row(
                        'Electives',
                        options.groups
                          .flatMap((g) => g.subjects)
                          .filter((x) => form.choices.electiveIds.includes(x.classSubjectId))
                          .map((x) => x.name)
                          .join(', '),
                      )}
                      {row(
                        'Activities',
                        options.activities
                          .filter((a) => form.choices.activityIds.includes(a.id))
                          .map((a) => a.title)
                          .join(', '),
                      )}
                      {row(
                        'Transport',
                        options.routes.find((r) => String(r.id) === String(form.choices.transportRouteId))
                          ?.name,
                      )}
                      {row(
                        'Hostel',
                        form.choices.needsHostel
                          ? options.rooms.find((r) => String(r.id) === String(form.choices.hostelRoomId))
                            ? `${options.rooms.find((r) => String(r.id) === String(form.choices.hostelRoomId)).hostelName}, room ${options.rooms.find((r) => String(r.id) === String(form.choices.hostelRoomId)).roomNo}`
                            : 'Bed requested'
                          : '',
                      )}
                      {row(
                        'Fees at enrolment',
                        fees && fees.items.length
                          ? `${fees.oneTime}${Number(fees.monthly) > 0 ? ` + ${fees.monthly}/month` : ''}`
                          : '',
                      )}
                      {row(
                        'Fee group',
                        options.feeGroups.find((g) => String(g.id) === String(form.choices.feeGroupId))?.name,
                      )}
                      {row('Previous school', form.previousSchool)}
                      {row('Last grade', form.previousClass)}
                      {row('Transfer certificate', form.previousTcNo)}
                      {row('Needs', form.specialNeeds)}
                      {row(
                        'Documents',
                        docs.files.length
                          ? `${docs.files.length} file${docs.files.length > 1 ? 's' : ''}`
                          : '',
                      )}
                      {docs.missing.length ? row('Still needed', docs.missing.join(', ')) : null}
                    </div>
                  </div>
                </section>
              </>
            )}
          </fieldset>

          <div className="app-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => (embedded ? onClose() : nav('/applications'))}
            >
              Cancel
            </button>
            <span className="spacer" />
            {step > 0 && (
              <button type="button" className="ghost" onClick={() => setStep(step - 1)} disabled={busy}>
                ← Back
              </button>
            )}
            {!locked && (
              <button type="button" className="ghost" onClick={() => run(saveDraft)} disabled={busy}>
                Save draft
              </button>
            )}
            {!last && !locked && (
              <button type="submit" disabled={busy}>
                Continue to {STEPS[step + 1][0].toLowerCase()} →
              </button>
            )}
            {last && !locked && (
              <button
                type="button"
                onClick={submit}
                disabled={busy || !consent || docs.missing.length > 0}
                title={
                  docs.missing.length
                    ? `Upload: ${docs.missing.join(', ')}`
                    : consent
                      ? ''
                      : 'Tick the confirmation first'
                }
              >
                {busy ? 'Submitting…' : 'Submit application'}
              </button>
            )}
          </div>
        </form>

        <aside className="app-aside">
          <div className="card">
            <h3>Application summary</h3>
            {row('Application number', appNo ?? 'Assigned on submit')}
            {row('Academic year', form.academicYear ? form.academicYear.replace('-', ' – ') : '')}
            {row('Applying grade', gradeLabel)}
            <div className="summaryline">
              <span>Application status</span>
              <strong style={{ color: status === 'draft' || status === 'enquiry' ? '#b47a24' : undefined }}>
                {{
                  draft: 'Draft',
                  enquiry: 'Enquiry',
                  applied: 'Under review',
                  approved: 'Offer sent',
                  waitlisted: 'Waitlisted',
                  rejected: 'Closed',
                  enrolled: 'Enrolled',
                }[status] ?? status}
              </strong>
            </div>
          </div>
          <div className="card">
            <h3>Helpful information</h3>
            <p className="notice">
              Fields marked with <span className="req">*</span> are required. You can save a draft and return
              to finish the application later.
            </p>
            {!locked && (
              <label className="consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  I confirm the information provided is accurate and consent to the school contacting me about
                  this application.
                </span>
              </label>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
