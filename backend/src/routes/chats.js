import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const r = Router();
r.use(auth);

r.get('/', async (req, res) => {
  const rs = await query(`SELECT c.* FROM chats c
    JOIN chat_members m ON m.chat_id=c.id
    WHERE m.user_id=$1 ORDER BY c.updated_at DESC`, [req.user.sub]);
  res.json(rs.rows);
});

r.post('/direct', async (req, res) => {
  const { peerUserId } = req.body;
  const me = req.user.sub;
  const found = await query(`SELECT c.id FROM chats c
    JOIN chat_members m1 ON m1.chat_id=c.id AND m1.user_id=$1
    JOIN chat_members m2 ON m2.chat_id=c.id AND m2.user_id=$2
    WHERE c.type='direct' LIMIT 1`, [me, peerUserId]);
  if (found.rowCount) return res.json({ chatId: found.rows[0].id });

  const chat = await query('INSERT INTO chats(type,title,owner_id) VALUES($1,$2,$3) RETURNING *', ['direct', null, me]);
  await query('INSERT INTO chat_members(chat_id,user_id,role) VALUES ($1,$2,$3),($1,$4,$3)', [chat.rows[0].id, me, 'member', peerUserId]);
  res.status(201).json(chat.rows[0]);
});

r.post('/group', async (req, res) => {
  const { title, memberIds = [] } = req.body;
  const me = req.user.sub;
  const chat = await query('INSERT INTO chats(type,title,owner_id) VALUES($1,$2,$3) RETURNING *', ['group', title || 'New Group', me]);
  await query('INSERT INTO chat_members(chat_id,user_id,role) VALUES($1,$2,$3)', [chat.rows[0].id, me, 'owner']);
  for (const id of memberIds) {
    await query('INSERT INTO chat_members(chat_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [chat.rows[0].id, id, 'member']);
  }
  res.status(201).json(chat.rows[0]);
});

r.post('/:chatId/members', async (req, res) => {
  const { userId } = req.body;
  await query('INSERT INTO chat_members(chat_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [req.params.chatId, userId, 'member']);
  res.json({ ok: true });
});

export default r;
