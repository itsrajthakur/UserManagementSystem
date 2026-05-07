const { User, Permission } = require('../models');
const createHttpError = require('../utils/httpError');
const {
  computeEffectivePermissions,
  matchesPermission,
  hasAllPermissions,
  permKey,
} = require('../utils/effectivePermissions');
const { inferRoleLevel, isSuperAdminLevel } = require('../utils/roleHierarchy');

const PERMISSION_SELECT = 'resource action description';

/**
 * Load current user, effective permissions, and privilege level into `req.rbac`.
 * Does not enforce any permission — use `authorize()` or custom checks.
 */
async function attachRbac(req) {
  if (!req.auth?.sub) {
    throw createHttpError(401, 'Authentication required');
  }

  if (req.rbac?.user && typeof req.rbac.actorRoleLevel === 'number') {
    return;
  }

  const user = await User.findOne({ _id: req.auth.sub, isDeleted: false })
    .populate({
      path: 'role',
      select: 'name permissions roleLevel isActive isDeleted',
      match: { isDeleted: false },
      populate: {
        path: 'permissions',
        select: PERMISSION_SELECT,
        match: { isDeleted: false },
      },
    })
    .populate({
      path: 'customPermissions',
      select: PERMISSION_SELECT,
      match: { isDeleted: false },
    })
    .populate({
      path: 'deniedPermissions',
      select: PERMISSION_SELECT,
      match: { isDeleted: false },
    });

  if (!user || !user.role) {
    throw createHttpError(403, 'Forbidden');
  }
  if (!user.isActive) {
    throw createHttpError(403, 'Account is deactivated');
  }
  if (user.role.isDeleted) {
    throw createHttpError(403, 'Assigned role is deleted. Please contact admin.');
  }
  if (user.role.isActive === false) {
    throw createHttpError(403, 'Your role is inactive. Please contact admin.');
  }

  const rolePermissions = (user.role.permissions || []).filter(Boolean);
  const customPermissions = (user.customPermissions || []).filter(Boolean);
  const deniedPermissions = (user.deniedPermissions || []).filter(Boolean);
  const effectivePermissions = computeEffectivePermissions(
    rolePermissions,
    customPermissions,
    deniedPermissions
  );

  const actorRoleLevel = inferRoleLevel(user.role);
  const isSuperAdminActor = isSuperAdminLevel(actorRoleLevel);

  const allPermissions = await Permission.find({ isDeleted: false }, 'resource action').lean();
  const allPermissionKeys = allPermissions.map((p) => permKey(p)).filter(Boolean);
  const fullSystemAccess = hasAllPermissions(effectivePermissions, allPermissionKeys);

  req.rbac = {
    user,
    effectivePermissions,
    actorRoleLevel,
    isSuperAdminActor,
    fullSystemAccess,
  };
}

function attachRbacMiddleware(req, res, next) {
  attachRbac(req).then(() => next()).catch(next);
}

/**
 * Route guard: requires `authenticate` (+ typically `requireActiveUser`) earlier in the chain.
 * Resolves permissions from **role.permissions** and **customPermissions**, then allows
 * the request only if the union contains `resource` + `action`.
 *
 * Hierarchy checks for data access are applied in controllers (`roleHierarchy` helpers).
 */
function authorize(resource, action) {
  return async function authorizeMiddleware(req, res, next) {
    try {
      await attachRbac(req);

      if (req.rbac.fullSystemAccess) {
        return next();
      }

      if (!matchesPermission(req.rbac.effectivePermissions, resource, action)) {
        return next(createHttpError(403, 'Insufficient permissions'));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  attachRbac,
  attachRbacMiddleware,
  authorize,
};
