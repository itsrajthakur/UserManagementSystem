const jwt = require('jsonwebtoken');
const { jwt: jwtConfig, isProd } = require('../config/env');

function signToken(payload, options = {}) {
  if (!jwtConfig.secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    ...options,
  });
}

function verifyToken(token) {
  if (!jwtConfig.secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, jwtConfig.secret);
}

function assertJwtSecret() {
  if (isProd && !jwtConfig.secret) {
    throw new Error('JWT_SECRET is required in production');
  }
}

module.exports = { signToken, verifyToken, assertJwtSecret };
