const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { User, Role, Permission } = require('../models');
const createHttpError = require('../utils/httpError');
const { ADMIN_ROLE_NAME } = require('../constants/rbac');
const { userHasAdminRole, fetchUserProfile } = require('../utils/userAccess');
const { AVATAR_PUBLIC_PREFIX, AVATAR_DIR } = require('../middlewares/uploadAvatar.middleware');
const { escapeRegex } = require('../utils/escapeRegex');

const BCRYPT_ROUNDS = 12;

function toPublicUrl(relativePath) {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  return relativePath;
}

async function assertSelfOrAdmin(req, targetUserId) {
  if (String(req.auth.sub) === String(targetUserId)) return;
  const admin = await userHasAdminRole(req.auth.sub);
  if (!admin) {
    throw createHttpError(403, 'Forbidden');
  }
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
    const user = await User.findById(req.auth.sub);
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

    const user = await User.findById(req.auth.sub);
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
    const activeOnly = req.query.activeOnly !== 'false' && req.query.activeOnly !== '0';
    const filter = {};

    if (activeOnly) {
      filter.isActive = true;
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      const safe = escapeRegex(search);
      const rx = new RegExp(safe, 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('role', 'name description')
        .populate('customPermissions', 'resource action')
        .populate('deniedPermissions', 'resource action'),
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
    await assertSelfOrAdmin(req, userId);

    const user = await fetchUserProfile(userId);
    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    return res.json({ success: true, data: { user } });
  } catch (err) {
    return next(err);
  }
}

async function adminUpdateUserRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    const target = await User.findById(userId);
    if (!target) {
      return next(createHttpError(404, 'User not found'));
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return next(createHttpError(400, 'Invalid role'));
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
    const uniqueIds = [...new Set(req.body.permissionIds.map((id) => String(id)))];

    const target = await User.findById(userId);
    if (!target) {
      return next(createHttpError(404, 'User not found'));
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

    if (userId === req.auth.sub && isActive === false) {
      return next(createHttpError(400, 'You cannot deactivate your own account'));
    }

    const target = await User.findById(userId);
    if (!target) {
      return next(createHttpError(404, 'User not found'));
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
    const user = await User.findById(req.auth.sub).select('+password');
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
      roleDoc = await Role.findById(roleId);
      if (!roleDoc) return next(createHttpError(400, 'Invalid role'));
    } else {
      roleDoc = await Role.findOne({ name: 'Member' });
      if (!roleDoc) roleDoc = await Role.create({ name: 'Member', permissions: [], description: '' });
    }

    const exists = await User.findOne({ email: email.trim().toLowerCase() });
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

    const target = await User.findById(userId);
    if (!target) return next(createHttpError(404, 'User not found'));

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
    const uniqueIds = [...new Set(req.body.permissionIds.map((id) => String(id)))];
    const target = await User.findById(userId);
    if (!target) return next(createHttpError(404, 'User not found'));

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

    const target = await User.findById(userId).populate('role', 'name');
    if (!target) return next(createHttpError(404, 'User not found'));

    if (target.role?.name === ADMIN_ROLE_NAME) {
      const adminRole = await Role.findOne({ name: ADMIN_ROLE_NAME });
      const adminCount = adminRole ? await User.countDocuments({ role: adminRole._id }) : 0;
      if (adminCount <= 1) {
        return next(createHttpError(400, 'Cannot delete the last Administrator account'));
      }
    }

    await User.deleteOne({ _id: target._id });
    return res.json({ success: true, message: 'User deleted' });
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
};
