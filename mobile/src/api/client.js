const API = 'http://localhost:8080';
export async function api(path, method='GET', body, token) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
}
export { API };
