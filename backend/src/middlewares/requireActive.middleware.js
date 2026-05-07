const { User } = require('../models');
const createHttpError = require('../utils/httpError');

/**
 * After `authenticate`. Blocks requests if the account is deactivated.
 */
async function requireActiveUser(req, res, next) {
  try {
    const user = await User.findById(req.auth.sub)
      .select('isActive isDeleted')
      .populate('role', 'isActive isDeleted');
    if (!user) {
      return next(createHttpError(401, 'User not found'));
    }
    if (user.isDeleted) {
      return next(createHttpError(403, 'Account is deleted'));
    }
    if (!user.isActive) {
      return next(createHttpError(403, 'Account is deactivated'));
    }
    if (!user.role || user.role.isDeleted) {
      return next(createHttpError(403, 'Assigned role is deleted. Please contact admin.'));
    }
    if (user.role.isActive === false) {
      return next(createHttpError(403, 'Your role is inactive. Please contact admin.'));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireActiveUser };
