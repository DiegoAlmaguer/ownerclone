export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function api(path, { method = 'GET', token, body, isForm } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });
  const json = await res.json().catch(() => ({ ok: false, error: { message: 'Non-JSON response' } }));
  if (!res.ok) throw new Error(json?.error?.message || 'Request failed');
  return json;
}

export function connectWs(token, onEvent, onState) {
  const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/ws?token=${token}`);
  ws.onopen = () => onState('online');
  ws.onclose = () => onState('offline');
  ws.onerror = () => onState('reconnecting');
  ws.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    onEvent(data);
  };
  return ws;
}
