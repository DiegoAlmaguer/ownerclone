import Minio from 'minio';
import { env } from '../config/env.js';

const url = new URL(env.s3Endpoint);

const client = new Minio.Client({
  endPoint: url.hostname,
  port: Number(url.port || 9000),
  useSSL: url.protocol === 'https:',
  accessKey: env.s3AccessKey,
  secretKey: env.s3SecretKey
});

export async function uploadBuffer(key, buffer, contentType) {
  await client.putObject(env.s3Bucket, key, buffer, { 'Content-Type': contentType || 'application/octet-stream' });
  return `${env.s3Endpoint}/${env.s3Bucket}/${key}`;
}
