import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import DeliveryNotice from '../../components/DeliveryNotice.jsx';

const PLACEHOLDERS = '{{guardian}} {{student}} {{class}} {{school}}';

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

/** Compose an SMS or email to a class's parents, all staff, a user group, or one number/address. */
export default function SendMessage() {
  const [params, setParams] = useSearchParams();
  const channel = params.get('channel') === 'email' ? 'email' : 'sms';
  const [mode, setMode] = useState('broadcast');
  const audienceKind = params.get('audience');
  const groupId = params.get('groupId');
  const staff = mode === 'broadcast' && audienceKind === 'staff';
  const group = mode === 'broadcast' && audienceKind === 'group' && Boolean(groupId);
  const fixed = staff || group; // a fixed audience instead of parents by class
  const [classes, setClasses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ classId: '', to: '', subject: '', body: '' });
  const [audience, setAudience] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/classes').then(setClasses);
    api('/messaging/templates').then(setTemplates);
  }, []);
  useEffect(() => {
    setAudience(null);
    if (mode !== 'broadcast') return;
    api(
      `/messaging/audience?channel=${channel}${staff ? '&audience=staff' : ''}${group ? `&audience=group&groupId=${groupId}` : ''}${form.classId && !fixed ? `&classId=${form.classId}` : ''}`,
    )
      .then(setAudience)
      .catch(() => {});
  }, [mode, channel, form.classId, staff, group, groupId]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const applyTemplate = (id) => {
    const t = templates.find((x) => String(x.id) === id);
    if (t) setForm({ ...form, subject: t.subject ?? '', body: t.body });
  };

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      if (mode === 'broadcast') {
        setResult(
          await api('/messaging/broadcast', {
            method: 'POST',
            body: {
              channel,
              audience: staff ? 'staff' : group ? 'group' : undefined,
              groupId: group ? groupId : undefined,
              classId: fixed ? undefined : form.classId || undefined,
              subject: form.subject,
              body: form.body,
            },
          }),
        );
      } else {
        const m = await api('/messaging/send', {
          method: 'POST',
          body: { channel, to: form.to, subject: form.subject, body: form.body },
        });
        setResult({
          total: 1,
          sent: m.status === 'sent' ? 1 : 0,
          logged: m.status === 'logged' ? 1 : 0,
          failed: m.status === 'failed' ? 1 : 0,
          skipped: 0,
          error: m.error,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const channelTemplates = templates.filter((t) => t.channel === channel);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Send {channel === 'sms' ? 'SMS' : 'email'}</h1>
          <p className="hint">
            Write one message and send it to a whole audience, or to a single{' '}
            {channel === 'sms' ? 'phone number' : 'email address'}. Anything that cannot be delivered is
            recorded in the communication history.
          </p>
        </div>
      </div>
      <DeliveryNotice channel={channel} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className={result.failed ? 'error' : 'success'}>
          {result.total} recipient(s): {result.sent} delivered, {result.logged} recorded only (no provider),{' '}
          {result.failed} failed, {result.skipped} skipped.
          {result.error && <> {result.error}</>}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="✉"
          tone="blue"
          label="Reachable recipients"
          value={mode === 'broadcast' ? (audience ? audience.reachable : '…') : 1}
        />
        <Tile
          icon="!"
          tone="amber"
          label="Skipped (no contact)"
          value={mode === 'broadcast' ? (audience ? audience.skipped : '…') : 0}
        />
        <Tile icon="≡" tone="violet" label="Templates available" value={channelTemplates.length} />
        <Tile
          icon="✎"
          tone="green"
          label="Message length"
          value={form.body.length}
          hint={channel === 'sms' ? 'of 1000 characters' : 'characters'}
        />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {[
            ['sms', 'SMS'],
            ['email', 'Email'],
          ].map(([c, l]) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={c === channel}
              className={c === channel ? 'on' : ''}
              onClick={() =>
                setParams(
                  staff
                    ? { channel: c, audience: 'staff' }
                    : group
                      ? { channel: c, audience: 'group', groupId }
                      : { channel: c },
                )
              }
            >
              {l}
            </button>
          ))}
        </div>
        <form onSubmit={send} className="enquiry-form" style={{ padding: 22 }}>
          <div className="enq-grid">
            <label>
              <span>Send to</span>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="broadcast">
                  {staff
                    ? 'All active staff'
                    : group
                      ? 'Everyone in the user group'
                      : 'Parents (all or one class)'}
                </option>
                <option value="single">One {channel === 'sms' ? 'phone number' : 'email address'}</option>
              </select>
            </label>
            {mode === 'broadcast' && fixed ? null : mode === 'broadcast' ? (
              <label>
                <span>Class</span>
                <select value={form.classId} onChange={set('classId')}>
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}-{c.section}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <span>{channel === 'sms' ? 'Phone (with country code) *' : 'Email *'}</span>
                <input
                  type={channel === 'sms' ? 'tel' : 'email'}
                  value={form.to}
                  onChange={set('to')}
                  required
                />
              </label>
            )}
            {channelTemplates.length > 0 && (
              <label className="wide">
                <span>Template</span>
                <select value="" onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">-- fill from template --</option>
                  {channelTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {channel === 'email' && (
              <label className="wide">
                <span>Subject *</span>
                <input value={form.subject} onChange={set('subject')} required />
              </label>
            )}
            <label className="wide">
              <span>Message *</span>
              <textarea
                rows={5}
                value={form.body}
                onChange={set('body')}
                required
                maxLength={channel === 'sms' ? 1000 : undefined}
              />
            </label>
          </div>
          {mode === 'broadcast' && (
            <p className="hint">
              Placeholders filled per recipient:{' '}
              {fixed ? '{{guardian}} (their name) {{school}}' : PLACEHOLDERS}.{' '}
              {audience && (
                <>
                  <b>{audience.reachable}</b> reachable
                  {audience.skipped > 0 &&
                    `, ${audience.skipped} skipped (no ${staff ? (channel === 'sms' ? 'phone' : 'email') : channel === 'sms' ? 'guardian phone' : 'email'})`}
                  .
                </>
              )}
            </p>
          )}
          <div className="form-actions">
            <button
              type="submit"
              data-sure={mode === 'broadcast' ? '' : 'off'}
              disabled={busy || (mode === 'broadcast' && audience?.reachable === 0)}
            >
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
