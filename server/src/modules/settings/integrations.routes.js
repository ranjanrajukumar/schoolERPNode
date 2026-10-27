import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { providerStatus } from '../messaging/providers.js';
import { sendMessage } from '../messaging/messaging.service.js';

// Mounted behind requireRole('admin'). Credentials live in server/.env and are never sent to the browser:
// only whether each one is set.
const router = Router();
const set = (key) => Boolean(process.env[key]);

router.get('/', asyncHandler(async (_req, res) => {
  res.json({
    providers: providerStatus(),
    email: { live: set('SMTP_HOST'), host: process.env.SMTP_HOST || null, checks: { SMTP_HOST: set('SMTP_HOST'), SMTP_USER: set('SMTP_USER'), SMTP_PASSWORD: set('SMTP_PASSWORD'), SMTP_FROM: set('SMTP_FROM') } },
    sms: {
      live: providerStatus().sms === 'twilio',
      checks: { SMS_PROVIDER: process.env.SMS_PROVIDER === 'twilio', TWILIO_SID: set('TWILIO_SID'), TWILIO_TOKEN: set('TWILIO_TOKEN'), 'TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID': set('TWILIO_FROM') || set('TWILIO_MESSAGING_SERVICE_SID') },
    },
    defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || null,
    clientOrigins: (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  });
}));

// POST /api/integrations/test { channel, to } sends a short test message (recorded in the communication history)
router.post('/test', asyncHandler(async (req, res) => {
  const { channel, to } = req.body;
  res.json(await sendMessage({
    channel, to, toName: 'Test', subject: 'School ERP test message', kind: 'direct', sentByName: req.user.name,
    body: 'This is a test message from School ERP. If you can read it, delivery is working.',
  }));
}));

export default router;
