const { body, param } = require('express-validator');

const mongoIdParam = (name = 'roleId') =>
  param(name).isMongoId().withMessage(`Invalid ${name}`);

const createRoleValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 80 })
    .withMessage('Name must be at most 80 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('permissionIds')
    .optional()
    .isArray({ min: 0 })
    .withMessage('permissionIds must be an array'),
  body('permissionIds.*').optional().isMongoId().withMessage('Each permissionIds entry must be a valid id'),
];

const updateRoleValidation = [
  mongoIdParam('roleId'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 80 })
    .withMessage('Name must be at most 80 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('permissionIds')
    .optional()
    .isArray({ min: 0 })
    .withMessage('permissionIds must be an array'),
  body('permissionIds.*').optional().isMongoId().withMessage('Each permissionIds entry must be a valid id'),
];

const assignPermissionsValidation = [
  mongoIdParam('roleId'),
  body('permissionIds')
    .isArray({ min: 0 })
    .withMessage('permissionIds must be an array'),
  body('permissionIds.*').isMongoId().withMessage('Each permissionIds entry must be a valid id'),
];

const roleIdOnlyValidation = [mongoIdParam('roleId')];

module.exports = {
  createRoleValidation,
  updateRoleValidation,
  assignPermissionsValidation,
  roleIdOnlyValidation,
};
