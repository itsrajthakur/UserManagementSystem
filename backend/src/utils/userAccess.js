const { User } = require('../models');
const { ADMIN_ROLE_NAME } = require('../constants/rbac');

async function userHasAdminRole(userId) {
  const user = await User.findById(userId).populate('role', 'name');
  return Boolean(user?.role?.name === ADMIN_ROLE_NAME);
}

async function fetchUserProfile(userId) {
  return User.findById(userId)
    .select('-password')
    .populate({
      path: 'role',
      select: 'name',
      populate: {
        path: 'permissions',
        select: 'resource action description',
      },
    })
    .populate('customPermissions', 'resource action description')
    .populate('deniedPermissions', 'resource action description');
}

module.exports = {
  userHasAdminRole,
  fetchUserProfile,
};
