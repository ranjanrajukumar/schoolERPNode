import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const TABS = [
  ['pending', 'Pending'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['all', 'All requests'],
];
const PILL = { accepted: 'paid', rejected: 'rejected', pending: 'partial' };
const LABEL = { accepted: 'Accepted', rejected: 'Rejected', pending: 'Pending' };
const EMPTY = { examId: '', studentId: '', subjectId: '', reason: '' };
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, hint, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="tile card tile-button" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="tile card">{body}</div>
  );
}

/** Revaluation requests: parents ask from the portal, staff can log one; accepting corrects the mark and keeps the original. */
export default function Revaluation() {
  const canDecide = useAuth().user?.role === 'admin';
  const [all, setAll] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [popup, setPopup] = useState(null); // { kind: 'log' | 'accept' | 'reject', row? }
  const [decision, setDecision] = useState({ marks: '', remarks: '' });
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openLog(), canDecide); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/exams/revaluations')
      .then(setAll)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    api('/exams')
      .then(setExams)
      .catch(() => {});
    api('/subjects')
      .then(setSubjects)
      .catch(() => {});
  }, [load]);

  // Only students of the chosen exam's class can be picked.
  const examClassId = exams.find((e) => String(e.id) === String(form.examId))?.classId ?? '';
  const close = () => setPopup(null);
  const run = async (fn, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(message);
      load();
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const openLog = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
    setPopup({ kind: 'log' });
  };
  const openAccept = (r) => {
    setError('');
    setDecision({ marks: String(r.originalMarks), remarks: '' });
    setPopup({ kind: 'accept', row: r });
  };
  const openReject = (r) => {
    setError('');
    setDecision({ marks: '', remarks: '' });
    setPopup({ kind: 'reject', row: r });
  };

  const log = (e) => {
    e.preventDefault();
    run(() => api('/exams/revaluations', { method: 'POST', body: form }), 'Request recorded.');
  };
  const accept = (e) => {
    e.preventDefault();
    run(
      () =>
        api(`/exams/revaluations/${popup.row.id}/accept`, {
          method: 'POST',
          body: { newMarks: decision.marks, remarks: decision.remarks },
        }),
      'Mark updated; results and report cards now show it.',
    );
  };
  const reject = (e) => {
    e.preventDefault();
    run(
      () =>
        api(`/exams/revaluations/${popup.row.id}/reject`, {
          method: 'POST',
          body: { remarks: decision.remarks },
        }),
      'Request rejected; the mark stays as it was.',
    );
  };

  const count = (k) => (k === 'all' ? all.length : all.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = all.filter(
    (r) =>
      (tab === 'all' || r.status === tab) &&
      (!needle ||
        `${r.studentName} ${r.admissionNo} ${r.examName} ${r.subjectName}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const changed = all.filter((r) => r.status === 'accepted' && r.newMarks !== null);
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const exportCsv = () => {
    const head = [
      'Student',
      'Admission no',
      'Exam',
      'Subject',
      'Original',
      'Revised',
      'Max',
      'Reason',
      'Status',
      'Decided by',
    ];
    const lines = shown.map((r) =>
      [
        r.studentName,
        r.admissionNo,
        r.examName,
        r.subjectName,
        r.originalMarks,
        r.newMarks,
        r.maxMarks,
        r.reason,
        r.status,
        r.decidedByName,
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const l = document.createElement('a');
    l.href = url;
    l.download = 'revaluation-requests.csv';
    document.body.appendChild(l);
    l.click();
    l.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Revaluation requests</h1>
          <p className="hint">
            Parents can ask for a recheck from the portal; staff can also log one. Accepting corrects the mark
            on the exam and keeps the original on this record.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={exportCsv}>
            ↓ Export
          </button>
          {canDecide && (
            <button type="button" className="big-action" onClick={openLog}>
              ＋ Log a request
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !popup && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Requests" value={all.length} onClick={() => goTab('all')} />
        <Tile
          icon="◷"
          tone="amber"
          label="Pending"
          value={count('pending')}
          hint={canDecide && count('pending') ? 'Waiting for a decision' : null}
          onClick={() => goTab('pending')}
        />
        <Tile
          icon="✓"
          tone="green"
          label="Accepted"
          value={count('accepted')}
          hint={changed.length ? `${changed.length} mark${changed.length > 1 ? 's' : ''} changed` : null}
          onClick={() => goTab('accepted')}
        />
        <Tile
          icon="×"
          tone="red"
          label="Rejected"
          value={count('rejected')}
          onClick={() => goTab('rejected')}
        />
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
              onClick={() => goTab(k)}
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
              placeholder="Search student, exam or subject…"
              aria-label="Search requests"
            />
          </label>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, shown.length)}
            </b>{' '}
            of <b>{shown.length}</b>
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Original</th>
                <th>Revised</th>
                <th>Reason</th>
                <th>Status</th>
                {canDecide && <th />}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.studentName}</b>
                    <small className="block">{r.admissionNo}</small>
                  </td>
                  <td>{r.examName}</td>
                  <td>{r.subjectName}</td>
                  <td>
                    {r.originalMarks} / {r.maxMarks}
                  </td>
                  <td>{r.newMarks ?? '—'}</td>
                  <td>
                    {r.reason}
                    {r.remarks && (
                      <small className="block">
                        {r.remarks}
                        {r.decidedByName && ` — ${r.decidedByName}`}
                      </small>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${PILL[r.status]}`}>● {LABEL[r.status]}</span>
                  </td>
                  {canDecide && (
                    <td className="row-actions">
                      {r.status === 'pending' && (
                        <button type="button" onClick={() => openAccept(r)}>
                          Accept
                        </button>
                      )}
                      {r.status === 'pending' && (
                        <button type="button" className="ghost danger" onClick={() => openReject(r)}>
                          Reject
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={canDecide ? 8 : 7} className="empty-row">
                    {needle || tab !== 'all' ? 'No requests match.' : 'No requests yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal
        open={Boolean(popup)}
        title={
          { log: 'Log a revaluation request', accept: 'Accept revaluation', reject: 'Reject revaluation' }[
            popup?.kind
          ] ?? ''
        }
        wide={false}
        onClose={close}
      >
        {popup?.kind === 'log' && (
          <form onSubmit={log} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              <label className="wide">
                <span>Exam *</span>
                <select
                  value={form.examId}
                  onChange={(e) => setForm({ ...form, examId: e.target.value, studentId: '' })}
                  required
                >
                  <option value="">Choose an exam</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.className})
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                <span>Student *</span>
                <TypeaheadSelect
                  kind="students"
                  value={form.studentId}
                  onChange={(id) => setForm({ ...form, studentId: id })}
                  filters={{ classId: examClassId }}
                  disabled={!form.examId}
                  required
                />
              </label>
              <label>
                <span>Subject *</span>
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  required
                >
                  <option value="">Choose a subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                <span>Reason *</span>
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  required
                  maxLength={255}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Log request'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'accept' && (
          <form onSubmit={accept} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              {popup.row.studentName} · {popup.row.subjectName} in {popup.row.examName}. The mark was{' '}
              <b>{popup.row.originalMarks}</b> out of {popup.row.maxMarks}.
            </p>
            <div className="enq-grid">
              <label>
                <span>Revised mark *</span>
                <input
                  type="number"
                  min="0"
                  max={popup.row.maxMarks}
                  step="0.5"
                  value={decision.marks}
                  onChange={(e) => setDecision({ ...decision, marks: e.target.value })}
                  required
                />
              </label>
              <label className="wide">
                <span>Note on the change</span>
                <input
                  value={decision.remarks}
                  onChange={(e) => setDecision({ ...decision, remarks: e.target.value })}
                  maxLength={255}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Update the mark'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'reject' && (
          <form onSubmit={reject} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <p className="hint">
              Say why {popup.row.studentName}&apos;s {popup.row.subjectName} mark stays unchanged.
            </p>
            <div className="enq-grid">
              <label className="wide">
                <span>Reason *</span>
                <input
                  value={decision.remarks}
                  onChange={(e) => setDecision({ ...decision, remarks: e.target.value })}
                  required
                  maxLength={255}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="danger" disabled={busy}>
                {busy ? 'Saving…' : 'Reject request'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
