import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

function Ring({ done, total }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg
      viewBox="0 0 110 110"
      width="116"
      height="116"
      role="img"
      aria-label={`${done} of ${total} required steps done`}
    >
      <circle cx="55" cy="55" r={r} fill="none" strokeWidth="11" className="donut-track" />
      <circle
        cx="55"
        cy="55"
        r={r}
        fill="none"
        strokeWidth="11"
        strokeLinecap="round"
        className="ring-fill"
        strokeDasharray={`${pct * c} ${c}`}
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="53" textAnchor="middle" className="donut-centre">
        {Math.round(pct * 100)}%
      </text>
      <text x="55" y="72" textAnchor="middle" className="donut-caption">
        ready
      </text>
    </svg>
  );
}

export default function SetupGuide() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const load = () =>
    api('/setup/status')
      .then(setD)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (!d) return error ? <p className="error">{error}</p> : <div className="skeleton hero-skeleton" />;
  const next = d.steps.find((s) => !s.done && !s.optional);
  const left = d.progress.total - d.progress.done;

  return (
    <>
      <h1>Setup &amp; go-live guide</h1>
      <p className="hint">
        The order a school should set the system up in. Each step ticks itself from your real data, so reopen
        this page any time to see what is left.
      </p>

      <section className="card setup-head">
        <Ring done={d.progress.done} total={d.progress.total} />
        <div>
          <h2 style={{ margin: 0 }}>
            {left === 0 ? 'You are ready to go live 🎉' : `${left} step${left === 1 ? '' : 's'} to go`}
          </h2>
          <p className="hint" style={{ margin: '4px 0 12px' }}>
            {d.progress.done} of {d.progress.total} required steps done. Classes ready: {d.classes.ready} of{' '}
            {d.classes.total}. <Link to="/class-map">See class readiness</Link>
          </p>
          {next && (
            <Link className="btn" to={next.link}>
              Next: {next.title}
            </Link>
          )}
          <button type="button" className="ghost" onClick={load}>
            Re-check
          </button>
        </div>
      </section>

      {d.phases.map((phase) => {
        const steps = d.steps.filter((s) => s.phase === phase);
        return (
          <section key={phase}>
            <h2>
              {phase}{' '}
              <small>
                · {steps.filter((s) => s.done).length}/{steps.length}
              </small>
            </h2>
            <ul className="checklist card">
              {steps.map((s) => (
                <li key={s.key} className={s.done ? 'done' : s === next ? 'next' : ''}>
                  <span className="tick" aria-label={s.done ? 'done' : 'not done'}>
                    {s.done ? '✓' : ''}
                  </span>
                  <span className="check-text">
                    <b>
                      {s.title}
                      {s.optional && <small> · optional</small>}
                    </b>
                    <small>{s.why}</small>
                    {s.detail && <small className="detail">{s.detail}</small>}
                  </span>
                  <span className="check-actions">
                    {s.importKind && (
                      <Link className="btn" to={`/data-tools?kind=${s.importKind}`}>
                        Import
                      </Link>
                    )}
                    <Link className="btn" to={s.link}>
                      {s.done ? 'Review' : 'Add one'}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
