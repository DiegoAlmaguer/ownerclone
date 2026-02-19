import { verifyToken } from '../utils/jwt.js';

export function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin only' } });
  }
  next();
}
