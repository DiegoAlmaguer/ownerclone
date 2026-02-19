import pg from 'pg';
import Redis from 'ioredis';
import { env } from '../config/env.js';

export const pool = new pg.Pool({ connectionString: env.databaseUrl });
export const redis = new Redis(env.redisUrl);

export async function query(text, params = []) {
  return pool.query(text, params);
}
