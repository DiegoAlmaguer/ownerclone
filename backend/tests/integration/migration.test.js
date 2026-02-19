import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../../migrations/001_init.sql', import.meta.url), 'utf8');

test('schema has idempotency unique index for messages', () => {
  assert.match(sql, /UNIQUE\(chat_id, client_message_id\)/);
});

test('schema has reports table', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS reports/);
});
