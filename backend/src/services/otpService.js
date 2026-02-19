import { redis } from '../db/index.js';
import { env } from '../config/env.js';

const OTP_TTL = 300;

async function ensureRedis() {
  if (redis.status !== 'ready') {
    try { await redis.connect(); } catch {}
  }
}

export async function sendOtp(phone) {
  const code = env.otpDevCode;
  await ensureRedis();
  await redis.setex(`otp:${phone}`, OTP_TTL, code);
  return { ok: true, code };
}

export async function verifyOtp(phone, code) {
  await ensureRedis();
  const saved = await redis.get(`otp:${phone}`);
  return saved && saved === code;
}
