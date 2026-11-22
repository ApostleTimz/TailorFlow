const crypto = require('crypto');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/tailorflow';
const jwt = require('jsonwebtoken');
const { config, validateConfig, isStrongSecret } = require('../src/lib/config');
const { dateString, optionalDate, phoneSchema, passwordSchema, calendarRange, escapeLike } = require('../src/lib/validation');
const { signToken } = require('../src/middleware');

const productionEnv = {
  NODE_ENV: 'production', JWT_SECRET: crypto.randomBytes(32).toString('hex'), APP_URL: 'https://app.example.com', TRUST_PROXY: '1', DB_SYNC: 'false',
};

test('production configuration fails closed on weak secrets and plain HTTP', () => {
  assert.equal(validateConfig(productionEnv).production, true);
  assert.equal(validateConfig(productionEnv).dbSync, false);
  assert.throws(() => validateConfig({ ...productionEnv, JWT_SECRET: 'change-me-to-a-long-random-string-0000000000' }), /JWT_SECRET/);
  assert.throws(() => validateConfig({ ...productionEnv, JWT_SECRET: 'short' }), /JWT_SECRET/);
  assert.throws(() => validateConfig({ ...productionEnv, APP_URL: 'http://app.example.com' }), /https/);
  assert.throws(() => validateConfig({ ...productionEnv, TRUST_PROXY: 'many' }), /TRUST_PROXY/);
  const dev = validateConfig({ NODE_ENV: 'development', APP_URL: 'http://localhost:5173' });
  assert.equal(dev.production, false);
  assert.equal(isStrongSecret(dev.jwtSecret), true);
});

test('backend-side validation rejects impossible dates, bad phones and weak passwords', () => {
  assert.equal(dateString.safeParse('2026-02-28').success, true);
  assert.equal(dateString.safeParse('2026-02-30').success, false);
  assert.equal(dateString.safeParse('1800-01-01').success, false);
  assert.equal(optionalDate.parse(''), null);
  assert.equal(phoneSchema.parse(''), null);
  assert.equal(phoneSchema.safeParse('0803 123 4567').success, true);
  assert.equal(phoneSchema.safeParse('080-abc-4567').success, false);
  assert.equal(passwordSchema.safeParse('password123').success, false);
  assert.equal(passwordSchema.safeParse('a'.repeat(73)).success, false);
  assert.equal(passwordSchema.safeParse('é'.repeat(40)).success, false);
  assert.equal(calendarRange.safeParse({ start: '2026-03-10', end: '2026-03-01' }).success, false);
  assert.equal(calendarRange.safeParse({ start: '2026-01-01', end: '2028-01-01' }).success, false);
  assert.equal(escapeLike('50%_\\x'), '50\\%\\_\\\\x');
});

test('session tokens pin the algorithm, issuer, audience and token version', () => {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = signToken({ id, tokenVersion: 3 });
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: 'tailorflow', audience: 'tailorflow-api' });
  assert.equal(payload.sub, id);
  assert.equal(payload.ver, 3);
  assert.ok(payload.jti);
  assert.throws(() => jwt.verify(token, 'another-secret', { algorithms: ['HS256'] }), /invalid signature/);
});
