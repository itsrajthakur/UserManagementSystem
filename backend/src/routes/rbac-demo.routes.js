/**
 * Example routes: Member role might only have `users:read`, while a user with
 * `customPermissions` including `users:update` can also hit the PATCH handler.
 *
 * Chain: authenticate → requireActiveUser → authorize(resource, action) → handler
 */
const { Router } = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireActiveUser } = require('../middlewares/requireActive.middleware');
const { requireVerifiedEmail } = require('../middlewares/requireVerifiedEmail.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { RESOURCES, ACTIONS } = require('../constants/rbac');

const router = Router();

const activeAuth = [authenticate, requireActiveUser, requireVerifiedEmail];

router.get(
  '/profile',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.READ),
  (req, res) => {
    res.json({
      success: true,
      message: 'You have users:read (role and/or override).',
      data: {
        effectivePermissions: req.rbac.effectivePermissions,
      },
    });
  }
);

router.patch(
  '/profile',
  ...activeAuth,
  authorize(RESOURCES.USERS, ACTIONS.UPDATE),
  (req, res) => {
    res.json({
      success: true,
      message: 'You have users:update (often via custom permission override on a Member).',
      data: {
        effectivePermissions: req.rbac.effectivePermissions,
      },
    });
  }
);

module.exports = router;
