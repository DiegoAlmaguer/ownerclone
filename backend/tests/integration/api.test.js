import request from 'supertest';
import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockSendOtp = jest.fn();
const mockVerifyOtp = jest.fn();

jest.unstable_mockModule('../../src/db/index.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../src/services/otpService.js', () => ({
  sendOtp: mockSendOtp,
  verifyOtp: mockVerifyOtp
}));

const { app } = await import('../../src/app.js');

describe('Onyx API integration', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockSendOtp.mockReset();
    mockVerifyOtp.mockReset();
  });

  test('otp send/verify flow', async () => {
    mockSendOtp.mockResolvedValue({ code: '123456' });
    mockVerifyOtp.mockResolvedValue(true);
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'u1', phone: '+1', name: 'A', username: null, role: 'user', is_blocked: false }] });

    const sendRes = await request(app).post('/v1/auth/otp/send').send({ phone: '+1' });
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.ok).toBe(true);

    const verifyRes = await request(app).post('/v1/auth/otp/verify').send({ phone: '+1', code: '123456' });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toBeDefined();
    expect(verifyRes.body.user.id).toBe('u1');
  });

  test('create direct chat requires peerUserId (regression for empty reply)', async () => {
    const { signToken } = await import('../../src/utils/jwt.js');
    const token = signToken({ sub: 'u1', role: 'user', phone: '+1' });
    const res = await request(app).post('/v1/chats/direct').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  test('create direct chat + send + list messages', async () => {
    // auth middleware is integration concern with real token elsewhere; here bypass by monkey patching verify via signed token path not mocked.
    const { signToken } = await import('../../src/utils/jwt.js');
    const token = signToken({ sub: 'u1', role: 'user', phone: '+1' });

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'u2' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'c1', type: 'direct', title: null, owner_id: 'u1', updated_at: 'now', created_at: 'now' }] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [] });

    const direct = await request(app).post('/v1/chats/direct').set('Authorization', `Bearer ${token}`).send({ peerUserId: 'u2' });
    expect(direct.status).toBe(201);
    expect(direct.body.chat.id).toBe('c1');

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'm1', chat_id: 'c1', sender_id: 'u1', client_message_id: 'cm1', body: 'hi', type: 'text', attachment_url: null, status: 'sent', created_at: 'now' }] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [{ user_id: 'u1' }, { user_id: 'u2' }] });

    const sent = await request(app).post('/v1/messages').set('Authorization', `Bearer ${token}`).send({ chatId: 'c1', clientMessageId: 'cm1', body: 'hi' });
    expect(sent.status).toBe(201);
    expect(sent.body.message.body).toBe('hi');

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'm1', chat_id: 'c1', sender_id: 'u1', client_message_id: 'cm1', body: 'hi', type: 'text', attachment_url: null, status: 'sent', created_at: 'now' }] });

    const list = await request(app).get('/v1/messages/c1').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.messages).toHaveLength(1);
  });
});
