import { useCallback, useEffect, useState } from 'react';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { api, fetchBlob } from '../../services/api.js';

const TONE = { verified: 'paid', rejected: 'unpaid', pending: 'partial' };
const LABEL = { verified: 'Verified', rejected: 'Sent back', pending: 'Not checked' };
const when = (d) =>
  d ? new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '';

/**
 * Document verification: for one student, each document the school asks for, whether it has been uploaded, and the office's
 * decision on it (verified, or sent back with a reason). Upload the files on the student's own page.
 */
export default function DocumentVerification() {
  const [studentId, setStudentId] = useState('');
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({}); // title -> { note }
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setEdits({});
    if (!studentId) return setData(null);
    api(`/document-checks?studentId=${studentId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [studentId]);
  useEffect(load, [load]);

  const noteOf = (r) => edits[r.title]?.note ?? r.note ?? '';

  const decide = async (r, status) => {
    setError('');
    setNotice('');
    setBusy(r.title);
    try {
      await api('/document-checks', {
        method: 'PUT',
        body: { studentId, title: r.title, status, note: noteOf(r) },
      });
      setNotice(`${r.title}: ${LABEL[status].toLowerCase()}.`);
      load();
    } catch (e) {
      setError(`${r.title}: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const open = async (r) => {
    try {
      const blob = await fetchBlob(`/student-files/${r.fileId}/download`);
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    } catch (e) {
      setError(e.message);
    }
  };

  const counts = data
    ? ['verified', 'rejected', 'pending'].map((s) => [s, data.rows.filter((r) => r.status === s).length])
    : [];
  const missing = data ? data.rows.filter((r) => r.required && !r.uploaded).length : 0;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Document verification</h1>
          <p className="hint">
            Check each document a student has handed in. A document can be verified only once it has been
            uploaded, and sending one back needs a reason. If a file is uploaded again after it was checked,
            it is flagged for a fresh look.
          </p>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="card enquiry-card" style={{ padding: 14, marginBottom: 12 }}>
        <label>
          <span>Student</span>
          <TypeaheadSelect
            kind="students"
            value={studentId}
            onChange={(id) => setStudentId(id ? String(id) : '')}
            filters={{ status: 'active' }}
            placeholder="Find a student by name or admission no…"
          />
        </label>
      </section>

      {data && (
        <section className="card enquiry-card">
          <div className="toolbar">
            <b>
              {data.student.name} · {data.student.admissionNo}
            </b>{' '}
            · {counts.map(([s, n]) => `${n} ${LABEL[s].toLowerCase()}`).join(' · ')}
            {missing > 0 && <span className="badge partial"> {missing} required not uploaded</span>}
          </div>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.title}>
                    <td>
                      <b>{r.title}</b>
                      {r.required && <small style={{ display: 'block' }}>required</small>}
                    </td>
                    <td>
                      {r.uploaded ? (
                        <>
                          <button type="button" className="link" onClick={() => open(r)}>
                            {r.fileName}
                          </button>
                          <small style={{ display: 'block' }}>{when(r.uploadedOn)}</small>
                        </>
                      ) : (
                        <span className="hint">not uploaded</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${TONE[r.status]}`}>{LABEL[r.status]}</span>
                      {r.checkedByName && (
                        <small style={{ display: 'block' }}>
                          {r.checkedByName} · {when(r.checkedOn)}
                        </small>
                      )}
                      {r.changedSinceCheck && (
                        <small style={{ display: 'block' }} className="error">
                          File changed after the check
                        </small>
                      )}
                    </td>
                    <td>
                      <input
                        value={noteOf(r)}
                        onChange={(e) => setEdits({ ...edits, [r.title]: { note: e.target.value } })}
                        maxLength={300}
                        placeholder="Reason, if sent back"
                        aria-label={`Note for ${r.title}`}
                      />
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy === r.title || !r.uploaded}
                        onClick={() => decide(r, 'verified')}
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        disabled={busy === r.title}
                        onClick={() => decide(r, 'rejected')}
                      >
                        Send back
                      </button>
                      {r.status !== 'pending' && (
                        <button
                          type="button"
                          className="ghost"
                          disabled={busy === r.title}
                          onClick={() => decide(r, 'pending')}
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!data.rows.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      The school has not listed any required documents. Add them under Master data, Student
                      documents.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {!data && <p className="hint">Choose a student to see their documents.</p>}
    </>
  );
}
