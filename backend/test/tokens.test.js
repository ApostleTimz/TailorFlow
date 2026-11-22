const test = require('node:test');
const assert = require('node:assert/strict');
const { createToken, tokenHash } = require('../src/lib/tokens');

test('account tokens are high entropy and stored as one-way hashes', () => {
  const first = createToken();
  const second = createToken();
  assert.equal(first.length, 64);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.notEqual(tokenHash(first), first);
  assert.equal(tokenHash(first), tokenHash(first));
});
