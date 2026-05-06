const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseOrigins(value) {
  if (!value || typeof value !== 'string') return true;
  const list = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : true;
}

const nodeEnv = process.env.NODE_ENV || 'development';

const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
const blockUnverifiedApi = process.env.BLOCK_UNVERIFIED_API === 'true';
const appPublicUrl = process.env.APP_PUBLIC_URL || 'http://localhost:5173';

module.exports = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  corsOrigin: parseOrigins(process.env.CORS_ORIGIN),
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  requireEmailVerification,
  blockUnverifiedApi,
  appPublicUrl,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || '',
    fromName: process.env.SMTP_FROM_NAME || 'User Management System',
  },
};
