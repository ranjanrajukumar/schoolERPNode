import { UPDATES } from './helpContent.js';

export default function SystemUpdates() {
  return (
    <>
      <h1>System updates</h1>
      <p className="hint">
        What changed in the system, newest first. Updates are applied by whoever manages the server: run{' '}
        <code>npm run db:migrate</code> after pulling a new version.
      </p>
      {UPDATES.map((u) => (
        <div className="card" key={`${u.version}-${u.date}-${u.title}`}>
          <h2 style={{ marginTop: 0 }}>
            {u.title}{' '}
            <small>
              · v{u.version} · {u.date}
            </small>
          </h2>
          <ul>
            {u.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
