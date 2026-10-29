import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const FIELDS = [
  ['bloodGroup', 'Blood group', 'select'],
  ['heightCm', 'Height (cm)', 'number'],
  ['weightKg', 'Weight (kg)', 'number'],
  ['allergies', 'Allergies'],
  ['conditions', 'Medical conditions'],
  ['medications', 'Regular medication'],
  ['emergencyName', 'Emergency contact'],
  ['emergencyPhone', 'Emergency phone'],
  ['doctorName', 'Doctor'],
  ['doctorPhone', 'Doctor phone'],
  ['notes', 'Notes', 'wide'],
];
const TABS = [
  ['all', 'All alerts'],
  ['allergies', 'Allergies'],
  ['conditions', 'Conditions'],
  ['medications', 'Medication'],
];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </div>
  );
}

/** Health records: the medical alerts of active students, and a popup to record or update one student's record. */
export default function HealthRecords() {
  const [params, setParams] = useSearchParams();
  const [alerts, setAlerts] = useState([]);
  const [studentId, setStudentId] = useState(params.get('studentId') ?? '');
  const [entry, setEntry] = useState(Boolean(params.get('studentId')));
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAlerts = () =>
    api('/student-health')
      .then(setAlerts)
      .catch((e) => setError(e.message));
  useEffect(() => {
    loadAlerts();
  }, []);
  useEffect(() => {
    if (params.get('studentId')) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!studentId) {
      setForm({});
      return;
    }
    api(`/student-health/${studentId}`)
      .then((h) => setForm(Object.fromEntries(FIELDS.map(([k]) => [k, h[k] ?? '']))))
      .catch((e) => setError(e.message));
  }, [studentId]);

  const openFor = (id) => {
    setError('');
    setNotice('');
    setStudentId(id ? String(id) : '');
    setEntry(true);
  };
  useOpenNew(() => openFor(''));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(`/student-health/${studentId}`, { method: 'PUT', body: form });
      setNotice('Health record saved.');
      setEntry(false);
      loadAlerts();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const count = (k) => (k === 'all' ? alerts.length : alerts.filter((a) => a[k]).length);
  const needle = q.trim().toLowerCase();
  const shown = alerts.filter(
    (a) =>
      (tab === 'all' || a[tab]) &&
      (!needle ||
        `${a.name} ${a.admissionNo} ${a.className ?? ''} ${a.allergies ?? ''} ${a.conditions ?? ''} ${a.medications ?? ''}`
          .toLowerCase()
          .includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Student health records</h1>
          <p className="hint">
            Medical alerts of active students: an allergy, a condition or regular medication.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="big-action" onClick={() => openFor('')}>
            + Add health record
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="!" tone="red" label="Students with alerts" value={alerts.length} />
        <Tile icon="✿" tone="amber" label="Allergies" value={count('allergies')} />
        <Tile icon="♥" tone="violet" label="Medical conditions" value={count('conditions')} />
        <Tile icon="✚" tone="blue" label="On regular medication" value={count('medications')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
            >
              {l}
              <span className="count">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, class or condition…"
              aria-label="Search health alerts"
            />
          </label>
          <span className="showing">{shown.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Blood</th>
                <th>Allergies</th>
                <th>Conditions</th>
                <th>Medication</th>
                <th>Emergency contact</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.studentId}>
                  <td>
                    <b>{a.name}</b>
                    <small className="block">{a.admissionNo}</small>
                  </td>
                  <td>{a.className ?? '—'}</td>
                  <td>{a.bloodGroup || '—'}</td>
                  <td>{a.allergies || '—'}</td>
                  <td>{a.conditions || '—'}</td>
                  <td>{a.medications || '—'}</td>
                  <td>
                    {a.emergencyName || '—'}
                    {a.emergencyPhone && <small className="block">{a.emergencyPhone}</small>}
                  </td>
                  <td className="row-actions">
                    <button type="button" className="ghost" onClick={() => openFor(a.studentId)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {needle || tab !== 'all' ? 'No alerts match.' : 'No alerts recorded.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Health record" onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Student *</span>
              <TypeaheadSelect
                kind="students"
                value={studentId}
                onChange={(id) => setStudentId(id ? String(id) : '')}
                required
              />
            </label>
            {studentId &&
              FIELDS.map(([key, label, kind]) => (
                <label key={key} className={kind === 'wide' ? 'wide' : undefined}>
                  <span>{label}</span>
                  {kind === 'select' ? (
                    <select
                      value={form[key] ?? ''}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    >
                      <option value="">--</option>
                      {BLOOD.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={kind === 'number' ? 'number' : 'text'}
                      step={kind === 'number' ? '0.1' : undefined}
                      value={form[key] ?? ''}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  )}
                </label>
              ))}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy || !studentId}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
