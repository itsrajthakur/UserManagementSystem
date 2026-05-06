import {
  ROLE_NAME,
  ROLE_LEVEL,
  inferUserRoleLevel,
  inferRoleLevelFromRole,
} from '../constants/rbac';

/**
 * @param {unknown} user - user object from GET /auth/me
 */
export function isAdminUser(user) {
  return inferUserRoleLevel(user) >= ROLE_LEVEL.ADMIN;
}

export function isManagerOrAbove(user) {
  return inferUserRoleLevel(user) >= ROLE_LEVEL.MANAGER;
}

export function isMemberUser(user) {
  const n = String(user?.role?.name ?? '').trim();
  return n === ROLE_NAME.MEMBER || n === ROLE_NAME.EMPLOYEE;
}

/** SuperAdmin privileges (assignment + hierarchy). */
export function isSuperAdminActor(user) {
  return inferUserRoleLevel(user) >= ROLE_LEVEL.SUPERADMIN;
}

/**
 * May assign targetRole when creating/editing users (mirror backend strict rules).
 * @param {unknown} actorUser
 * @param {{ name?: string; roleLevel?: number }} targetRole
 */
export function canAssignRoleInUi(actorUser, targetRole) {
  const actorLevel = inferUserRoleLevel(actorUser);
  const assignLevel = inferRoleLevelFromRole(targetRole);
  const actorIsSuperAdmin = actorLevel >= ROLE_LEVEL.SUPERADMIN;
  if (assignLevel >= ROLE_LEVEL.SUPERADMIN) {
    return actorIsSuperAdmin;
  }
  return assignLevel < actorLevel;
}

/** Edit/delete role definitions and permission matrix on this row. SuperAdmin definition is never editable here. */
export function canEditRoleDefinitionInUi(actorUser, roleDoc) {
  if (String(roleDoc?.name ?? '').trim() === ROLE_NAME.SUPERADMIN) {
    return false;
  }
  const actorLevel = inferUserRoleLevel(actorUser);
  return inferRoleLevelFromRole(roleDoc) < actorLevel;
}

/** Open full admin edits for another user's account (same level or higher target is blocked). */
export function canManageAnotherUser(actorUser, targetUser) {
  return inferUserRoleLevel(actorUser) > inferUserRoleLevel(targetUser);
}

function normResource(r) {
  return String(r ?? '').trim().toLowerCase();
}

function normAction(a) {
  return String(a ?? '').trim().toLowerCase();
}

function permKey(p) {
  const r = normResource(p?.resource);
  const a = normAction(p?.action);
  if (!r || !a) return null;
  return `${r}:${a}`;
}

/** Effective grants: (role.permissions ∪ customPermissions) ∖ deniedPermissions (deny wins). */
export function getEffectivePermissions(user) {
  if (!user) return [];
  const rolePerms = (user.role?.permissions ?? []).filter(Boolean);
  const custom = (user.customPermissions ?? []).filter(Boolean);
  const denied = (user.deniedPermissions ?? []).filter(Boolean);
  const denyKeys = new Set();
  for (const p of denied) {
    const k = permKey(p);
    if (k) denyKeys.add(k);
  }

  const seen = new Set();
  const out = [];
  for (const p of [...rolePerms, ...custom]) {
    const r = normResource(p.resource);
    const a = normAction(p.action);
    if (!r || !a) continue;
    const key = `${r}:${a}`;
    if (seen.has(key) || denyKeys.has(key)) continue;
    seen.add(key);
    out.push({ resource: r, action: a, description: p.description });
  }
  return out;
}

export function hasPermission(user, resource, action) {
  const r = normResource(resource);
  const a = normAction(action);
  return getEffectivePermissions(user).some((p) => p.resource === r && p.action === a);
}
