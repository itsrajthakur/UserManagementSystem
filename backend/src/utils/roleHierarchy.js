const createHttpError = require('./httpError');
const {
  ROLE_LEVEL,
  ROLE_LEVEL_BY_CANONICAL_NAME,
  SUPERADMIN_ROLE_NAME,
} = require('../constants/rbac');

/**
 * Higher numeric `roleLevel` = more privilege.
 * SuperAdmin (40) > Admin (30) > Manager (20) > Employee (10).
 *
 * @param {import('mongoose').Document | { name?: string; roleLevel?: number } | null | undefined} role
 * @returns {number}
 */
function inferRoleLevel(role) {
  if (!role) return ROLE_LEVEL.EMPLOYEE;
  if (typeof role.roleLevel === 'number' && Number.isFinite(role.roleLevel)) {
    return role.roleLevel;
  }
  const name = String(role.name ?? '').trim();
  if (ROLE_LEVEL_BY_CANONICAL_NAME[name] != null) {
    return ROLE_LEVEL_BY_CANONICAL_NAME[name];
  }
  return ROLE_LEVEL.EMPLOYEE;
}

function isSuperAdminLevel(level) {
  return typeof level === 'number' && level === ROLE_LEVEL.SUPERADMIN;
}

/** Target user/role is strictly below actor in the hierarchy (actors never manage peers). */
function canActorManageLowerPrivilege(actorLevel, targetLevel) {
  return targetLevel < actorLevel;
}

/**
 * Assigning a role requires the new role to be strictly below the actor,
 * except assigning SuperAdmin — only an existing SuperAdmin may do that via API.
 */
function canActorAssignRole(actorLevel, newRoleLevel, isSuperAdminActor) {
  if (newRoleLevel >= ROLE_LEVEL.SUPERADMIN) {
    return Boolean(isSuperAdminActor);
  }
  return newRoleLevel < actorLevel;
}

/** SuperAdmin system role cannot be edited or deleted via API. */
function isImmutableSuperAdminRole(role) {
  return String(role?.name ?? '').trim() === SUPERADMIN_ROLE_NAME || inferRoleLevel(role) >= ROLE_LEVEL.SUPERADMIN;
}

function assertCanManageRoleDefinition(req, roleDoc) {
  if (isImmutableSuperAdminRole(roleDoc)) {
    throw createHttpError(403, 'This system role cannot be modified');
  }
  const targetLevel = inferRoleLevel(roleDoc);
  if (!canActorManageLowerPrivilege(req.rbac.actorRoleLevel, targetLevel)) {
    throw createHttpError(403, 'You cannot modify roles at or above your privilege level');
  }
}

/** Target user's role must be strictly lower-privilege than the actor. */
function assertActorCanManageTargetUser(req, targetUserLike) {
  const tLevel = inferRoleLevel(targetUserLike.role);
  if (!canActorManageLowerPrivilege(req.rbac.actorRoleLevel, tLevel)) {
    throw createHttpError(403, 'Cannot manage users at or above your privilege level');
  }
}

module.exports = {
  inferRoleLevel,
  isSuperAdminLevel,
  canActorManageLowerPrivilege,
  canActorAssignRole,
  isImmutableSuperAdminRole,
  assertCanManageRoleDefinition,
  assertActorCanManageTargetUser,
};
