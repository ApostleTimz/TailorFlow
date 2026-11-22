const crypto = require('crypto');

const WEAK_SECRET_PATTERNS = [/change-me/i, /dev-only/i, /0000000000/, /your[-_ ]?secret/i];

function isStrongSecret(value) {
  if (typeof value !== 'string' || value.length < 32) return false;
  if (WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(value))) return false;
  return new Set(value).size >= 12;
}

function validateConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const production = nodeEnv === 'production';
  let jwtSecret = env.JWT_SECRET;
  if (!isStrongSecret(jwtSecret)) {
    if (production) throw new Error('JWT_SECRET must be a random string of at least 32 characters and cannot be a placeholder.');
    jwtSecret = crypto.randomBytes(48).toString('hex');
  }
  let appOrigin;
  try {
    appOrigin = new URL(env.APP_URL || 'http://localhost:5173').origin;
  } catch {
    throw new Error('APP_URL must be a valid URL.');
  }
  if (production && !appOrigin.startsWith('https://')) throw new Error('APP_URL must use https in production.');
  const trustProxy = env.TRUST_PROXY === undefined || env.TRUST_PROXY === '' ? 0 : Number(env.TRUST_PROXY);
  if (!Number.isInteger(trustProxy) || trustProxy < 0) throw new Error('TRUST_PROXY must be a non-negative integer.');
  const dbSync = env.DB_SYNC === 'true' || (!production && env.DB_SYNC !== 'false');
  return { nodeEnv, production, jwtSecret, appOrigin, trustProxy, dbSync };
}

const config = validateConfig();
if (!isStrongSecret(process.env.JWT_SECRET)) console.warn('[security] JWT_SECRET is missing or weak; using an ephemeral secret for this process.');

module.exports = { config, validateConfig, isStrongSecret };
