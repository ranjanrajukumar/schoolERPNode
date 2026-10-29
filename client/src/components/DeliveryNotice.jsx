import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

/** Says plainly whether a channel really delivers, or only records messages (no provider configured). */
export default function DeliveryNotice({ channel }) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    api('/messaging/status')
      .then(setStatus)
      .catch(() => {});
  }, []);
  if (!status || !channel) return null;
  return status[channel] === 'log' ? (
    <p className="error">
      No {channel === 'sms' ? 'SMS' : 'email'} provider is configured, so messages are only recorded in the
      history and are <b>not delivered</b>. Add the provider settings to server/.env (see .env.example).
    </p>
  ) : (
    <p className="hint">
      Delivering {channel === 'sms' ? 'SMS' : 'email'} through {status[channel]}.
    </p>
  );
}
