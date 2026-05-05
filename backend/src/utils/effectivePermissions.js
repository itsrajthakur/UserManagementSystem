/**
 * Builds effective grants: (role.permissions ∪ customPermissions) ∖ deniedPermissions
 * (dedupe by `resource:action`). Denies win over grants for the same key.
 */
function permKey(p) {
  if (!p?.resource || !p?.action) return null;
  return `${String(p.resource).toLowerCase()}:${String(p.action).toLowerCase()}`;
}

function mergeRoleAndCustomPermissions(rolePermissions = [], customPermissions = []) {
  const merged = [];
  const seenKeys = new Set();

  for (const p of [...rolePermissions, ...customPermissions]) {
    if (!p || !p.resource || !p.action) continue;
    const key = permKey(p);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    merged.push({
      resource: String(p.resource).toLowerCase(),
      action: String(p.action).toLowerCase(),
    });
  }

  return merged;
}

function subtractDeniedPermissions(mergedPermissions, deniedDocs = []) {
  const denyKeys = new Set();
  for (const p of deniedDocs) {
    const k = permKey(p);
    if (k) denyKeys.add(k);
  }
  return mergedPermissions.filter((p) => !denyKeys.has(permKey(p)));
}

/** Full pipeline for RBAC evaluation (non-admin). */
function computeEffectivePermissions(rolePermissions, customPermissions, deniedPermissions) {
  const union = mergeRoleAndCustomPermissions(rolePermissions, customPermissions);
  return subtractDeniedPermissions(union, deniedPermissions);
}

function matchesPermission(effectivePermissions, resource, action) {
  const r = String(resource).trim().toLowerCase();
  const a = String(action).trim().toLowerCase();
  return effectivePermissions.some((p) => p.resource === r && p.action === a);
}

/** Returns true when effective permissions include every key in `requiredPermissionKeys`. */
function hasAllPermissions(effectivePermissions = [], requiredPermissionKeys = []) {
  if (!requiredPermissionKeys.length) return false;
  const current = new Set();
  for (const p of effectivePermissions) {
    const k = permKey(p);
    if (k) current.add(k);
  }
  return requiredPermissionKeys.every((k) => current.has(String(k).toLowerCase()));
}

module.exports = {
  mergeRoleAndCustomPermissions,
  subtractDeniedPermissions,
  computeEffectivePermissions,
  matchesPermission,
  hasAllPermissions,
  permKey,
};
