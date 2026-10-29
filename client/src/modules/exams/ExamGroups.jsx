import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PILL = { pass: 'paid', fail: 'rejected', incomplete: 'partial' };

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

/** Exam groups: several exams of one class (a unit test and a final, say) combined into one weighted result. */
export default function ExamGroups() {
  const canWrite = useAuth().user?.role === 'admin';
  const [groups, setGroups] = useState([]);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ classId: '', name: '' });
  const [entry, setEntry] = useState(false);
  const [open, setOpen] = useState(null); // group id whose combined results are showing
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), canWrite); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/exams/groups')
      .then(setGroups)
      .catch((e) => setError(e.message));
    api('/exams')
      .then(setExams)
      .catch(() => {});
  }, []);
  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
    load();
  }, [load]);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm({ classId: '', name: '' });
    setEntry(true);
  };
  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      await fn();
      if (message) setNotice(message);
      load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await run(() => api('/exams/groups', { method: 'POST', body: form }), 'Group created.'))
      setEntry(false);
    setBusy(false);
  };
  const remove = (g) => run(() => api(`/exams/groups/${g.id}`, { method: 'DELETE' }), 'Group deleted.');
  const assign = (examId, groupId, weight) =>
    run(() => api('/exams/assign', { method: 'POST', body: { examId, groupId, weight } }));
  const showResults = async (g) => {
    if (open === g.id) {
      setOpen(null);
      return;
    }
    try {
      setResults(await api(`/exams/groups/${g.id}/results`));
      setOpen(g.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const grouped = exams.filter((e) => e.examGroupId).length;
  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Exam groups</h1>
          <p className="hint">
            Combine several exams of one class into an overall result. Each exam carries a weight: 25 against
            75 means the second counts three times as much.
          </p>
        </div>
        <div className="head-actions">
          {canWrite && (
            <button type="button" className="big-action" onClick={openNew}>
              ＋ New group
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Groups" value={groups.length} />
        <Tile icon="✓" tone="green" label="Exams in a group" value={grouped} />
        <Tile icon="◷" tone="amber" label="Exams not grouped" value={exams.length - grouped} />
        <Tile
          icon="▧"
          tone="violet"
          label="Classes with groups"
          value={new Set(groups.map((g) => g.classId)).size}
        />
      </div>

      {groups.map((g) => {
        const candidates = exams.filter((e) => e.classId === g.classId && e.examGroupId !== g.id);
        return (
          <section className="card enquiry-card" key={g.id}>
            <header className="card-head" style={{ padding: '20px 22px 14px', marginBottom: 0 }}>
              <span>
                <h2>{g.name}</h2>
                <small>
                  {g.className} · {g.exams.length} exam{g.exams.length === 1 ? '' : 's'}
                </small>
              </span>
              <span className="group-actions">
                {g.exams.length > 0 && (
                  <button type="button" className="ghost" onClick={() => showResults(g)}>
                    {open === g.id ? 'Hide results' : 'Combined results'}
                  </button>
                )}
                {canWrite && (
                  <button type="button" className="ghost danger" onClick={() => remove(g)}>
                    Delete group
                  </button>
                )}
              </span>
            </header>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Weight</th>
                    {canWrite && <th />}
                  </tr>
                </thead>
                <tbody>
                  {g.exams.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <b>{e.name}</b>
                      </td>
                      <td>
                        {canWrite ? (
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            style={{ width: 90 }}
                            defaultValue={e.weight}
                            aria-label={`Weight of ${e.name}`}
                            onBlur={(ev) =>
                              Number(ev.target.value) !== e.weight && assign(e.id, g.id, ev.target.value)
                            }
                          />
                        ) : (
                          e.weight
                        )}
                      </td>
                      {canWrite && (
                        <td className="row-actions">
                          <button type="button" className="ghost danger" onClick={() => assign(e.id, null)}>
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!g.exams.length && (
                    <tr>
                      <td colSpan={canWrite ? 3 : 2} className="empty-row">
                        No exams in this group yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {canWrite && candidates.length > 0 && (
              <div className="toolbar" style={{ borderTop: '1px solid var(--border)' }}>
                <select
                  defaultValue=""
                  aria-label="Add an exam"
                  onChange={(e) => {
                    if (e.target.value) {
                      assign(Number(e.target.value), g.id);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">＋ Add an exam…</option>
                  {candidates.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {open === g.id && results && (
              <div className="table-scroll" style={{ borderTop: '1px solid var(--border)' }}>
                <table className="enquiry-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      {results.exams.map((e) => (
                        <th key={e.id}>
                          {e.name} ({e.weight})
                        </th>
                      ))}
                      <th>Overall</th>
                      <th>Grade</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.map((r) => (
                      <tr key={r.studentId}>
                        <td>
                          <b>{r.rank}</b>
                        </td>
                        <td>
                          <b>{r.name}</b>
                          <small className="block">{r.admissionNo}</small>
                        </td>
                        {results.exams.map((e) => (
                          <td key={e.id}>{r.parts[e.id] ?? '—'}</td>
                        ))}
                        <td>
                          <b>{r.percentage}%</b>
                        </td>
                        <td>
                          <span className="badge applied">{r.grade}</span>
                        </td>
                        <td>
                          <span className={`badge ${PILL[r.result]}`}>
                            ● {r.result[0].toUpperCase() + r.result.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!results.rows.length && (
                      <tr>
                        <td colSpan={results.exams.length + 5} className="empty-row">
                          No marks entered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
      {!groups.length && (
        <section className="card">
          <p className="hint" style={{ margin: 0 }}>
            No exam groups yet. Create the first with “New group”.
          </p>
        </section>
      )}

      <Modal open={entry} title="New exam group" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={create} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label>
              <span>Class *</span>
              <select
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                required
              >
                <option value="">Choose a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.section}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Group name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Term 1"
                required
                maxLength={100}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Create group'}
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
