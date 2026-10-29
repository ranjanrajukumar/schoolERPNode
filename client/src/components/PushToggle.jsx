import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const toKey = (base64) => {
  const raw = atob(
    (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'),
  );
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Turns notifications on or off for this browser. Needs https (or localhost) and the user's permission. */
export default function PushToggle() {
  const [on, setOn] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported()) return;
    navigator.serviceWorker
      .getRegistration('/sw.js')
      .then((r) => r?.pushManager.getSubscription())
      .then((s) => setOn(Boolean(s)))
      .catch(() => {});
  }, []);

  if (!supported())
    return (
      <p className="hint">
        This browser cannot receive push notifications.{' '}
        {!window.isSecureContext && 'They also need the site to be opened over https.'}
      </p>
    );

  const enable = async () => {
    setError('');
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== 'granted')
        throw new Error(
          'Notifications are blocked for this site. Allow them in the browser settings and try again.',
        );
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const { publicKey } = await api('/push/key');
      const sub =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toKey(publicKey),
        }));
      await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
      setOn(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setError('');
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setOn(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <b>Notifications on this device:</b>{' '}
      {on ? <span className="badge paid">on</span> : <span className="badge partial">off</span>}{' '}
      <button disabled={busy} onClick={on ? disable : enable}>
        {on ? 'Turn off' : 'Turn on'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
