/**
 * Delivery back-ends. Each returns { status: 'sent' | 'logged' | 'failed', provider, error? } and never throws,
 * so one bad number cannot stop a bulk send. With no credentials configured a channel runs in "log" mode:
 * the message is recorded in the history but not delivered.
 */
const TIMEOUT_MS = 10000;
const cfg = () => process.env;

export const smtpConfigured = () => Boolean(cfg().SMTP_HOST);
export const smsProvider = () => (cfg().SMS_PROVIDER === 'twilio' && cfg().TWILIO_SID && cfg().TWILIO_TOKEN
  && (cfg().TWILIO_FROM || cfg().TWILIO_MESSAGING_SERVICE_SID) ? 'twilio' : 'log');

/** What is live right now. Never includes secrets. */
export const providerStatus = () => ({
  email: smtpConfigured() ? 'smtp' : 'log',
  sms: smsProvider(),
});

/**
 * Twilio needs E.164 (+14155550123). A number without a country code gets DEFAULT_COUNTRY_CODE (e.g. 91);
 * with none configured it is rejected, because guessing could text a stranger in another country.
 */
export function normalizePhone(raw) {
  const text = String(raw ?? '').trim();
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  let e164;
  if (text.startsWith('+')) e164 = digits;
  else if (text.startsWith('00')) e164 = digits.slice(2);
  else {
    const country = String(cfg().DEFAULT_COUNTRY_CODE || '').replace(/\D/g, '');
    if (!country) return null;
    e164 = `${country}${digits.replace(/^0+/, '')}`;
  }
  return e164.length >= 8 && e164.length <= 15 ? `+${e164}` : null;
}

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? ''));

let transporter;
async function smtp() {
  if (!transporter) {
    const { default: nodemailer } = await import('nodemailer');
    const port = Number(cfg().SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: cfg().SMTP_HOST,
      port,
      secure: port === 465,
      auth: cfg().SMTP_USER ? { user: cfg().SMTP_USER, pass: cfg().SMTP_PASSWORD } : undefined,
      connectionTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  }
  return transporter;
}

const fail = (provider, err) => ({ status: 'failed', provider, error: String(err?.message ?? err).slice(0, 300) });

async function sendEmail({ to, subject, body }) {
  if (!smtpConfigured()) return { status: 'logged', provider: 'log' };
  try {
    await (await smtp()).sendMail({
      from: cfg().SMTP_FROM || cfg().SMTP_USER, to, subject: subject || '(no subject)', text: body,
    });
    return { status: 'sent', provider: 'smtp' };
  } catch (err) {
    return fail('smtp', err);
  }
}

async function sendSms({ to, body }) {
  if (smsProvider() === 'log') return { status: 'logged', provider: 'log' };
  try {
    const params = new URLSearchParams({ To: to, Body: body });
    if (cfg().TWILIO_MESSAGING_SERVICE_SID) params.set('MessagingServiceSid', cfg().TWILIO_MESSAGING_SERVICE_SID);
    else params.set('From', cfg().TWILIO_FROM);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg().TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg().TWILIO_SID}:${cfg().TWILIO_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { status: 'sent', provider: 'twilio' };
    const data = await res.json().catch(() => ({}));
    return fail('twilio', data.message || `HTTP ${res.status}`);
  } catch (err) {
    return fail('twilio', err);
  }
}

export const deliver = (channel, message) => (channel === 'email' ? sendEmail(message) : sendSms(message));
