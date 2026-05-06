/**
 * Initial data: canonical permissions, hierarchy roles (SuperAdmin / Admin / Manager / Employee),
 * and a default SuperAdmin account.
 * Run: npm run seed  (requires MONGODB_URI, optional SEED_* vars)
 *
 * Idempotent: re-run to sync role levels, permission sets, and the seeded user role.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { Permission, Role, User } = require('../src/models');
const {
  RESOURCES,
  ACTIONS,
  ROLE_LEVEL,
  SUPERADMIN_ROLE_NAME,
  ADMIN_ROLE_NAME,
  MANAGER_ROLE_NAME,
  EMPLOYEE_ROLE_NAME,
  LEGACY_MEMBER_ROLE_NAME,
} = require('../src/constants/rbac');

const BCRYPT_ROUNDS = 12;

async function ensureAllCanonicalPermissions() {
  const resourceList = Object.values(RESOURCES);
  const actionList = Object.values(ACTIONS);
  const ids = [];

  for (const resource of resourceList) {
    for (const action of actionList) {
      const description = `${String(action).charAt(0).toUpperCase()}${String(action).slice(1)} ${resource}`;
      let doc = await Permission.findOne({ resource, action });
      if (!doc) {
        doc = await Permission.create({
          resource,
          action,
          description,
        });
        console.log(`Created permission: ${resource}:${action}`);
      }
      ids.push(doc._id);
    }
  }

  return ids;
}

async function permissionSubset(resourceFilter) {
  const q = { resource: { $in: resourceFilter } };
  return Permission.find(q).distinct('_id');
}

async function upsertRole(name, roleLevel, permissionIds, description) {
  let r = await Role.findOne({ name });
  if (!r) {
    r = await Role.create({
      name,
      roleLevel,
      permissions: permissionIds,
      description: description || '',
    });
    console.log(`Created role: ${name} (level ${roleLevel})`);
  } else {
    r.roleLevel = roleLevel;
    r.permissions = permissionIds;
    r.description = description || r.description || '';
    await r.save();
    console.log(`Updated role: ${name} (level ${roleLevel})`);
  }
  return r;
}

async function migrateLegacyMemberRole(employeeRole) {
  const legacy = await Role.findOne({ name: LEGACY_MEMBER_ROLE_NAME });
  if (!legacy || String(legacy._id) === String(employeeRole._id)) return;

  await User.updateMany({ role: legacy._id }, { $set: { role: employeeRole._id } });
  await Role.deleteOne({ _id: legacy._id });
  console.log('Migrated users from Member role to Employee and removed Member role');
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const seedEmail = (process.env.SEED_SUPERADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@example.com')
    .toLowerCase()
    .trim();
  const seedPassword = process.env.SEED_SUPERADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'ChangeMeAdmin!1';
  const seedName =
    process.env.SEED_SUPERADMIN_NAME || process.env.SEED_ADMIN_NAME || 'System SuperAdmin';

  const allPermissionIds = await ensureAllCanonicalPermissions();
  console.log(`Canonical permissions in DB: ${allPermissionIds.length}`);

  const usersOnlyPermissionIds = await permissionSubset([RESOURCES.USERS]);

  const superAdminRole = await upsertRole(
    SUPERADMIN_ROLE_NAME,
    ROLE_LEVEL.SUPERADMIN,
    allPermissionIds,
    'Full system access (immutable system role)'
  );
  await upsertRole(ADMIN_ROLE_NAME, ROLE_LEVEL.ADMIN, allPermissionIds, 'Manages lower roles and users');
  await upsertRole(
    MANAGER_ROLE_NAME,
    ROLE_LEVEL.MANAGER,
    usersOnlyPermissionIds,
    'Manages Employee accounts only'
  );
  const employeeRole = await upsertRole(
    EMPLOYEE_ROLE_NAME,
    ROLE_LEVEL.EMPLOYEE,
    [],
    'Self access only; no admin capabilities'
  );

  await migrateLegacyMemberRole(employeeRole);

  const existing = await User.findOne({ email: seedEmail });

  if (existing) {
    existing.role = superAdminRole._id;
    existing.customPermissions = [];
    existing.deniedPermissions = [];
    await existing.save();
    console.log('Synced seed user to SuperAdmin:', seedEmail);
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  const hash = await bcrypt.hash(seedPassword, BCRYPT_ROUNDS);
  await User.create({
    name: seedName,
    email: seedEmail,
    password: hash,
    role: superAdminRole._id,
    isActive: true,
    emailVerified: true,
    customPermissions: [],
    deniedPermissions: [],
  });

  console.log('Created default SuperAdmin user:', seedEmail);
  console.log('Change SEED_SUPERADMIN_PASSWORD / SEED_ADMIN_PASSWORD in production and rotate after first login.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
