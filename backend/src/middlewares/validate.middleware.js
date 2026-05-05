const { validationResult } = require('express-validator');

/**
 * Run after express-validator chains. Sends 400 with field-level errors if invalid.
 */
function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array({ onlyFirstError: true }).map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
}

module.exports = { validateRequest };
