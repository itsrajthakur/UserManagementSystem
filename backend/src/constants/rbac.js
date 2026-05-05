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

/** Built-in roles with special safeguards (cannot be deleted). */
const PROTECTED_ROLE_NAMES = Object.freeze(['Admin', 'Member']);

/** Users with this role name may access admin management APIs. */
const ADMIN_ROLE_NAME = 'Admin';

module.exports = {
  ACTIONS,
  RESOURCES,
  PROTECTED_ROLE_NAMES,
  ADMIN_ROLE_NAME,
};
