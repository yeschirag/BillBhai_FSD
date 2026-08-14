function notFoundHandler(req, res) {
  res.status(404).json({
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    error: 'Not Found',
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number(err?.statusCode || err?.status || 500);
  const message = err?.message || 'Internal server error';
  const errorName = statusCode >= 500 ? 'Internal Server Error' : (err?.error || 'Error');

  if (statusCode >= 500) {
    console.error('[EXPRESS_ERROR]', req.method, req.originalUrl, err);
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
