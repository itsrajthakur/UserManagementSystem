const createHttpError = require('../utils/httpError');
const { verifyToken } = require('../utils/jwt');

const BEARER_PREFIX = 'Bearer ';

/**
 * Expects `Authorization: Bearer <token>`.
 * Attaches decoded JWT payload to `req.auth` (includes `sub` = user id).
 * Forwards JsonWebTokenError / TokenExpiredError to the global error handler.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    if (!payload.sub) {
      return next(createHttpError(401, 'Invalid token payload'));
    }
    req.auth = payload;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authenticate };
