const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { User, Role, Permission } = require('../models');
const createHttpError = require('../utils/httpError');
const { RESOURCES, ACTIONS, ROLE_LEVEL, EMPLOYEE_ROLE_NAME } = require('../constants/rbac');
const { matchesPermission } = require('../utils/effectivePermissions');
const {
  inferRoleLevel,
  canActorAssignRole,
  isSuperAdminLevel,
  assertActorCanManageTargetUser,
} = require('../utils/roleHierarchy');
const { fetchUserProfile } = require('../utils/userAccess');
const { AVATAR_PUBLIC_PREFIX, AVATAR_DIR } = require('../middlewares/uploadAvatar.middleware');
const { escapeRegex } = require('../utils/escapeRegex');

const BCRYPT_ROUNDS = 12;

const POPULATE_ROLE_USER_LIST = 'name description roleLevel isActive';
const POPULATE_ROLE_PROFILE = 'name roleLevel isActive';

function toPublicUrl(relativePath) {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  return relativePath;
}

async function getMyProfile(req, res, next) {
  try {
    const user = await fetchUserProfile(req.auth.sub);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }
    return res.json({ success: true, data: { user } });
  } catch (err) {
    return next(err);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const { name, email } = req.body;
    if (name === undefined && email === undefined) {
      return next(createHttpError(400, 'Provide name and/or email to update'));
    }
    const user = await User.findOne({ _id: req.auth.sub, isDeleted: false });
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email;

    await user.save();

    const populated = await fetchUserProfile(user._id);
    return res.json({
      success: true,
      message: 'Profile updated',
      data: { user: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function uploadMyPicture(req, res, next) {
  try {
    if (!req.file) {
      return next(createHttpError(400, 'No file uploaded (use field name "picture")'));
    }

    const user = await User.findOne({ _id: req.auth.sub, isDeleted: false });
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    const prev = user.profilePic;
    const relative = `${AVATAR_PUBLIC_PREFIX}/${req.file.filename}`;
    user.profilePic = relative;
    await user.save();

    if (prev && prev.startsWith(AVATAR_PUBLIC_PREFIX)) {
      const oldName = path.basename(prev);
      const oldFull = path.join(AVATAR_DIR, oldName);
      if (oldFull !== req.file.path) {
        fs.unlink(oldFull, () => {});
      }
    }

    const populated = await fetchUserProfile(user._id);
    return res.json({
      success: true,
      message: 'Profile picture updated',
      data: { user: populated, profilePicUrl: toPublicUrl(relative) },
    });
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const actorLevel = req.rbac.actorRoleLevel;
    const activeOnly = req.query.activeOnly !== 'false' && req.query.activeOnly !== '0';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    if (actorLevel <= ROLE_LEVEL.EMPLOYEE) {
      const me = await User.findOne({ _id: req.auth.sub, isDeleted: false })
        .select('-password')
        .populate({ path: 'role', select: POPULATE_ROLE_USER_LIST, match: { isDeleted: false } })
        .populate({ path: 'customPermissions', select: 'resource action', match: { isDeleted: false } })
        .populate({ path: 'deniedPermissions', select: 'resource action', match: { isDeleted: false } });

      if (!me) {
        return res.json({
          success: true,
          data: {
            users: [],
            activeOnly,
            page: 1,
            limit,
            total: 0,
            totalPages: 1,
          },
        });
      }

      if (activeOnly && me.isActive === false) {
        return res.json({
          success: true,
          data: {
            users: [],
            activeOnly,
            page: 1,
            limit,
            total: 0,
            totalPages: 1,
          },
        });
      }

      if (search) {
        const safe = escapeRegex(search);
        const rx = new RegExp(safe, 'i');
        if (!rx.test(me.name) && !rx.test(me.email)) {
          return res.json({
            success: true,
            data: {
              users: [],
              activeOnly,
              page: 1,
              limit,
              total: 0,
              totalPages: 1,
            },
          });
        }
      }

      return res.json({
        success: true,
        data: {
          users: [me],
          activeOnly,
          page: 1,
          limit,
          total: 1,
          totalPages: 1,
        },
      });
    }

    const filter = {};
    if (activeOnly) {
      filter.isActive = true;
    }
    if (search) {
      const safe = escapeRegex(search);
      const rx = new RegExp(safe, 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const manageableRoleIds = await Role.find({ roleLevel: { $lt: actorLevel }, isDeleted: false }).distinct(
      '_id'
    );
    filter.role = { $in: manageableRoleIds };

    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      User.countDocuments({ ...filter, isDeleted: false }),
      User.find({ ...filter, isDeleted: false })
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'role', select: POPULATE_ROLE_USER_LIST, match: { isDeleted: false } })
        .populate({ path: 'customPermissions', select: 'resource action', match: { isDeleted: false } })
        .populate({ path: 'deniedPermissions', select: 'resource action', match: { isDeleted: false } }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      success: true,
      data: {
        users,
        activeOnly,
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const { userId } = req.params;

    if (String(userId) === String(req.auth.sub)) {
      const user = await fetchUserProfile(userId);
      if (!user) {
        return next(createHttpError(404, 'User not found'));
      }
      return res.json({ success: true, data: { user } });
    }

    if (!matchesPermission(req.rbac.effectivePermissions, RESOURCES.USERS, ACTIONS.READ)) {
      return next(createHttpError(403, 'Forbidden'));
    }

    const target = await User.findOne({ _id: userId, isDeleted: false }).populate('role', POPULATE_ROLE_PROFILE);
    if (!target) {
      return next(createHttpError(404, 'User not found'));
    }

    const targetLevel = inferRoleLevel(target.role);
    if (targetLevel >= req.rbac.actorRoleLevel) {
      return next(createHttpError(403, 'Cannot access users at or above your privilege level'));
    }

    const user = await fetchUserProfile(userId);
    return res.json({ success: true, data: { user } });
  } catch (err) {
    return next(err);
  }
}

async function adminUpdateUserRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (String(userId) === String(req.auth.sub)) {
      return next(createHttpError(403, 'You cannot change your own role'));
    }

    const target = await User.findOne({ _id: userId, isDeleted: false }).populate('role', POPULATE_ROLE_PROFILE);
    if (!target) {
      return next(createHttpError(404, 'User not found'));
    }

    try {
      assertActorCanManageTargetUser(req, target);
    } catch (e) {
      return next(e);
    }

    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return next(createHttpError(400, 'Invalid role'));
    }
    if (role.isActive === false) {
      return next(createHttpError(400, 'Cannot assign an inactive role'));
    }

    const newLevel = inferRoleLevel(role);
    if (
      !canActorAssignRole(req.rbac.actorRoleLevel, newLevel, req.rbac.isSuperAdminActor)
    ) {
      return next(createHttpError(403, 'Cannot assign this role'));
    }

    target.role = role._id;
    await target.save();

    const populated = await fetchUserProfile(target._id);
    return res.json({
      success: true,
      message: 'User role updated',
      data: { user: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function adminAssignCustomPermissions(req, res, next) {
  try {
    const { userId } = req.params;

    if (String(userId) === String(req.auth.sub)) {
      return next(createHttpError(403, 'You cannot modify your own permission overrides'));
    }

    const uniqueIds = [...new Set(req.body.permissionIds.map((id) => String(id)))];

    const target = await User.findOne({ _id: userId, isDeleted: false }).populate('role', POPULATE_ROLE_PROFILE);
    if (!target) {
      return next(createHttpError(404, 'User not found'));
    }

    try {
      assertActorCanManageTargetUser(req, target);
    } catch (e) {
      return next(e);
    }

    const count = await Permission.countDocuments({ _id: { $in: uniqueIds } });
    if (count !== uniqueIds.length) {
      return next(createHttpError(400, 'One or more permission ids are invalid'));
    }

    target.customPermissions = uniqueIds;
    await target.save();

    const populated = await fetchUserProfile(target._id);
    return res.json({
      success: true,
      message: 'Custom permissions updated',
      data: { user: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function adminSetUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (String(userId) === String(req.auth.sub) && isActive === false) {
      return next(createHttpError(400, 'You cannot deactivate your own account'));
    }

    const target = await User.findOne({ _id: userId, isDeleted: false }).populate('role', POPULATE_ROLE_PROFILE);
    if (!target) {
      return next(createHttpError(404, 'User not found'));
    }

    if (String(userId) !== String(req.auth.sub)) {
      try {
        assertActorCanManageTargetUser(req, target);
      } catch (e) {
        return next(e);
      }
    }

    target.isActive = isActive;
    await target.save();

    const populated = await fetchUserProfile(target._id);
    return res.json({
      success: true,
      message: isActive ? 'User activated' : 'User deactivated',
      data: { user: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function changeMyPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findOne({ _id: req.auth.sub, isDeleted: false }).select('+password');
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return next(createHttpError(403, 'Current password is incorrect'));
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await user.save();

    return res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    return next(err);
  }
}

async function adminCreateUser(req, res, next) {
  try {
    const { name, email, password, roleId, isActive } = req.body;

    let roleDoc;
    if (roleId) {
      roleDoc = await Role.findOne({ _id: roleId, isDeleted: false });
      if (!roleDoc) return next(createHttpError(400, 'Invalid role'));
    } else {
      roleDoc = await Role.findOne({ name: EMPLOYEE_ROLE_NAME, isDeleted: false });
      if (!roleDoc) {
        return next(
          createHttpError(500, 'Employee role is not configured; run database seed')
        );
      }
    }

    const newLevel = inferRoleLevel(roleDoc);
    if (roleDoc.isActive === false) {
      return next(createHttpError(400, 'Cannot assign an inactive role'));
    }
    if (
      !canActorAssignRole(req.rbac.actorRoleLevel, newLevel, req.rbac.isSuperAdminActor)
    ) {
      return next(createHttpError(403, 'Cannot assign this role'));
    }

    const exists = await User.findOne({ email: email.trim().toLowerCase(), isDeleted: false });
    if (exists) return next(createHttpError(409, 'Email already registered'));

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: passwordHash,
      role: roleDoc._id,
      isActive: isActive !== false,
      emailVerified: true,
    });

    const populated = await fetchUserProfile(user._id);
    return res.status(201).json({
      success: true,
      message: 'User created',
      data: { user: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function adminPatchUserDetails(req, res, next) {
  try {
    const { userId } = req.params;
    const { name, email } = req.body;

    if (name === undefined && email === undefined) {
      return next(createHttpError(400, 'Provide name and/or email'));
    }

    const target = await User.findOne({ _id: userId, isDeleted: false }).populate('role', POPULATE_ROLE_PROFILE);
    if (!target) return next(createHttpError(404, 'User not found'));

    if (String(userId) !== String(req.auth.sub)) {
      try {
        assertActorCanManageTargetUser(req, target);
      } catch (e) {
        return next(e);
      }
    }

    if (name !== undefined) target.name = name.trim();
    if (email !== undefined) target.email = email.trim().toLowerCase();

    await target.save();
    const populated = await fetchUserProfile(target._id);
    return res.json({
      success: true,
      message: 'User updated',
      data: { user: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function adminAssignDeniedPermissions(req, res, next) {
  try {
    const { userId } = req.params;

    if (String(userId) === String(req.auth.sub)) {
      return next(createHttpError(403, 'You cannot modify your own permission overrides'));
    }

    const uniqueIds = [...new Set(req.body.permissionIds.map((id) => String(id)))];
    const target = await User.findOne({ _id: userId, isDeleted: false }).populate('role', POPULATE_ROLE_PROFILE);
    if (!target) return next(createHttpError(404, 'User not found'));

    try {
      assertActorCanManageTargetUser(req, target);
    } catch (e) {
      return next(e);
    }

    const count = await Permission.countDocuments({ _id: { $in: uniqueIds } });
    if (count !== uniqueIds.length) {
      return next(createHttpError(400, 'One or more permission ids are invalid'));
    }

    target.deniedPermissions = uniqueIds;
    await target.save();

    const populated = await fetchUserProfile(target._id);
    return res.json({
      success: true,
      message: 'Denied permissions updated',
      data: { user: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function adminDeleteUser(req, res, next) {
  try {
    const { userId } = req.params;
    if (String(userId) === String(req.auth.sub)) {
      return next(createHttpError(400, 'You cannot delete your own account'));
    }

    const target = await User.findOne({ _id: userId, isDeleted: false }).populate('role', POPULATE_ROLE_PROFILE);
    if (!target) return next(createHttpError(404, 'User not found'));

    try {
      assertActorCanManageTargetUser(req, target);
    } catch (e) {
      return next(e);
    }

    if (isSuperAdminLevel(inferRoleLevel(target.role))) {
      const superAdminRoleId = target.role._id;
      const superCount = await User.countDocuments({ role: superAdminRoleId, isDeleted: false });
      if (superCount <= 1) {
        return next(createHttpError(400, 'Cannot delete the last SuperAdmin account'));
      }
    }

    target.isDeleted = true;
    target.deletedAt = new Date();
    target.deletedBy = req.auth?.sub || null;
    await target.save();
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    return next(err);
  }
}

async function adminRestoreUser(req, res, next) {
  try {
    const { userId } = req.params;
    const target = await User.findOne({ _id: userId, isDeleted: true }).populate(
      'role',
      POPULATE_ROLE_PROFILE
    );
    if (!target) return next(createHttpError(404, 'Deleted user not found'));

    if (target.role?.isDeleted) {
      return next(createHttpError(409, 'Cannot restore user because assigned role is deleted'));
    }
    if (target.role?.isActive === false) {
      return next(createHttpError(409, 'Cannot restore user because assigned role is inactive'));
    }

    try {
      assertActorCanManageTargetUser(req, target);
    } catch (e) {
      return next(e);
    }

    target.isDeleted = false;
    target.deletedAt = null;
    target.deletedBy = null;
    await target.save();

    const populated = await fetchUserProfile(target._id);
    return res.json({
      success: true,
      message: 'User restored',
      data: { user: populated },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadMyPicture,
  changeMyPassword,
  listUsers,
  getUserById,
  adminCreateUser,
  adminPatchUserDetails,
  adminDeleteUser,
  adminUpdateUserRole,
  adminAssignCustomPermissions,
  adminAssignDeniedPermissions,
  adminSetUserStatus,
  adminRestoreUser,
};
