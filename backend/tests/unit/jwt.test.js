import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken } from '../../src/utils/jwt.js';

test('jwt sign/verify roundtrip', () => {
  const token = signToken({ sub: 'u1', role: 'user' });
  const payload = verifyToken(token);
  assert.equal(payload.sub, 'u1');
  assert.equal(payload.role, 'user');
});
