const { User, Permission } = require('../models');
const createHttpError = require('../utils/httpError');
const { computeEffectivePermissions, hasAllPermissions, permKey } = require('../utils/effectivePermissions');

/**
 * Requires `authenticate` to run first (`req.auth.sub`).
 * Legacy middleware name kept for compatibility.
 * Access is permission-based (full permission catalog), not role-name based.
 */
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.auth.sub)
      .populate({
        path: 'role',
        select: 'name permissions',
        populate: {
          path: 'permissions',
          select: 'resource action description',
        },
      })
      .populate('customPermissions', 'resource action description')
      .populate('deniedPermissions', 'resource action description');

    if (!user || !user.role) {
      return next(createHttpError(403, 'Forbidden'));
    }

    const effectivePermissions = computeEffectivePermissions(
      (user.role.permissions || []).filter(Boolean),
      (user.customPermissions || []).filter(Boolean),
      (user.deniedPermissions || []).filter(Boolean)
    );
    const allPermissions = await Permission.find({}, 'resource action').lean();
    const allPermissionKeys = allPermissions.map((p) => permKey(p)).filter(Boolean);
    const fullSystemAccess = hasAllPermissions(effectivePermissions, allPermissionKeys);

    if (!fullSystemAccess) {
      return next(createHttpError(403, 'Full permission set required'));
    }

    req.user = user;
    req.rbac = {
      user,
      effectivePermissions,
      fullSystemAccess,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAdmin };
