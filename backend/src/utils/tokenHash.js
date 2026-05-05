const crypto = require('crypto');

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

function generateRawToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { hashToken, generateRawToken };
