import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chats.js';
import msgRoutes from './routes/messages.js';
import mediaRoutes from './routes/media.js';
import adminRoutes from './routes/admin.js';
import moderationRoutes from './routes/moderation.js';
import notificationRoutes from './routes/notifications.js';

export const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/v1/auth', authRoutes);
app.use('/v1/chats', chatRoutes);
app.use('/v1/messages', msgRoutes);
app.use('/v1/media', mediaRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/moderation', moderationRoutes);
app.use('/v1/notifications', notificationRoutes);
