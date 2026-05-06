const { User } = require('../models');
const { ROLE_LEVEL } = require('../constants/rbac');
const { inferRoleLevel } = require('./roleHierarchy');

async function userHasAdminRole(userId) {
  const user = await User.findOne({ _id: userId, isDeleted: false }).populate(
    'role',
    'name roleLevel isDeleted'
  );
  if (!user || !user.role || user.role.isDeleted) return false;
  return inferRoleLevel(user?.role) >= ROLE_LEVEL.ADMIN;
}

async function fetchUserProfile(userId) {
  return User.findOne({ _id: userId, isDeleted: false })
    .select('-password')
    .populate({
      path: 'role',
      select: 'name roleLevel isActive isDeleted',
      populate: {
        path: 'permissions',
        select: 'resource action description',
      },
    })
    .populate({ path: 'customPermissions', select: 'resource action description', match: { isDeleted: false } })
    .populate({ path: 'deniedPermissions', select: 'resource action description', match: { isDeleted: false } });
}

module.exports = {
  userHasAdminRole,
  fetchUserProfile,
};
