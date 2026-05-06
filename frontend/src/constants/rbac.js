/** Mirrors backend — canonical role names and privilege ranks (higher = more power). */
export const ROLE_LEVEL = Object.freeze({
  EMPLOYEE: 1,
  MANAGER: 4,
  ADMIN: 7,
  SUPERADMIN: 10,
});

export const ROLE_NAME = Object.freeze({
  SUPERADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  MEMBER: 'Member',
});

const ROLE_LEVEL_BY_NAME = {
  [ROLE_NAME.SUPERADMIN]: ROLE_LEVEL.SUPERADMIN,
  [ROLE_NAME.ADMIN]: ROLE_LEVEL.ADMIN,
  [ROLE_NAME.MANAGER]: ROLE_LEVEL.MANAGER,
  [ROLE_NAME.EMPLOYEE]: ROLE_LEVEL.EMPLOYEE,
  [ROLE_NAME.MEMBER]: ROLE_LEVEL.EMPLOYEE,
};

export const RESOURCES = Object.freeze({
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
});

export const ACTIONS = Object.freeze({
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
});

export function inferUserRoleLevel(user) {
  const lv = user?.role?.roleLevel;
  if (typeof lv === 'number' && Number.isFinite(lv)) return lv;
  const name = String(user?.role?.name ?? '').trim();
  return ROLE_LEVEL_BY_NAME[name] ?? ROLE_LEVEL.EMPLOYEE;
}

export function inferRoleLevelFromRole(role) {
  const lv = role?.roleLevel;
  if (typeof lv === 'number' && Number.isFinite(lv)) return lv;
  const name = String(role?.name ?? '').trim();
  return ROLE_LEVEL_BY_NAME[name] ?? ROLE_LEVEL.EMPLOYEE;
}
