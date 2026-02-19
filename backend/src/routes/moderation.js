import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const r = Router();
r.use(auth);

r.post('/report', async (req, res) => {
  const { targetUserId, targetChatId, reason } = req.body;
  const rs = await query('INSERT INTO reports(reporter_id,target_user_id,target_chat_id,reason) VALUES($1,$2,$3,$4) RETURNING *',
    [req.user.sub, targetUserId || null, targetChatId || null, reason || 'abuse']);
  res.status(201).json(rs.rows[0]);
});

export default r;
