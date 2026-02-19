const userSockets = new Map();

export function registerSocket(userId, ws) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(ws);
}

export function unregisterSocket(userId, ws) {
  userSockets.get(userId)?.delete(ws);
}

export function sendToUser(userId, event, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const data = JSON.stringify({ event, payload });
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(data);
  }
}
