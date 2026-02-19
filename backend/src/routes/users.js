import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { asyncHandler } from '../middleware/error.js';
import { userDto } from '../utils/serializers.js';

const r = Router();
r.use(auth);

r.get('/me', asyncHandler(async (req, res) => {
  const rs = await query('SELECT id, phone, name, username, role, is_blocked FROM users WHERE id=$1', [req.user.sub]);
  res.json({ ok: true, user: userDto(rs.rows[0]) });
}));

r.get('/search', asyncHandler(async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const rs = await query('SELECT id, phone, name, username, role, is_blocked FROM users WHERE phone ILIKE $1 OR name ILIKE $1 OR COALESCE(username,\'\') ILIKE $1 LIMIT 20', [q]);
  res.json({ ok: true, users: rs.rows.map(userDto) });
}));

export default r;
