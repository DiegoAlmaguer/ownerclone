import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema = JSON.parse(fs.readFileSync(new URL('../../src/schemas/message-events.schema.json', import.meta.url), 'utf8'));

test('contract schema includes required events', () => {
  const events = schema.properties.event.enum;
  for (const name of ['messageCreated', 'messageDelivered', 'messageRead']) {
    assert.ok(events.includes(name));
  }
});

test('payload requires client_message_id', () => {
  assert.ok(schema.properties.payload.required.includes('client_message_id'));
});
