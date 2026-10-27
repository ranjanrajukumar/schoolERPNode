import { Router } from 'express';
import { asyncHandler } from './utils/asyncHandler.js';
import express from 'express';
import { checkLoginAllowed, rateLimit, recordLoginFailure, recordLoginSuccess, requireAdminKey } from './middleware.js';
import { publicKey } from './config/keys.js';
import { login } from './services/auth.service.js';
import { create, findActiveByCode, listAll, remove, rotateKey, search, update, verifyClientKey } from './services/clients.service.js';
import { countFor, deactivateIdentity, upsertIdentities } from './services/provision.service.js';
import { unauthorized } from './utils/httpError.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, service: 'schoolerp-global' }));

// What the mobile app calls before anybody has signed in. Only active schools, and only what is needed to connect.
// GET /api/clients?q=green  -> up to 20 schools whose name, city or code contains it (at least two characters)
router.get('/clients', rateLimit({ perMinute: 90 }), asyncHandler(async (req, res) => res.json(await search(req.query.q, req.query.limit))));
// GET /api/clients/greenfield -> that school, by its code
router.get('/clients/:code', rateLimit({ perMinute: 90 }), asyncHandler(async (req, res) => res.json(await findActiveByCode(req.params.code))));

// The key schools use to check a sign-in ticket: it is the public half of the key this service signs with.
router.get('/public-key', (_req, res) => res.json({ publicKey, algorithm: 'RS256', issuer: 'schoolerp-global' }));

// POST /api/auth/login { identifier, password } -> { accounts: [...] }. The identifier is a mobile number, an email or an admission number.
// Each account names a school, the person's role there, that school's API address, and a two-minute single-use ticket for its server.
router.post('/auth/login', checkLoginAllowed, asyncHandler(async (req, res) => {
  const accounts = await login(req.body?.identifier, req.body?.password);
  if (!accounts.length) { recordLoginFailure(req); return res.status(401).json({ error: 'Invalid mobile number, email or password' }); }
  recordLoginSuccess(req);
  return res.json({ accounts });
}));

// A school's server reports its logins here, with the key issued to it: x-client-code and x-client-key.
const provision = Router();
provision.use(express.json({ limit: '6mb' }));
provision.use(asyncHandler(async (req, _res, next) => {
  const client = await verifyClientKey(req.get('x-client-code'), req.get('x-client-key'));
  if (!client) throw unauthorized('A valid school code and key are required');
  req.client = client;
  next();
}));
// POST { identities: [{ localUserId, role, name, email?, mobile?, username?, passwordHash, active? }], full? }
provision.post('/identities', asyncHandler(async (req, res) => res.json(await upsertIdentities(req.client, req.body?.identities, { full: req.body?.full === true }))));
provision.delete('/identities/:localUserId', asyncHandler(async (req, res) => res.json(await deactivateIdentity(req.client, req.params.localUserId))));
provision.get('/status', asyncHandler(async (req, res) => res.json({ code: req.client.code, logins: await countFor(req.client) })));
router.use('/provision', provision);

// The people who run the registry add, change and remove schools. x-admin-key: GLOBAL_ADMIN_KEY
const admin = Router();
admin.use(requireAdminKey);
admin.get('/clients', asyncHandler(async (_req, res) => res.json(await listAll())));
// POST { code, name, city?, state?, logoUrl?, apiUrl, notes?, verify? }: the school's server is asked to answer unless verify is false
admin.post('/clients', asyncHandler(async (req, res) => res.status(201).json(await create(req.body, { verify: req.body?.verify !== false }))));
admin.put('/clients/:code', asyncHandler(async (req, res) => res.json(await update(req.params.code, req.body, { verify: req.body?.verify === true }))));
admin.post('/clients/:code/rotate-key', asyncHandler(async (req, res) => res.json(await rotateKey(req.params.code))));
admin.delete('/clients/:code', asyncHandler(async (req, res) => { await remove(req.params.code); res.json({ ok: true }); }));
router.use('/admin', admin);

export default router;
