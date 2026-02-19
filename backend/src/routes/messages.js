import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { msgLimiter } from '../middleware/rateLimit.js';
import { query } from '../db/index.js';
import { sendToUser } from '../realtime/wsHub.js';
import { pushStub } from './notifications.js';
import { asyncHandler, badRequest } from '../middleware/error.js';
import { messageDto } from '../utils/serializers.js';

const r = Router();
r.use(auth);

r.get('/:chatId', asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const member = await query('SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2', [chatId, req.user.sub]);
  if (!member.rowCount) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Not a chat member' } });

  const rs = await query('SELECT * FROM messages WHERE chat_id=$1 ORDER BY created_at DESC LIMIT 100', [chatId]);
  res.json({ ok: true, messages: rs.rows.reverse().map(messageDto) });
}));

async function sendMessage(req, res) {
  const { chatId, clientMessageId, body = '', type = 'text', attachmentUrl = null } = req.body || {};
  const cid = chatId || req.params.chatId;
  if (!cid) throw badRequest('chatId is required');
  if (!clientMessageId) throw badRequest('clientMessageId is required');
  if (!body && !attachmentUrl) throw badRequest('body or attachmentUrl is required');

  const member = await query('SELECT 1 FROM chat_members WHERE chat_id=$1 AND user_id=$2', [cid, req.user.sub]);
  if (!member.rowCount) return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Not a chat member' } });

  const dedupe = await query('SELECT * FROM messages WHERE chat_id=$1 AND client_message_id=$2', [cid, clientMessageId]);
  if (dedupe.rowCount) return res.json({ ok: true, message: messageDto(dedupe.rows[0]), deduplicated: true });

  const ins = await query(`INSERT INTO messages(chat_id,sender_id,client_message_id,body,type,attachment_url,status)
    VALUES($1,$2,$3,$4,$5,$6,'sent') RETURNING *`,
    [cid, req.user.sub, clientMessageId, body, type, attachmentUrl]);

  const msg = messageDto(ins.rows[0]);
  const members = await query('SELECT user_id FROM chat_members WHERE chat_id=$1', [cid]);
  for (const m of members.rows) {
    sendToUser(m.user_id, 'MessageCreated', msg);
    if (m.user_id !== req.user.sub) pushStub(m.user_id, { type: 'new_message', chatId: cid });
  }
  res.status(201).json({ ok: true, message: msg });
}

r.post('/', msgLimiter, asyncHandler(sendMessage));
r.post('/:chatId', msgLimiter, asyncHandler(sendMessage));

r.post('/:chatId/:messageId/delivered', asyncHandler(async (req, res) => {
  const up = await query("UPDATE messages SET status='delivered' WHERE id=$1 RETURNING *", [req.params.messageId]);
  if (!up.rowCount) throw badRequest('message not found', 'NOT_FOUND');
  const msg = messageDto(up.rows[0]);
  sendToUser(msg.senderId, 'MessageDelivered', msg);
  res.json({ ok: true, message: msg });
}));

r.post('/:chatId/:messageId/read', asyncHandler(async (req, res) => {
  const up = await query("UPDATE messages SET status='read' WHERE id=$1 RETURNING *", [req.params.messageId]);
  if (!up.rowCount) throw badRequest('message not found', 'NOT_FOUND');
  const msg = messageDto(up.rows[0]);
  sendToUser(msg.senderId, 'MessageRead', msg);
  res.json({ ok: true, message: msg });
}));

export default r;
