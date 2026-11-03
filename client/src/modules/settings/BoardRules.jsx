import { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../services/api.js';

const TYPE_LABEL = {
  subject_template: 'Subject template',
  exam_pattern: 'Exam pattern',
  grading: 'Grading',
  bell_schedule: 'Bell times',
  promotion: 'Promotion',
  report_card: 'Report card',
};
const STAGE_LABEL = {
  pre: 'Nursery–UKG',
  lower: 'Class 1–2',
  upper: 'Class 3–5',
  mid: 'Class 6–8',
  sec: 'Class 9–10',
  sr: 'Class 11–12',
};
const AFFILIATION_TEXT = {
  verified: 'Affiliation verified',
  lapsed: 'Affiliation lapsed',
  unverified: 'Affiliation not verified',
};

const scopeLabel = (r) => (r.ruleType === 'subject_template' ? (STAGE_LABEL[r.scopeKey] ?? r.scopeKey) : '—');

/**
 * Board rules: what the software applies for each board (subject lists, exam pattern, grading, bell times), each with its
 * version history, source and verified flag. Also records the school's affiliation, which is separate from what the software can run.
 */
export default function BoardRules() {
  const [boards, setBoards] = useState([]);
  const [stats, setStats] = useState([]);
  const [boardId, setBoardId] = useState(null);
  const [rules, setRules] = useState([]);
  const [years, setYears] = useState([]);
  const [history, setHistory] = useState(false);
  const [edit, setEdit] = useState(null); // { rule, payload, sourceRef, changeNote, effectiveYearId }
  const [aff, setAff] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBoards = useCallback(
    () =>
      api('/boards')
        .then((b) => {
          setBoards(b);
          setBoardId((id) => id ?? b[0]?.id ?? null);
        })
        .catch((e) => setError(e.message)),
    [],
  );
  const loadRules = useCallback(() => {
    if (!boardId) return;
    api(`/boards/${boardId}/rules`)
      .then(setRules)
      .catch((e) => setError(e.message));
  }, [boardId]);

  useEffect(() => {
    api('/boards/analytics')
      .then(setStats)
      .catch(() => {});
    loadBoards();
    api('/academic-years')
      .then(setYears)
      .catch(() => {});
  }, [loadBoards]);
  useEffect(loadRules, [loadRules]);

  const board = boards.find((b) => b.id === boardId);
  const shown = rules.filter((r) => history || r.status === 'active');

  const run = async (fn, done) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await fn();
      setNotice(done);
      loadRules();
      loadBoards();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveRule = (e) => {
    e.preventDefault();
    let payload;
    try {
      payload = JSON.parse(edit.payload);
    } catch {
      setError('The rule is not valid JSON');
      return;
    }
    run(async () => {
      await api(`/boards/${boardId}/rules`, {
        method: 'POST',
        body: {
          ruleType: edit.rule.ruleType,
          scopeKey: edit.rule.scopeKey,
          effectiveYearId: edit.effectiveYearId || null,
          payload,
          sourceRef: edit.sourceRef,
          changeNote: edit.changeNote,
        },
      });
      setEdit(null);
    }, 'Saved as a new version. It stays unverified until you verify it against the board’s publication.');
  };

  const verify = (r) => {
    const sourceRef = window.prompt(
      'Which board publication or circular was this checked against? (title, number or link)',
      r.sourceRef ?? '',
    );
    if (sourceRef === null) return;
    run(
      () => api(`/boards/rules/${r.id}/verify`, { method: 'PUT', body: { sourceRef } }),
      'Marked as verified.',
    );
  };

  const saveAff = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/boards/affiliations', { method: 'POST', body: { ...aff, boardId } });
      setAff(null);
    }, 'Affiliation record saved.');
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Board rules</h1>
          <p className="hint">
            The software can run more than one board. These are the rules it applies for each: subject lists,
            exam pattern, grading and bell times. A change adds a new version and keeps the old one. Starter
            values are not official: check each against the board’s own publication and verify it with the
            source.
          </p>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !edit && !aff && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {stats.length > 0 && (
        <div className="stats enquiry-tiles four">
          {stats.map((b) => (
            <div key={b.id} className="tile card">
              <span className="tile-text">
                <span>{b.name}</span>
                <b>
                  {b.classes} classes · {b.students} students
                </b>
                <small>
                  {b.exams} exams · {b.timetablePeriods} timetable periods · {b.registrations.registered}{' '}
                  registered with the board
                </small>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="tabs" role="tablist">
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={b.id === boardId}
            className={`tab${b.id === boardId ? ' active' : ''}`}
            onClick={() => setBoardId(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>

      {board && (
        <section className="card enquiry-card" style={{ padding: 14, marginBottom: 12 }}>
          <b>{board.name}</b> · {board.classes} class(es) ·{' '}
          <span className={`badge ${board.affiliation === 'verified' ? 'paid' : 'partial'}`}>
            {AFFILIATION_TEXT[board.affiliation]}
          </span>
          <p className="hint" style={{ margin: '6px 0' }}>
            Running a board in the software does not mean the school is affiliated to it. Marksheets and
            reports state affiliation only when it is recorded here as verified, with the number and the
            document.
          </p>
          {board.affiliations.map((a) => (
            <p key={a.id} className="hint" style={{ margin: 0 }}>
              {a.branchId ? `Branch ${a.branchId}` : 'Whole school'} · {a.standing} · no.{' '}
              {a.affiliationNo ?? '—'} · {a.validFrom ?? '…'} to {a.validTo ?? '…'} ·{' '}
              {a.sourceRef ?? 'no source'}
            </p>
          ))}
          <button type="button" className="ghost" onClick={() => setAff({ status: 'unverified' })}>
            + Record affiliation
          </button>
        </section>
      )}

      <section className="card enquiry-card">
        <div className="toolbar">
          <label>
            <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} /> Show
            earlier versions
          </label>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Applies to</th>
                <th>From session</th>
                <th>Version</th>
                <th>Status</th>
                <th>Source</th>
                <th>Changed by</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} style={r.status === 'retired' ? { opacity: 0.6 } : undefined}>
                  <td>
                    <b>{TYPE_LABEL[r.ruleType] ?? r.ruleType}</b>
                  </td>
                  <td>{scopeLabel(r)}</td>
                  <td>{r.effectiveFrom ?? 'from the start'}</td>
                  <td>
                    v{r.version}
                    {r.status === 'retired' && ' (replaced)'}
                  </td>
                  <td>
                    <span className={`badge ${r.verified ? 'paid' : 'partial'}`}>
                      {r.verified ? 'verified' : 'unverified'}
                    </span>
                  </td>
                  <td>{r.sourceRef ?? <span className="hint">none</span>}</td>
                  <td>
                    {r.createdByName ?? '—'}
                    {r.changeNote && <small style={{ display: 'block' }}>{r.changeNote}</small>}
                  </td>
                  <td className="row-actions">
                    {r.status === 'active' && (
                      <>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setError('');
                            setEdit({
                              rule: r,
                              payload: JSON.stringify(r.payload, null, 2),
                              sourceRef: '',
                              changeNote: '',
                              effectiveYearId: r.effectiveYearId ?? '',
                            });
                          }}
                        >
                          Edit
                        </button>
                        {!r.verified && (
                          <button type="button" className="ghost" disabled={busy} onClick={() => verify(r)}>
                            Verify
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={8}>No rules yet for this board.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={Boolean(edit)} title="New version of the rule" wide onClose={() => setEdit(null)}>
        {edit && (
          <form onSubmit={saveRule} className="enquiry-form">
            <p className="hint">
              {TYPE_LABEL[edit.rule.ruleType]} · {scopeLabel(edit.rule)} · currently v{edit.rule.version}.
              Saving adds v{edit.rule.version + 1} (for the same session start) and keeps the old version in
              the history.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <label>
              <span>Applies from session</span>
              <select
                value={edit.effectiveYearId}
                onChange={(e) => setEdit({ ...edit, effectiveYearId: e.target.value })}
              >
                <option value="">From the start (all sessions)</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Rule (JSON)</span>
              <textarea
                rows={14}
                style={{ fontFamily: 'monospace', width: '100%' }}
                value={edit.payload}
                onChange={(e) => setEdit({ ...edit, payload: e.target.value })}
              />
            </label>
            <label>
              <span>Source (board circular, notification or page)</span>
              <input
                value={edit.sourceRef}
                onChange={(e) => setEdit({ ...edit, sourceRef: e.target.value })}
              />
            </label>
            <label>
              <span>What changed and why</span>
              <input
                value={edit.changeNote}
                onChange={(e) => setEdit({ ...edit, changeNote: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save new version'}
              </button>
              <button type="button" className="ghost" onClick={() => setEdit(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(aff)} title="Affiliation record" onClose={() => setAff(null)}>
        {aff && (
          <form onSubmit={saveAff} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <label>
              <span>Status</span>
              <select value={aff.status} onChange={(e) => setAff({ ...aff, status: e.target.value })}>
                <option value="unverified">Not verified</option>
                <option value="verified">Verified</option>
                <option value="lapsed">Lapsed</option>
              </select>
            </label>
            <label>
              <span>Affiliation / recognition no.</span>
              <input
                value={aff.affiliationNo ?? ''}
                onChange={(e) => setAff({ ...aff, affiliationNo: e.target.value })}
              />
            </label>
            <label>
              <span>Valid from</span>
              <input
                type="date"
                value={aff.validFrom ?? ''}
                onChange={(e) => setAff({ ...aff, validFrom: e.target.value })}
              />
            </label>
            <label>
              <span>Valid to</span>
              <input
                type="date"
                value={aff.validTo ?? ''}
                onChange={(e) => setAff({ ...aff, validTo: e.target.value })}
              />
            </label>
            <label>
              <span>Document or portal record that proves it</span>
              <input
                value={aff.sourceRef ?? ''}
                onChange={(e) => setAff({ ...aff, sourceRef: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                Save
              </button>
              <button type="button" className="ghost" onClick={() => setAff(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
