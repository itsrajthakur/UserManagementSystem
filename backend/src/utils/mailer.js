const nodemailer = require('nodemailer');
const { smtp } = require('../config/env');

let cachedTransporter = null;

function isSmtpConfigured() {
  return Boolean(smtp.host && smtp.port && smtp.user && smtp.pass && smtp.fromEmail);
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });
  return cachedTransporter;
}

async function sendPasswordResetEmail({ toEmail, resetUrl }) {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL');
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `${smtp.fromName} <${smtp.fromEmail}>`,
    to: toEmail,
    subject: 'Reset your password',
    text: `You requested a password reset.\n\nUse this link to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Reset your password</h2>
        <p>You requested a password reset for your account.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 14px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">
            Set New Password
          </a>
        </p>
        <p style="margin-top: 14px;">If the button does not work, use this link:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="margin-top: 14px;">This link expires in 1 hour.</p>
      </div>
    `,
  });
}

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail,
};
