const { mapPgError } = require('../utils/http');

function notFoundHandler(req, res) {
  res.status(404).json({
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: 'Not Found',
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // PostgreSQL constraint violations become client-appropriate errors here,
  // so services and routes never hand-roll this mapping.
  const mapped = mapPgError(err);
  if (mapped) {
    return res.status(mapped.statusCode).json({
      statusCode: mapped.statusCode,
      message: mapped.message,
      error: mapped.error,
    });
  }

  const statusCode = Number(err?.statusCode || err?.status || 500);
  const message = err?.message || 'Internal server error';
  const errorName = statusCode >= 500 ? 'Internal Server Error' : (err?.error || 'Error');

  if (statusCode >= 500) {
    // Log enough to debug, without dumping query parameters (may hold PII).
    console.error('[EXPRESS_ERROR]', req.method, req.originalUrl, err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
  }

  return res.status(statusCode).json({
    statusCode,
    message,
    error: errorName,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
