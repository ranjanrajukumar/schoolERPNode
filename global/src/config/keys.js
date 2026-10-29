import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The key that signs sign-in tickets. Schools check a ticket with the public half, so a school can only trust what this service signed.
 * Set GLOBAL_PRIVATE_KEY (PEM; newlines may be written as \n) in production; without it a key pair is made once and kept in global/keys/.
 */
const dir = path.resolve('keys');

function load() {
  if (process.env.GLOBAL_PRIVATE_KEY) return process.env.GLOBAL_PRIVATE_KEY.replace(/\\n/g, '\n');
  const file = path.join(dir, 'private.pem');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  fs.mkdirSync(dir, { recursive: true });
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  fs.writeFileSync(file, privateKey, { mode: 0o600 });
  console.log('Made a new signing key in global/keys/private.pem: keep it, and back it up');
  return privateKey;
}

export const privateKey = load();
export const publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
