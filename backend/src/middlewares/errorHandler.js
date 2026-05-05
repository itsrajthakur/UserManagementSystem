const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const logger = require('../utils/logger');
const { isProd } = require('../config/env');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  logger.error(err.message, {
    path: req.path,
    method: req.method,
    stack: isProd ? undefined : err.stack,
  });

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: 'Invalid identifier' });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 2 MB)' : err.message || 'Upload error';
    return res.status(400).json({ success: false, message });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      field,
    });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  const status = Number(err.status) || Number(err.statusCode) || 500;
  const message =
    status === 500 && isProd ? 'Internal server error' : err.message || 'Internal server error';

  return res.status(status).json({ success: false, message });
}

module.exports = errorHandler;
