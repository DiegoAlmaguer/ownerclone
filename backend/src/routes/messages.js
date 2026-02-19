import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { msgLimiter } from '../middleware/rateLimit.js';
import { query } from '../db/index.js';
import { sendToUser } from '../realtime/wsHub.js';
import { pushStub } from './notifications.js';

const r = Router();
r.use(auth);

r.get('/:chatId', async (req, res) => {
  const rs = await query('SELECT * FROM messages WHERE chat_id=$1 ORDER BY created_at DESC LIMIT 100', [req.params.chatId]);
  res.json(rs.rows.reverse());
});

r.post('/:chatId', msgLimiter, async (req, res) => {
  const { clientMessageId, body, type = 'text', attachmentUrl = null } = req.body;
  if (!clientMessageId) return res.status(400).json({ error: 'clientMessageId required' });

  const dedupe = await query('SELECT * FROM messages WHERE chat_id=$1 AND client_message_id=$2', [req.params.chatId, clientMessageId]);
  if (dedupe.rowCount) return res.json(dedupe.rows[0]);

  const ins = await query(`INSERT INTO messages(chat_id,sender_id,client_message_id,body,type,attachment_url,status)
    VALUES($1,$2,$3,$4,$5,$6,'sent') RETURNING *`,
    [req.params.chatId, req.user.sub, clientMessageId, body || '', type, attachmentUrl]);

  const members = await query('SELECT user_id FROM chat_members WHERE chat_id=$1', [req.params.chatId]);
  for (const m of members.rows) {
    sendToUser(m.user_id, 'MessageCreated', ins.rows[0]);
    if (m.user_id !== req.user.sub) pushStub(m.user_id, { type: 'new_message', chatId: req.params.chatId });
  }
  res.status(201).json(ins.rows[0]);
});

r.post('/:chatId/:messageId/delivered', async (req, res) => {
  const up = await query("UPDATE messages SET status='delivered' WHERE id=$1 RETURNING *", [req.params.messageId]);
  if (up.rowCount) sendToUser(up.rows[0].sender_id, 'MessageDelivered', up.rows[0]);
  res.json({ ok: true });
});

r.post('/:chatId/:messageId/read', async (req, res) => {
  const up = await query("UPDATE messages SET status='read' WHERE id=$1 RETURNING *", [req.params.messageId]);
  if (up.rowCount) sendToUser(up.rows[0].sender_id, 'MessageRead', up.rows[0]);
  res.json({ ok: true });
});

export default r;
