import { useAuth } from '../../context/AuthContext.jsx';
import { GUIDE } from './helpContent.js';

export default function UserGuide() {
  const role = useAuth().user?.role;
  const mine = (s) =>
    s.roles === 'everyone' ||
    s.roles
      .split(',')
      .map((r) => r.trim())
      .includes(role);

  return (
    <>
      <h1>User guide</h1>
      <p className="hint">
        Sections for your role ({role}) come first; the rest are listed below in case you work with those
        areas.
      </p>
      {[...GUIDE.filter(mine), ...GUIDE.filter((s) => !mine(s))].map((s) => (
        <details className="card" key={s.title} open={mine(s) && s.title === 'Getting started'}>
          <summary>
            <b>{s.title}</b> <small>· for {s.roles}</small>
          </summary>
          <ol>
            {s.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      ))}
    </>
  );
}
