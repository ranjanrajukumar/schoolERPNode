import dotenv from 'dotenv';

dotenv.config();

const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

/** Fails fast at startup instead of on the first request that needs a missing value. */
export function assertEnvironment() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'change_me' || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be a private random value of at least 32 characters in production');
    }
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin123' || process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error('Set a unique ADMIN_PASSWORD of at least 12 characters before the first production startup');
    }
    const origins = (process.env.CLIENT_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
    if (!origins.length || origins.some((origin) => {
      try { return new URL(origin).protocol !== 'https:' || new URL(origin).origin !== origin; }
      catch { return true; }
    })) {
      throw new Error('Set CLIENT_ORIGIN to one or more exact HTTPS web app origins in production');
    }
  }
  if (process.env.JWT_SECRET === 'change_me') console.warn('WARNING: JWT_SECRET is still the example value; set a long random one in server/.env.');
}

export const env = {
  port: () => Number(process.env.PORT || 4000),
  clientOrigins: () => (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  jwtSecret: () => process.env.JWT_SECRET,
  adminEmail: () => process.env.ADMIN_EMAIL || 'admin@school.local',
  adminPassword: () => process.env.ADMIN_PASSWORD || 'admin123',
};
