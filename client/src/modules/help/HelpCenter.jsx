import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FAQ } from './helpContent.js';

export default function HelpCenter() {
  const [query, setQuery] = useState('');
  const shown = FAQ.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <h1>Help center</h1>
      <p>
        <Link className="btn" to="/user-guide">User guide</Link>
        <Link className="btn" to="/support">Submit a support request</Link>
        <Link className="btn" to="/system-updates">What&apos;s new</Link>
      </p>
      <div className="card form">
        <label>Search the questions<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. password, backup, marks" /></label>
      </div>
      {shown.map((f) => (
        <details className="card" key={f.q}>
          <summary><b>{f.q}</b></summary>
          <p>{f.a}</p>
        </details>
      ))}
      {!shown.length && <p className="hint">Nothing matches. <Link to="/support">Ask the administrator</Link>.</p>}
    </>
  );
}
