/**
 * Canonical CRUD action values — must match Permission.model.js enum.
 */
const ACTIONS = Object.freeze({
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
});

/**
 * Logical resource keys stored on Permission.resource (lowercase).
 */
const RESOURCES = Object.freeze({
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
});

/**
 * Numeric privilege rank on Role documents (higher = more powerful).
 * Used for hierarchy checks in addition to permission-based `authorize()`.
 */
const ROLE_LEVEL = Object.freeze({
  EMPLOYEE: 1,
  MANAGER: 4,
  ADMIN: 7,
  SUPERADMIN: 10,
});

/** Canonical role names (PascalCase). */
const SUPERADMIN_ROLE_NAME = 'SuperAdmin';
const ADMIN_ROLE_NAME = 'Admin';
const MANAGER_ROLE_NAME = 'Manager';
const EMPLOYEE_ROLE_NAME = 'Employee';

/** Legacy signup role — treated as Employee level. */
const LEGACY_MEMBER_ROLE_NAME = 'Member';

const ROLE_LEVEL_BY_CANONICAL_NAME = Object.freeze({
  [SUPERADMIN_ROLE_NAME]: ROLE_LEVEL.SUPERADMIN,
  [ADMIN_ROLE_NAME]: ROLE_LEVEL.ADMIN,
  [MANAGER_ROLE_NAME]: ROLE_LEVEL.MANAGER,
  [EMPLOYEE_ROLE_NAME]: ROLE_LEVEL.EMPLOYEE,
  [LEGACY_MEMBER_ROLE_NAME]: ROLE_LEVEL.EMPLOYEE,
});

/** Only the SuperAdmin definition is non-deletable via API. */
const PROTECTED_ROLE_NAMES = Object.freeze([SUPERADMIN_ROLE_NAME]);

module.exports = {
  ACTIONS,
  RESOURCES,
  ROLE_LEVEL,
  ROLE_LEVEL_BY_CANONICAL_NAME,
  SUPERADMIN_ROLE_NAME,
  ADMIN_ROLE_NAME,
  MANAGER_ROLE_NAME,
  EMPLOYEE_ROLE_NAME,
  LEGACY_MEMBER_ROLE_NAME,
  PROTECTED_ROLE_NAMES,
};
