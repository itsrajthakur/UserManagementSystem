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
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 12000,
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

async function sendVerificationEmail({ toEmail, verifyUrl }) {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL');
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `${smtp.fromName} <${smtp.fromEmail}>`,
    to: toEmail,
    subject: 'Verify your email address',
    text: `Welcome!\n\nPlease verify your email address by opening this link:\n${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Verify your email</h2>
        <p>Thanks for signing up. Please confirm your email address to start using the application.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;padding:10px 14px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">
            Verify Email
          </a>
        </p>
        <p style="margin-top: 14px;">If the button does not work, use this link:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `,
  });
}

async function sendAdminCreatedUserCredentialsEmail({ toEmail, tempPassword, loginUrl }) {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL');
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `${smtp.fromName} <${smtp.fromEmail}>`,
    to: toEmail,
    subject: 'Your account has been created',
    text: `Your account has been created by an administrator.\n\nLogin email: ${toEmail}\nTemporary password: ${tempPassword}\nLogin URL: ${loginUrl}\n\nPlease login and reset your password.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Your account is ready</h2>
        <p>Your account has been created by an administrator.</p>
        <p><strong>Login email:</strong> ${toEmail}</p>
        <p><strong>Temporary password:</strong> ${tempPassword}</p>
        <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p style="margin-top: 14px;">Please login and reset your password.</p>
      </div>
    `,
  });
}

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendAdminCreatedUserCredentialsEmail,
};
