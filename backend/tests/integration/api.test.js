import request from 'supertest';
import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockSendOtp = jest.fn();
const mockVerifyOtp = jest.fn();

jest.unstable_mockModule('../../src/db/index.js', () => ({ query: mockQuery }));
jest.unstable_mockModule('../../src/services/otpService.js', () => ({ sendOtp: mockSendOtp, verifyOtp: mockVerifyOtp }));

const { app } = await import('../../src/app.js');
const { signToken } = await import('../../src/utils/jwt.js');

describe('Onyx API integration', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockSendOtp.mockReset();
    mockVerifyOtp.mockReset();
  });

  test('otp send', async () => {
    mockSendOtp.mockResolvedValue({ code: '123456' });
    const res = await request(app).post('/v1/auth/otp/send').send({ phone: '+1' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('otp verify', async () => {
    mockVerifyOtp.mockResolvedValue(true);
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'u1', phone: '+1', name: 'A', username: null, role: 'user', is_blocked: false }] });

    const res = await request(app).post('/v1/auth/otp/verify').send({ phone: '+1', code: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test('users search', async () => {
    const token = signToken({ sub: 'u1', role: 'user', phone: '+1' });
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'u2', phone: '+2', name: 'B', username: null, role: 'user', is_blocked: false }] });
    const res = await request(app).get('/v1/users/search?q=b').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.users[0].id).toBe('u2');
  });

  test('create direct chat', async () => {
    const token = signToken({ sub: 'u1', role: 'user', phone: '+1' });
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'u2' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'c1', type: 'direct', title: null, owner_id: 'u1', updated_at: 'now', created_at: 'now' }] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [] });
    const res = await request(app).post('/v1/chats/direct').set('Authorization', `Bearer ${token}`).send({ peerUserId: 'u2' });
    expect(res.status).toBe(201);
    expect(res.body.chat.id).toBe('c1');
  });

  test('send message + list messages', async () => {
    const token = signToken({ sub: 'u1', role: 'user', phone: '+1' });

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'm1', chat_id: 'c1', sender_id: 'u1', client_message_id: 'cm1', body: 'hi', type: 'text', attachment_url: null, attachments: [], status: 'sent', created_at: 'now' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [{ user_id: 'u1' }, { user_id: 'u2' }] });

    const sent = await request(app).post('/v1/messages').set('Authorization', `Bearer ${token}`).send({ chatId: 'c1', clientMessageId: 'cm1', body: 'hi', attachments: [] });
    expect(sent.status).toBe(201);

    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'm1', chat_id: 'c1', sender_id: 'u1', client_message_id: 'cm1', body: 'hi', type: 'text', attachment_url: null, attachments: [], status: 'sent', created_at: 'now' }] });
    const list = await request(app).get('/v1/messages/c1').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.messages).toHaveLength(1);
  });
});
