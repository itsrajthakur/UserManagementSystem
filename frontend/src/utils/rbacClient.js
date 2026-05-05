import { ROLE_NAME } from '../constants/rbac';

/**
 * @param {unknown} user - user object from GET /auth/me
 */
export function isAdminUser(user) {
  return user?.role?.name === ROLE_NAME.ADMIN;
}

export function isMemberUser(user) {
  return user?.role?.name === ROLE_NAME.MEMBER;
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
