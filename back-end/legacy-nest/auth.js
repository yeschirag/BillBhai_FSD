const jwt = require('jsonwebtoken');

function authMiddleware(requiredRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Missing or invalid Authorization header token',
        error: 'Unauthorized',
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'billbhai-super-secret-key-change-in-production',
      );

      req.user = decoded;

      if (!requiredRoles.length) {
        return next();
      }

      const userRole = String(decoded.role || '').trim().toLowerCase().replace(/\s+/g, '');
      const allowedRoles = requiredRoles.map((role) =>
        String(role).trim().toLowerCase().replace(/\s+/g, ''),
      );

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          statusCode: 403,
          message: `Access denied for role: ${decoded.role}. Allowed roles: ${requiredRoles.join(', ')}`,
          error: 'Forbidden',
        });
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Invalid or expired authentication token',
        error: 'Unauthorized',
      });
    }
  };
}

module.exports = authMiddleware;
