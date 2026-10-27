import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import SchoolBrand from '../../components/SchoolBrand.jsx';
import { useSchoolBrand } from '../../hooks/useSchoolBrand.js';

// Only the dev server (npm run client) fills in the seeded admin login. A built site (npm run build) starts blank, so the default password is never shipped.
const DEV = import.meta.env.DEV ? { email: 'admin@school.local', password: 'admin123' } : { email: '', password: '' };

const HIGHLIGHTS = [
  ['🎓', 'Admissions to alumni in one place'],
  ['💰', 'Fees, receipts and payroll that add up'],
  ['📊', 'Live attendance and results for every class'],
  ['👪', 'A portal for parents and students'],
];

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const school = useSchoolBrand();
  const [email, setEmail] = useState(DEV.email);
  const [password, setPassword] = useState(DEV.password);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      nav('/');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="login">
      <section className="login-art" aria-hidden="true">
        <SchoolBrand />
        <h1>{school.motto || `Welcome to ${school.name}`}</h1>
        <ul>{HIGHLIGHTS.map(([icon, text]) => <li key={text}><span>{icon}</span>{text}</li>)}</ul>
        <i className="blob b1" /><i className="blob b2" />
      </section>
      <form className="login-form" onSubmit={submit}>
        <SchoolBrand className="brand login-brand" />
        <h1>Welcome back</h1>
        <p className="hint">Sign in to continue. Students can use their admission number.</p>
        <label>Email or admission number<input type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password
          <span className="password-row">
            <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? '🙈' : '👁️'}</button>
          </span>
        </label>
        {import.meta.env.DEV && <p className="hint" style={{ margin: 0 }}>Development mode: the seeded admin login is filled in for you.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="big" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
