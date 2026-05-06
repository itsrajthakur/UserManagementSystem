const { Router } = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireActiveUser } = require('../middlewares/requireActive.middleware');
const { requireVerifiedEmail } = require('../middlewares/requireVerifiedEmail.middleware');
const { authorize, attachRbacMiddleware } = require('../middlewares/rbac.middleware');
const { RESOURCES, ACTIONS } = require('../constants/rbac');
const { validateRequest } = require('../middlewares/validate.middleware');
const { uploadAvatarSingle } = require('../middlewares/uploadAvatar.middleware');
const {
  updateMyProfileValidation,
  changePasswordValidation,
  adminCreateUserValidation,
  adminPatchUserDetailsValidation,
  adminUpdateRoleValidation,
  adminCustomPermissionsValidation,
  adminDeniedPermissionsValidation,
  adminUserStatusValidation,
  listUsersQueryValidation,
  getUserByIdValidation,
  deleteUserValidation,
} = require('../validators/user.validators');
const {
  getMyProfile,
  updateMyProfile,
  uploadMyPicture,
  changeMyPassword,
  listUsers,
  getUserById,
  adminCreateUser,
  adminPatchUserDetails,
  adminDeleteUser,
  adminRestoreUser,
  adminUpdateUserRole,
  adminAssignCustomPermissions,
  adminAssignDeniedPermissions,
  adminSetUserStatus,
} = require('../controllers/user.controller');

const router = Router();

const activeAuth = [authenticate, requireActiveUser, requireVerifiedEmail];

router.get('/me', ...activeAuth, getMyProfile);
router.patch('/me', ...activeAuth, updateMyProfileValidation, validateRequest, updateMyProfile);
router.post('/me/picture', ...activeAuth, uploadAvatarSingle, uploadMyPicture);
router.post(
  '/me/password',
  ...activeAuth,
  changePasswordValidation,
  validateRequest,
  changeMyPassword
);

router.post(
  '/',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.CREATE),
  adminCreateUserValidation,
  validateRequest,
  adminCreateUser
);
router.get(
  '/',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.READ),
  listUsersQueryValidation,
  validateRequest,
  listUsers
);

router.patch(
  '/:userId/details',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.UPDATE),
  adminPatchUserDetailsValidation,
  validateRequest,
  adminPatchUserDetails
);

router.patch(
  '/:userId/denied-permissions',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.UPDATE),
  adminDeniedPermissionsValidation,
  validateRequest,
  adminAssignDeniedPermissions
);

router.patch(
  '/:userId/role',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.UPDATE),
  adminUpdateRoleValidation,
  validateRequest,
  adminUpdateUserRole
);
router.patch(
  '/:userId/custom-permissions',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.UPDATE),
  adminCustomPermissionsValidation,
  validateRequest,
  adminAssignCustomPermissions
);
router.patch(
  '/:userId/status',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.UPDATE),
  adminUserStatusValidation,
  validateRequest,
  adminSetUserStatus
);

router.delete(
  '/:userId',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.DELETE),
  deleteUserValidation,
  validateRequest,
  adminDeleteUser
);
router.post(
  '/:userId/restore',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.UPDATE),
  deleteUserValidation,
  validateRequest,
  adminRestoreUser
);

router.get(
  '/:userId',
  ...activeAuth,
  attachRbacMiddleware,
  getUserByIdValidation,
  validateRequest,
  getUserById
);

module.exports = router;
