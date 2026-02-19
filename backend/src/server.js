import http from 'http';
import { WebSocketServer } from 'ws';
import { app } from './app.js';
import { env } from './config/env.js';
import { verifyToken } from './utils/jwt.js';
import { registerSocket, unregisterSocket } from './realtime/wsHub.js';

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) throw new Error('Missing token');
    const payload = verifyToken(token);

    ws.userId = payload.sub;
    registerSocket(payload.sub, ws);
    ws.send(JSON.stringify({ event: 'Connected', payload: { userId: payload.sub } }));

    ws.on('close', () => unregisterSocket(payload.sub, ws));
    ws.on('error', (err) => console.error('[ws-error]', err.message));
  } catch (e) {
    console.error('[ws-auth-error]', e.message);
    ws.close();
  }
});

process.on('unhandledRejection', (e) => {
  console.error('[unhandledRejection]', e);
});
process.on('uncaughtException', (e) => {
  console.error('[uncaughtException]', e);
});

server.listen(env.port, () => {
  console.log(`Onyx backend listening on :${env.port}`);
});
