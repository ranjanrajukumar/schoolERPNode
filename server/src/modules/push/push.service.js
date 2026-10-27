import webpush from 'web-push';
import { Op } from 'sequelize';
import { PushSubscription, Setting, User } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';

const KEY = 'push.vapid';
const MAX_TITLE = 80;
const MAX_BODY = 300;
const BATCH = 10;

let keys = null;

/**
 * Browser push needs a VAPID key pair that identifies this server. Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env to
 * choose your own; otherwise a pair is generated once and kept in the database, so subscriptions survive restarts.
 */
async function vapid() {
  if (keys) return keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const saved = await Setting.findByPk(KEY);
    if (saved) keys = JSON.parse(saved.value);
    else {
      keys = webpush.generateVAPIDKeys();
      await Setting.create({ key: KEY, value: JSON.stringify(keys), updatedByName: 'system' });
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@school.local', keys.publicKey, keys.privateKey);
  return keys;
}

export const publicKey = async () => (await vapid()).publicKey;

export async function subscribe(user, { endpoint, keys: k }, userAgent) {
  if (!/^https:\/\//.test(String(endpoint ?? '')) || String(endpoint).length > 500) throw badRequest('Invalid subscription');
  if (!k?.p256dh || !k?.auth) throw badRequest('Invalid subscription');
  // One endpoint belongs to one person: a shared computer signing in as someone else takes the endpoint over.
  await PushSubscription.upsert({ userId: user.id, endpoint, p256dh: k.p256dh, auth: k.auth, userAgent: String(userAgent ?? '').slice(0, 200) || null });
}

export async function unsubscribe(user, endpoint) {
  await PushSubscription.destroy({ where: { userId: user.id, endpoint: String(endpoint ?? '') } });
}

export const mySubscriptions = (user) => PushSubscription.count({ where: { userId: user.id } });

/** Sends to specific people (by user id). It never throws: a notification must not stop what triggered it. */
export async function notifyUsers(userIds, { title, body, url }) {
  try {
    const ids = [...new Set((userIds ?? []).filter(Boolean))];
    if (!ids.length) return;
    await vapid();
    const subs = await PushSubscription.findAll({ where: { userId: ids } });
    const payload = JSON.stringify({ title, body, url: url || '/' });
    await Promise.all(subs.map(async (s) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, timeout: 10000 }); }
      catch (err) { if ([404, 410].includes(err.statusCode)) await s.destroy(); }
    }));
  } catch (err) { console.error('Notification failed:', err.message); }
}

const AUDIENCES = {
  staff: { role: { [Op.in]: ['admin', 'teacher', 'accountant'] } },
  parents: { role: 'parent' },
  students: { role: 'student' },
  everyone: {},
};

export async function audienceSize(audience) {
  if (!AUDIENCES[audience]) throw badRequest('Choose who to notify');
  const users = await User.findAll({ where: AUDIENCES[audience], attributes: ['id'] });
  const devices = await PushSubscription.count({ where: { userId: users.map((u) => u.id) } });
  return { people: users.length, devices };
}

/** Sends to every registered device of the audience. A device the browser says is gone is removed. */
export async function sendPush({ audience, title, body, url }) {
  if (!AUDIENCES[audience]) throw badRequest('Choose who to notify');
  const heading = String(title ?? '').trim();
  const text = String(body ?? '').trim();
  if (!heading || !text) throw badRequest('A title and a message are required');
  if (heading.length > MAX_TITLE) throw badRequest(`The title is limited to ${MAX_TITLE} characters`);
  if (text.length > MAX_BODY) throw badRequest(`The message is limited to ${MAX_BODY} characters`);
  if (url && !String(url).startsWith('/')) throw badRequest('The link must be a page of this site, starting with /');
  await vapid();

  const users = await User.findAll({ where: AUDIENCES[audience], attributes: ['id'] });
  const subs = await PushSubscription.findAll({ where: { userId: users.map((u) => u.id) } });
  const payload = JSON.stringify({ title: heading, body: text, url: url || '/' });

  const result = { devices: subs.length, delivered: 0, failed: 0, removed: 0 };
  for (let i = 0; i < subs.length; i += BATCH) {
    await Promise.all(subs.slice(i, i + BATCH).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, timeout: 10000 });
        result.delivered += 1;
      } catch (err) {
        if ([404, 410].includes(err.statusCode)) { await s.destroy(); result.removed += 1; } else result.failed += 1;
      }
    }));
  }
  return result;
}
