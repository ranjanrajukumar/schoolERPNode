import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

/** The signed-in staff member's own record: every detail the school holds about them. */
export default function MyProfile() {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/hr/profile/mine')
      .then(setP)
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (!p) return <p>Loading…</p>;
  return (
    <div className="student-details">
      <div className="details-head">
        <div>
          <h1>{p.name}</h1>
          {p.designation && <p className="hint">{p.designation}</p>}
        </div>
      </div>
      {p.sections.map((s) => (
        <section key={s.title} className="details-section">
          <h4>{s.title}</h4>
          <dl>
            {s.rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="hint">If something here is wrong, please tell the school office.</p>
    </div>
  );
}
