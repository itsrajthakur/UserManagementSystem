/**
 * Initial data: canonical permissions, Admin (full grants) + Member roles, default Administrator.
 * Run: npm run seed  (requires MONGODB_URI, optional SEED_ADMIN_* vars)
 *
 * Idempotent: re-run to fix Admin role permission list and reset overrides on the seeded admin user.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { Permission, Role, User } = require('../src/models');
const { ADMIN_ROLE_NAME, RESOURCES, ACTIONS } = require('../src/constants/rbac');

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

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeAdmin!1';
  const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';

  const allPermissionIds = await ensureAllCanonicalPermissions();
  console.log(`Canonical permissions in DB: ${allPermissionIds.length}`);

  let adminRole = await Role.findOne({ name: ADMIN_ROLE_NAME });
  if (!adminRole) {
    adminRole = await Role.create({
      name: ADMIN_ROLE_NAME,
      description: 'Full system access',
      permissions: allPermissionIds,
    });
    console.log('Created role: Admin (all permissions)');
  } else {
    adminRole.permissions = allPermissionIds;
    adminRole.description = adminRole.description || 'Full system access';
    await adminRole.save();
    console.log('Updated role: Admin (all permissions)');
  }

  let memberRole = await Role.findOne({ name: 'Member' });
  if (!memberRole) {
    memberRole = await Role.create({
      name: 'Member',
      description: 'Default self-service user',
      permissions: [],
    });
    console.log('Created role: Member');
  }

  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    existing.role = adminRole._id;
    existing.customPermissions = [];
    existing.deniedPermissions = [];
    await existing.save();
    console.log('Synced default admin user:', adminEmail, '(Admin role, full permission set, overrides cleared)');
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  const hash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
  await User.create({
    name: adminName,
    email: adminEmail,
    password: hash,
    role: adminRole._id,
    isActive: true,
    emailVerified: true,
    customPermissions: [],
    deniedPermissions: [],
  });

  console.log('Created default Admin user:', adminEmail);
  console.log('Change SEED_ADMIN_PASSWORD in production and rotate after first login.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
