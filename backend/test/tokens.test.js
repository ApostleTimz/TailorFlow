const test = require('node:test');
const assert = require('node:assert/strict');
const { createToken, createVerificationCode, tokenHash } = require('../src/lib/tokens');

test('account tokens are high entropy and stored as one-way hashes', () => {
  const first = createToken();
  const second = createToken();
  assert.equal(first.length, 64);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.notEqual(tokenHash(first), first);
  assert.equal(tokenHash(first), tokenHash(first));
});

test('verification codes are always six digits and stored as one-way hashes', () => {
  for (let i = 0; i < 25; i += 1) {
    const code = createVerificationCode();
    assert.equal(code.length, 6);
    assert.match(code, /^\d{6}$/);
    assert.notEqual(tokenHash(code), code);
  }
});
