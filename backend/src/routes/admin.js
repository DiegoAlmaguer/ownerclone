import { Router } from 'express';
import { auth, adminOnly } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { asyncHandler } from '../middleware/error.js';
import { userDto } from '../utils/serializers.js';

const r = Router();
r.use(auth, adminOnly);

r.get('/users', asyncHandler(async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const rs = await query('SELECT id, phone, name, username, role, is_blocked FROM users WHERE phone ILIKE $1 OR name ILIKE $1 OR COALESCE(username,\'\') ILIKE $1 LIMIT 50', [q]);
  res.json({ ok: true, users: rs.rows.map(userDto) });
}));

r.post('/users/:id/block', asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_blocked=true WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}));

r.get('/reports', asyncHandler(async (_req, res) => {
  const rs = await query('SELECT * FROM reports ORDER BY created_at DESC LIMIT 100');
  res.json({ ok: true, reports: rs.rows });
}));

export default r;
