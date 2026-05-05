const { body, param } = require('express-validator');
const { PERMISSION_ACTIONS } = require('../models/Permission.model');

const mongoIdParam = (name = 'permissionId') =>
  param(name).isMongoId().withMessage(`Invalid ${name}`);

const createPermissionValidation = [
  body('resource')
    .trim()
    .notEmpty()
    .withMessage('resource is required')
    .customSanitizer((v) => String(v).trim().toLowerCase())
    .matches(/^[a-z][a-z0-9_-]{1,79}$/)
    .withMessage(
      'resource must be lowercase and 2-80 chars (letters, numbers, _ or -), e.g. users'
    ),
  body('action')
    .trim()
    .notEmpty()
    .withMessage('action is required')
    .isIn(PERMISSION_ACTIONS)
    .withMessage(`action must be one of: ${PERMISSION_ACTIONS.join(', ')}`),
  body('description').optional().trim().isLength({ max: 500 }),
];

const updatePermissionValidation = [
  mongoIdParam('permissionId'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('description must be at most 500 characters'),
];

const permissionIdOnlyValidation = [mongoIdParam('permissionId')];

module.exports = {
  createPermissionValidation,
  updatePermissionValidation,
  permissionIdOnlyValidation,
};
