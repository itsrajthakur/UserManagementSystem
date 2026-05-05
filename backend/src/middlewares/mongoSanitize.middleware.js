const { sanitize } = require('express-mongo-sanitize');

/**
 * NoSQL-injection hardening without reassigning req fields.
 * Express 5 exposes `req.query` (and potentially other fields) as getter-only; the stock
 * express-mongo-sanitize middleware does `req.query = target`, which throws TypeError.
 */
function mongoSanitizeMiddleware(options = {}) {
  return function mongoSanitizeMw(req, _res, next) {
    const keys = ['body', 'params', 'query', 'headers'];
    for (const key of keys) {
      const obj = req[key];
      if (obj && typeof obj === 'object') {
        sanitize(obj, options);
      }
    }
    next();
  };
}

module.exports = { mongoSanitizeMiddleware };
