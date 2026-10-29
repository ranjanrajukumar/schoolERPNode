import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import SchoolBrand from '../../components/SchoolBrand.jsx';

/** Replaces a temporary password. A new student login starts on one, and nothing else in the app opens until it is changed. */
export default function ChangePassword() {
  const nav = useNavigate();
  const { user, logout, passwordChanged } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) return setError('The two new passwords do not match.');
    setBusy(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      passwordChanged();
      nav('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-form" onSubmit={submit} style={{ margin: '0 auto' }}>
        <SchoolBrand className="brand login-brand" />
        <h1>Choose a new password</h1>
        <p className="hint">
          {user?.mustChangePassword
            ? 'You are signed in with a temporary password. Choose your own to continue.'
            : 'Enter your current password, then a new one.'}
        </p>
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            required
          />
        </label>
        <label>
          New password (at least 8 characters)
          <input
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set('newPassword')}
            required
            minLength={8}
          />
        </label>
        <label>
          New password again
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            required
            minLength={8}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="big" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
        {!user?.mustChangePassword && (
          <button type="button" className="ghost" onClick={() => nav(-1)}>
            Back
          </button>
        )}
        <button
          type="button"
          className="ghost"
          onClick={() => {
            logout();
            nav('/login');
          }}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
