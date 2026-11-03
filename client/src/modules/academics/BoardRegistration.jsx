import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const STATUS = { pending: 'Pending', submitted: 'Submitted to the board', registered: 'Registered' };

/**
 * Board registration: for a class, each student's registration number, roll number, exam year and status with the board
 * the class follows. The board is the class's own, so a student cannot be registered with another board's records.
 * The register exports as a spreadsheet for the board's or the government's returns.
 */
export default function BoardRegistration() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({}); // studentId -> changed fields, not yet saved
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch((e) => setError(e.message));
  }, []);

  const load = (id = classId) => {
    setEdits({});
    if (!id) return setData(null);
    api(`/board-registration?classId=${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const value = (r, k) => edits[r.studentId]?.[k] ?? r[k] ?? '';
  const change = (r, k, v) => setEdits({ ...edits, [r.studentId]: { ...edits[r.studentId], [k]: v } });

  const save = async (r) => {
    setError('');
    setNotice('');
    setBusy(r.studentId);
    try {
      await api(`/board-registration/${r.studentId}`, {
        method: 'PUT',
        body: {
          registrationNo: value(r, 'registrationNo'),
          rollNo: value(r, 'rollNo'),
          examYear: value(r, 'examYear'),
          status: value(r, 'status'),
        },
      });
      setNotice(`Saved ${r.name}.`);
      load();
    } catch (e) {
      setError(`${r.name}: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const exportCsv = () => {
    const head = [
      'Board',
      'Class',
      'Admission no',
      'Student',
      'Date of birth',
      'Gender',
      'Guardian',
      'Registration no',
      'Roll no',
      'Exam year',
      'Status',
    ];
    const lines = data.rows.map((r) =>
      [
        data.board.name,
        data.className,
        r.admissionNo,
        r.name,
        r.dob,
        r.gender,
        r.guardianName,
        r.registrationNo,
        r.rollNo,
        r.examYear,
        STATUS[r.status],
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob(['﻿' + [head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `board-register-${data.board.name}-${data.className}.csv`.replace(/\s+/g, '-');
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = data
    ? ['pending', 'submitted', 'registered'].map((s) => [s, data.rows.filter((r) => r.status === s).length])
    : [];

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Board registration</h1>
          <p className="hint">
            Record the registration number the board issued to each student, with their roll number and exam
            year. The board is the one the class follows, so CBSE and UP Board students are never mixed.
            Export the register for the board’s or the government’s returns.
          </p>
        </div>
        <div className="head-actions">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            aria-label="Class"
            style={{ minHeight: 44 }}
          >
            <option value="">-- choose class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section} · {c.board}
              </option>
            ))}
          </select>
          {data && (
            <button type="button" className="ghost" onClick={exportCsv} disabled={!data.rows.length}>
              Export register (CSV)
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {data && (
        <section className="card enquiry-card">
          <div className="toolbar">
            <b>{data.board.name}</b> · {data.className} · {counts.map(([s, n]) => `${n} ${s}`).join(' · ')}
          </div>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Admission no</th>
                  <th>Student</th>
                  <th>Registration no</th>
                  <th>Roll no</th>
                  <th>Exam year</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.studentId}>
                    <td>{r.admissionNo}</td>
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td>
                      <input
                        value={value(r, 'registrationNo')}
                        onChange={(e) => change(r, 'registrationNo', e.target.value)}
                        maxLength={40}
                        aria-label={`Registration no of ${r.name}`}
                      />
                    </td>
                    <td>
                      <input
                        value={value(r, 'rollNo')}
                        onChange={(e) => change(r, 'rollNo', e.target.value)}
                        maxLength={40}
                        style={{ width: 120 }}
                        aria-label={`Roll no of ${r.name}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={value(r, 'examYear')}
                        onChange={(e) => change(r, 'examYear', e.target.value)}
                        style={{ width: 90 }}
                        aria-label={`Exam year of ${r.name}`}
                      />
                    </td>
                    <td>
                      <select
                        value={value(r, 'status')}
                        onChange={(e) => change(r, 'status', e.target.value)}
                      >
                        {Object.entries(STATUS).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="ghost"
                        disabled={!edits[r.studentId] || busy === r.studentId}
                        onClick={() => save(r)}
                      >
                        {busy === r.studentId ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!data.rows.length && (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      No active students in this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {!data && <p className="hint">Choose a class to see its students.</p>}
    </>
  );
}
