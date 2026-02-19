import { Router } from 'express';
import { auth } from '../middleware/auth.js';

const tokens = new Map();
const r = Router();
r.use(auth);

r.post('/register-token', (req, res) => {
  tokens.set(req.user.sub, req.body.token);
  res.json({ ok: true, provider: req.body.provider || 'dev-stub' });
});

export function pushStub(userId, payload) {
  const token = tokens.get(userId);
  if (token) console.log('push_stub', { userId, token, payload });
}

export default r;
