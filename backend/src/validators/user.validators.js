const { body, param, query } = require('express-validator');

const mongoUserIdParam = param('userId').isMongoId().withMessage('Invalid user id');

const updateMyProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 120 })
    .withMessage('Name must be at most 120 characters'),
  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .normalizeEmail()
    .isEmail()
    .withMessage('Invalid email'),
];

const adminUpdateRoleValidation = [
  mongoUserIdParam,
  body('roleId').isMongoId().withMessage('Invalid role id'),
];

const adminCustomPermissionsValidation = [
  mongoUserIdParam,
  body('permissionIds')
    .isArray({ min: 0 })
    .withMessage('permissionIds must be an array'),
  body('permissionIds.*').isMongoId().withMessage('Each permission id must be valid'),
];

const adminUserStatusValidation = [
  mongoUserIdParam,
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
];

const listUsersQueryValidation = [
  query('activeOnly')
    .optional()
    .isIn(['true', 'false', '1', '0'])
    .withMessage('activeOnly must be true or false'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim().isLength({ max: 200 }),
];

const getUserByIdValidation = [mongoUserIdParam];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
];

const adminCreateUserValidation = [
  body('name')
    .trim()
    .notEmpty()
    .isLength({ max: 120 }),
  body('email').trim().notEmpty().normalizeEmail().isEmail(),
  body('password')
    .notEmpty()
    .isLength({ min: 8 })
    .matches(/\d/)
    .matches(/[a-zA-Z]/),
  body('roleId').optional().isMongoId(),
  body('isActive').optional().isBoolean(),
];

const adminPatchUserDetailsValidation = [
  mongoUserIdParam,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 120 }),
  body('email').optional().trim().notEmpty().normalizeEmail().isEmail(),
];

const adminDeniedPermissionsValidation = [
  mongoUserIdParam,
  body('permissionIds')
    .isArray({ min: 0 })
    .withMessage('permissionIds must be an array'),
  body('permissionIds.*').isMongoId(),
];

const deleteUserValidation = [mongoUserIdParam];

module.exports = {
  updateMyProfileValidation,
  adminUpdateRoleValidation,
  adminCustomPermissionsValidation,
  adminUserStatusValidation,
  listUsersQueryValidation,
  getUserByIdValidation,
  changePasswordValidation,
  adminCreateUserValidation,
  adminPatchUserDetailsValidation,
  adminDeniedPermissionsValidation,
  deleteUserValidation,
};
