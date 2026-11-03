import { useState } from 'react';
import { api } from '../../services/api.js';
import { daysFromNow, localDate } from '../../utils/dates.js';

const REQUIRED = [
  ['classId', 'Grade applied for'],
  ['guardianName', 'Parent / guardian'],
  ['guardianPhone', 'Guardian phone'],
  ['dob', 'Date of birth'],
  ['gender', 'Gender'],
  ['academicYear', 'Academic year'],
];

/** The admission steps for one application, in order, with what is still missing at each step. */
export default function ApplicationProcess({ row, onEdit, onDone }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState({ testDate: row.testDate ?? '', testMaxMarks: 100 });
  const [interview, setInterview] = useState({
    interviewDate: row.interviewDate ?? '',
    interviewTime: '',
    interviewPanel: '',
  });
  const [expiry, setExpiry] = useState(row.offerExpiry ?? daysFromNow(14));

  const missing = REQUIRED.filter(([k]) => !row[k]).map(([, l]) => l);
  const stage = row.stage;
  const afterAssessment = ['offer', 'enrolled'].includes(stage);
  const assessed = Boolean(row.testDate || row.interviewDate) || afterAssessment;

  const run = async (fn, message) => {
    setError('');
    setBusy(true);
    try {
      const r = await fn();
      onDone(typeof message === 'function' ? message(r) : message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const put = (path, body) => api(`/admissions/${row.id}/${path}`, { method: 'PUT', body });
  const setT = (k) => (e) => setTest((t) => ({ ...t, [k]: e.target.value }));
  const setI = (k) => (e) => setInterview((t) => ({ ...t, [k]: e.target.value }));

  const saveAssessment = (e) => {
    e.preventDefault();
    const hasInterview = interview.interviewDate || interview.interviewTime || interview.interviewPanel;
    if (!test.testDate && !hasInterview) return setError('Set a test date or an interview first.');
    run(async () => {
      if (test.testDate) await put('test', test);
      if (hasInterview) await put('interview', interview);
    }, 'Assessment scheduled.');
  };
  const makeOffer = () =>
    run(async () => {
      await api(`/admissions/${row.id}/status`, { method: 'POST', body: { status: 'approved' } });
      if (expiry) await put('offer', { offerExpiry: expiry });
    }, 'Offer sent.');
  const reject = () =>
    run(
      () => api(`/admissions/${row.id}/status`, { method: 'POST', body: { status: 'rejected' } }),
      'Application closed.',
    );
  const enroll = () =>
    run(
      () => api(`/admissions/${row.id}/enroll`, { method: 'POST', body: {} }),
      (x) => `Enrolled as ${x.admissionNo}.`,
    );

  const step = (n, title, done, active, body) => (
    <li className={`proc-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
      <h3>
        <span className="proc-n">{done ? '✓' : n}</span> {title}
      </h3>
      {active && <div className="proc-body">{body}</div>}
    </li>
  );

  const inReview = stage === 'review' || stage === 'assessment';
  return (
    <div className="proc">
      <p>
        <b>{row.applicantName}</b> · {row.applicationId} · <span className="badge">{row.stageLabel}</span>
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ol className="proc-steps">
        {step(
          1,
          'Application details',
          !missing.length,
          inReview && missing.length > 0,
          <>
            <p className="error">Missing: {missing.join(', ')}</p>
            <button type="button" onClick={() => onEdit(row.id)}>
              Fill missing details
            </button>
          </>,
        )}
        {step(
          2,
          'Entrance test / interview',
          assessed,
          inReview,
          <form onSubmit={saveAssessment} className="enq-grid">
            <label>
              <span>Test date</span>
              <input type="date" value={test.testDate} onChange={setT('testDate')} />
            </label>
            <label>
              <span>Maximum marks</span>
              <input type="number" min="1" value={test.testMaxMarks} onChange={setT('testMaxMarks')} />
            </label>
            <label>
              <span>Interview date</span>
              <input type="date" value={interview.interviewDate} onChange={setI('interviewDate')} />
            </label>
            <label>
              <span>Interview time</span>
              <input type="time" value={interview.interviewTime} onChange={setI('interviewTime')} />
            </label>
            <label className="wide">
              <span>Interview panel</span>
              <input value={interview.interviewPanel} onChange={setI('interviewPanel')} />
            </label>
            <button type="submit" disabled={busy}>
              Save assessment
            </button>
          </form>,
        )}
        {step(
          3,
          'Offer',
          afterAssessment,
          inReview,
          <>
            <label>
              <span>Family must confirm by</span>
              <input
                type="date"
                min={localDate()}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </label>
            <button type="button" disabled={busy || !row.classId} onClick={makeOffer}>
              Make offer
            </button>
            {!row.classId && <small className="hint"> Choose the grade first.</small>}
          </>,
        )}
        {step(
          4,
          'Enroll',
          stage === 'enrolled',
          stage === 'offer',
          <>
            <p className="hint">Offer valid until {row.offerExpiry ?? '—'}.</p>
            <button type="button" disabled={busy} onClick={enroll}>
              Enroll student
            </button>
          </>,
        )}
      </ol>
      {(inReview || stage === 'offer') && (
        <button type="button" className="ghost danger" disabled={busy} onClick={reject}>
          Reject application
        </button>
      )}
    </div>
  );
}
