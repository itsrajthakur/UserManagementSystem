/**
 * Sample BSON-style payloads for Compass / seed scripts.
 * ObjectIds below are illustrative; replace with real generated ids after insert order:
 * Permissions → Roles → Users.
 */

const placeholderPermissionIds = {
  usersRead: '64f5123456789012345678a1',
  usersCreate: '64f5123456789012345678a2',
  usersUpdate: '64f5123456789012345678a3',
  usersDelete: '64f5123456789012345678a4',
  rolesRead: '64f5123456789012345678a5',
};

const placeholderRoleIds = {
  admin: '64f5123456789012345678b1',
  viewer: '64f5123456789012345678b2',
};

/** Example Permission documents */
const permissionDocuments = [
  {
    resource: 'users',
    action: 'read',
    description: 'List and view users',
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  },
  {
    resource: 'users',
    action: 'create',
    description: 'Create users',
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  },
  {
    resource: 'users',
    action: 'update',
    description: 'Update users',
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  },
  {
    resource: 'users',
    action: 'delete',
    description: 'Delete users',
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  },
  {
    resource: 'roles',
    action: 'read',
    description: 'View roles',
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  },
];

/** Example Role documents — permissions[] filled after Permissions exist */
const roleDocuments = [
  {
    name: 'admin',
    permissions: [
      placeholderPermissionIds.usersRead,
      placeholderPermissionIds.usersCreate,
      placeholderPermissionIds.usersUpdate,
      placeholderPermissionIds.usersDelete,
      placeholderPermissionIds.rolesRead,
    ],
    createdAt: new Date('2026-05-04T10:05:00.000Z'),
    updatedAt: new Date('2026-05-04T10:05:00.000Z'),
  },
  {
    name: 'viewer',
    permissions: [placeholderPermissionIds.usersRead, placeholderPermissionIds.rolesRead],
    createdAt: new Date('2026-05-04T10:05:00.000Z'),
    updatedAt: new Date('2026-05-04T10:05:00.000Z'),
  },
];

/** Example User document — password should be hashed by your auth layer */
const userDocuments = [
  {
    name: 'Jane Admin',
    email: 'jane.admin@example.com',
    password: '$2b$12$REPLACE_WITH_BCRYPT_HASH',
    profilePic: 'https://cdn.example.com/avatars/jane.png',
    role: placeholderRoleIds.admin,
    customPermissions: [],
    createdAt: new Date('2026-05-04T10:10:00.000Z'),
    updatedAt: new Date('2026-05-04T10:10:00.000Z'),
  },
  {
    name: 'John Viewer',
    email: 'john.viewer@example.com',
    password: '$2b$12$REPLACE_WITH_BCRYPT_HASH',
    profilePic: '',
    role: placeholderRoleIds.viewer,
    customPermissions: [placeholderPermissionIds.usersCreate],
    createdAt: new Date('2026-05-04T10:10:00.000Z'),
    updatedAt: new Date('2026-05-04T10:10:00.000Z'),
  },
];

module.exports = {
  permissionDocuments,
  roleDocuments,
  userDocuments,
};
