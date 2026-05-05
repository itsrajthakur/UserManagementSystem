const { User } = require('../models');
const createHttpError = require('../utils/httpError');
const { blockUnverifiedApi } = require('../config/env');

/**
 * After `authenticate` / `requireActiveUser`. Blocks API use until email verified when
 * BLOCK_UNVERIFIED_API=true (used with REQUIRE_EMAIL_VERIFICATION on signup).
 */
async function requireVerifiedEmail(req, res, next) {
  if (!blockUnverifiedApi) {
    return next();
  }

  try {
    const user = await User.findById(req.auth.sub).select('emailVerified');
    if (!user?.emailVerified) {
      return next(createHttpError(403, 'Please verify your email to continue'));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireVerifiedEmail };
