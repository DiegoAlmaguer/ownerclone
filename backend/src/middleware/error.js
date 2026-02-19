export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function notFound(_req, res) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const payload = {
    ok: false,
    error: {
      code: err.code || (status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message: err.message || 'Unexpected error'
    }
  };
  if (status >= 500) {
    console.error('[backend-error]', {
      route: _req?.originalUrl,
      method: _req?.method,
      userId: _req?.user?.sub,
      message: err.message,
      stack: err.stack
    });
  }
  res.status(status).json(payload);
}

export function badRequest(message, code = 'BAD_REQUEST') {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = code;
  return err;
}
