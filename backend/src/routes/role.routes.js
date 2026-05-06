const { Router } = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireActiveUser } = require('../middlewares/requireActive.middleware');
const { requireVerifiedEmail } = require('../middlewares/requireVerifiedEmail.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { RESOURCES, ACTIONS } = require('../constants/rbac');
const { validateRequest } = require('../middlewares/validate.middleware');
const {
  createRoleValidation,
  updateRoleValidation,
  assignPermissionsValidation,
  roleIdOnlyValidation,
} = require('../validators/role.validators');
const {
  createRole,
  listRoles,
  getRoleById,
  updateRole,
  assignPermissionsToRole,
  deleteRole,
  restoreRole,
} = require('../controllers/role.controller');

const router = Router();

const activeAuth = [authenticate, requireActiveUser, requireVerifiedEmail];

router.post(
  '/',
  ...activeAuth,
  authorize(RESOURCES.ROLES, ACTIONS.CREATE),
  createRoleValidation,
  validateRequest,
  createRole
);
router.get('/', ...activeAuth, authorize(RESOURCES.ROLES, ACTIONS.READ), listRoles);
router.patch(
  '/:roleId/permissions',
  ...activeAuth,
  authorize(RESOURCES.ROLES, ACTIONS.UPDATE),
  assignPermissionsValidation,
  validateRequest,
  assignPermissionsToRole
);
router.get(
  '/:roleId',
  ...activeAuth,
  authorize(RESOURCES.ROLES, ACTIONS.READ),
  roleIdOnlyValidation,
  validateRequest,
  getRoleById
);
router.patch(
  '/:roleId',
  ...activeAuth,
  authorize(RESOURCES.ROLES, ACTIONS.UPDATE),
  updateRoleValidation,
  validateRequest,
  updateRole
);
router.delete(
  '/:roleId',
  ...activeAuth,
  authorize(RESOURCES.ROLES, ACTIONS.DELETE),
  roleIdOnlyValidation,
  validateRequest,
  deleteRole
);
router.post(
  '/:roleId/restore',
  ...activeAuth,
  authorize(RESOURCES.ROLES, ACTIONS.UPDATE),
  roleIdOnlyValidation,
  validateRequest,
  restoreRole
);

module.exports = router;
