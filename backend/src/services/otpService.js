import { redis } from '../db/index.js';
import { env } from '../config/env.js';

const OTP_TTL = 300;

export async function sendOtp(phone) {
  const code = env.otpDevCode;
  await redis.setex(`otp:${phone}`, OTP_TTL, code);
  return { ok: true, code }; // mock for dev
}

export async function verifyOtp(phone, code) {
  const saved = await redis.get(`otp:${phone}`);
  return saved && saved === code;
}
