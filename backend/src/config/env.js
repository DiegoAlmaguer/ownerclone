import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 8080),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  s3Endpoint: process.env.S3_ENDPOINT,
  s3AccessKey: process.env.S3_ACCESS_KEY,
  s3SecretKey: process.env.S3_SECRET_KEY,
  s3Bucket: process.env.S3_BUCKET || 'onyx-media',
  s3Region: process.env.S3_REGION || 'us-east-1',
  otpDevCode: process.env.OTP_DEV_CODE || '123456'
};
