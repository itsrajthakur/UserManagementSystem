const { User } = require('../models');
const createHttpError = require('../utils/httpError');

/**
 * After `authenticate`. Blocks requests if the account is deactivated.
 */
async function requireActiveUser(req, res, next) {
  try {
    const user = await User.findById(req.auth.sub).select('isActive');
    if (!user) {
      return next(createHttpError(401, 'User not found'));
    }
    if (!user.isActive) {
      return next(createHttpError(403, 'Account is deactivated'));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireActiveUser };
