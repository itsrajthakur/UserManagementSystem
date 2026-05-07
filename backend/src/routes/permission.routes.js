const { Router } = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireActiveUser } = require('../middlewares/requireActive.middleware');
const { requireVerifiedEmail } = require('../middlewares/requireVerifiedEmail.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { RESOURCES, ACTIONS } = require('../constants/rbac');
const { validateRequest } = require('../middlewares/validate.middleware');
const {
  createPermissionValidation,
  updatePermissionValidation,
  permissionIdOnlyValidation,
} = require('../validators/permission.validators');
const {
  createPermission,
  listPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
  restorePermission,
} = require('../controllers/permission.controller');

const router = Router();

const activeAuth = [authenticate, requireActiveUser, requireVerifiedEmail];

router.post(
  '/',
  ...activeAuth,
  authorize(RESOURCES.PERMISSIONS, ACTIONS.CREATE),
  createPermissionValidation,
  validateRequest,
  createPermission
);
router.get('/', ...activeAuth, authorize(RESOURCES.PERMISSIONS, ACTIONS.READ), listPermissions);
router.get(
  '/:permissionId',
  ...activeAuth,
  authorize(RESOURCES.PERMISSIONS, ACTIONS.READ),
  permissionIdOnlyValidation,
  validateRequest,
  getPermissionById
);
router.patch(
  '/:permissionId',
  ...activeAuth,
  authorize(RESOURCES.PERMISSIONS, ACTIONS.UPDATE),
  updatePermissionValidation,
  validateRequest,
  updatePermission
);
router.delete(
  '/:permissionId',
  ...activeAuth,
  authorize(RESOURCES.PERMISSIONS, ACTIONS.DELETE),
  permissionIdOnlyValidation,
  validateRequest,
  deletePermission
);
router.post(
  '/:permissionId/restore',
  ...activeAuth,
  authorize(RESOURCES.PERMISSIONS, ACTIONS.UPDATE),
  permissionIdOnlyValidation,
  validateRequest,
  restorePermission
);

module.exports = router;
