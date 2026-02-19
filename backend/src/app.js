import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chats.js';
import msgRoutes from './routes/messages.js';
import mediaRoutes from './routes/media.js';
import adminRoutes from './routes/admin.js';
import moderationRoutes from './routes/moderation.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import { query } from './db/index.js';
import { errorHandler, notFound } from './middleware/error.js';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/v1/health', async (_req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.use('/v1/auth', authRoutes);
app.use('/v1/chats', chatRoutes);
app.use('/v1/messages', msgRoutes);
app.use('/v1/media', mediaRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/moderation', moderationRoutes);
app.use('/v1/notifications', notificationRoutes);
app.use('/v1/users', userRoutes);

app.use(notFound);
app.use(errorHandler);
