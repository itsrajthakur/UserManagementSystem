const { User, Permission } = require('../models');
const createHttpError = require('../utils/httpError');
const {
  computeEffectivePermissions,
  matchesPermission,
  hasAllPermissions,
  permKey,
} = require('../utils/effectivePermissions');

const PERMISSION_SELECT = 'resource action description';

/**
 * Route guard: requires `authenticate` (+ typically `requireActiveUser`) earlier in the chain.
 * Resolves permissions from **role.permissions** and **customPermissions**, then allows
 * the request only if the union contains `resource` + `action`.
 *
 * Full access is permission-based (not role-name based): if the user's effective permission set
 * contains every permission in the catalog, they bypass all fine-grained checks.
 *
 * @param {string} resource - e.g. `users` (see `RESOURCES` in constants/rbac.js)
 * @param {string} action - `create` | `read` | `update` | `delete` (see `ACTIONS`)
 * @returns {import('express').RequestHandler}
 */
function authorize(resource, action) {
  return async function authorizeMiddleware(req, res, next) {
    try {
      if (!req.auth?.sub) {
        return next(createHttpError(401, 'Authentication required'));
      }

      const user = await User.findById(req.auth.sub)
        .populate({
          path: 'role',
          select: 'name permissions',
          populate: {
            path: 'permissions',
            select: PERMISSION_SELECT,
          },
        })
        .populate({
          path: 'customPermissions',
          select: PERMISSION_SELECT,
        })
        .populate({
          path: 'deniedPermissions',
          select: PERMISSION_SELECT,
        });

      if (!user || !user.role) {
        return next(createHttpError(403, 'Forbidden'));
      }

      const rolePermissions = (user.role.permissions || []).filter(Boolean);
      const customPermissions = (user.customPermissions || []).filter(Boolean);
      const deniedPermissions = (user.deniedPermissions || []).filter(Boolean);
      const effectivePermissions = computeEffectivePermissions(
        rolePermissions,
        customPermissions,
        deniedPermissions
      );

      req.rbac = {
        user,
        effectivePermissions,
      };

      const allPermissions = await Permission.find({}, 'resource action').lean();
      const allPermissionKeys = allPermissions.map((p) => permKey(p)).filter(Boolean);
      const fullSystemAccess = hasAllPermissions(effectivePermissions, allPermissionKeys);
      req.rbac.fullSystemAccess = fullSystemAccess;

      if (fullSystemAccess) {
        return next();
      }

      if (!matchesPermission(effectivePermissions, resource, action)) {
        return next(createHttpError(403, 'Insufficient permissions'));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  authorize,
};
