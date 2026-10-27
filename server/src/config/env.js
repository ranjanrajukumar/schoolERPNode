import dotenv from 'dotenv';

dotenv.config();

const REQUIRED = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

/** Fails fast at startup instead of on the first request that needs a missing value. */
export function assertEnvironment() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'change_me') {
    throw new Error('JWT_SECRET must be changed before running in production');
  }
  if (process.env.JWT_SECRET === 'change_me') console.warn('WARNING: JWT_SECRET is still the example value; set a long random one in server/.env.');
  if (process.env.NODE_ENV === 'production' && (process.env.ADMIN_PASSWORD || 'admin123') === 'admin123') {
    console.warn('WARNING: the seeded admin password is the default; change it after first login.');
  }
}

export const env = {
  port: () => Number(process.env.PORT || 4000),
  clientOrigins: () => (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  jwtSecret: () => process.env.JWT_SECRET,
  adminEmail: () => process.env.ADMIN_EMAIL || 'admin@school.local',
  adminPassword: () => process.env.ADMIN_PASSWORD || 'admin123',
};
