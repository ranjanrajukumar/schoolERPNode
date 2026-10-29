import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

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

/** Grade setup: the pass mark and where each grade starts. Results and report cards follow it. */
export default function GradeSetup() {
  const canWrite = useAuth().user?.role === 'admin';
  const [passPercent, setPassPercent] = useState('');
  const [bands, setBands] = useState([]);
  const [isDefault, setIsDefault] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () =>
    api('/exams/grading')
      .then((g) => {
        setPassPercent(g.passPercent);
        setBands(g.bands.map((b) => ({ grade: b.grade, min: b.min })));
        setIsDefault(g.isDefault);
        setDirty(false);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const setBand = (i, patch) => {
    setDirty(true);
    setBands(bands.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api('/exams/grading', { method: 'PUT', body: { passPercent, bands } });
      setNotice('Grade setup saved. Results and report cards now use it.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...bands].sort((a, b) => Number(b.min) - Number(a.min));
  return (
    <form onSubmit={save}>
      <div className="profile-head">
        <div>
          <h1>Grade setup</h1>
          <p className="hint">
            Each grade starts at its lower limit and runs up to the next grade. The lowest grade must start at
            0%. A student fails a subject when they score below the pass mark.
          </p>
        </div>
        {canWrite && (
          <div className="head-actions">
            <button type="submit" className="big-action" disabled={busy || !dirty}>
              {busy ? 'Saving…' : dirty ? 'Save grade setup' : 'Saved'}
            </button>
          </div>
        )}
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="✓"
          tone="green"
          label="Pass mark"
          value={`${passPercent}%`}
          hint="needed in each subject"
        />
        <Tile icon="▤" tone="blue" label="Grades" value={bands.length} />
        <Tile
          icon="★"
          tone="violet"
          label="Top grade"
          value={sorted[0]?.grade || '—'}
          hint={sorted[0] ? `from ${sorted[0].min}%` : null}
        />
        <Tile
          icon="◷"
          tone="amber"
          label="Scale"
          value={isDefault ? 'Built-in' : 'Your own'}
          hint={isDefault ? 'Save to use your own' : null}
        />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="range-field">
            <span>Pass mark (% needed in each subject)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              style={{ width: 120 }}
              disabled={!canWrite}
              value={passPercent}
              onChange={(e) => {
                setPassPercent(e.target.value);
                setDirty(true);
              }}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Grade</th>
                <th>From (%)</th>
                <th>To (%)</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((b, idx) => {
                const i = bands.indexOf(b);
                const upper = idx === 0 ? 100 : sorted[idx - 1].min;
                return (
                  <tr key={i}>
                    <td>
                      <input
                        style={{ width: 90 }}
                        disabled={!canWrite}
                        value={b.grade}
                        onChange={(e) => setBand(i, { grade: e.target.value })}
                        aria-label="Grade"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        style={{ width: 100 }}
                        disabled={!canWrite}
                        value={b.min}
                        onChange={(e) => setBand(i, { min: e.target.value })}
                        aria-label="From percent"
                        required
                      />
                    </td>
                    <td>{idx === 0 ? upper : `${upper} (below)`}</td>
                    {canWrite && (
                      <td className="row-actions">
                        <button
                          type="button"
                          className="ghost danger"
                          onClick={() => {
                            setDirty(true);
                            setBands(bands.filter((_, j) => j !== i));
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {canWrite && (
          <div className="toolbar" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setDirty(true);
                setBands([...bands, { grade: '', min: '' }]);
              }}
            >
              ＋ Add a grade
            </button>
          </div>
        )}
      </section>
    </form>
  );
}
