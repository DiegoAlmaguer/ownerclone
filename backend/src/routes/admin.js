import { Router } from 'express';
import { auth, adminOnly } from '../middleware/auth.js';
import { query } from '../db/index.js';

const r = Router();
r.use(auth, adminOnly);

r.get('/users', async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const rs = await query('SELECT id, phone, name, username, is_blocked FROM users WHERE phone ILIKE $1 OR name ILIKE $1 OR COALESCE(username,\'\') ILIKE $1 LIMIT 50', [q]);
  res.json(rs.rows);
});

r.post('/users/:id/block', async (req, res) => {
  await query('UPDATE users SET is_blocked=true WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

r.get('/reports', async (_req, res) => {
  const rs = await query('SELECT * FROM reports ORDER BY created_at DESC LIMIT 100');
  res.json(rs.rows);
});

export default r;
