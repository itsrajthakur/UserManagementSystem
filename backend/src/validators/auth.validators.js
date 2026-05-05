const { body, query } = require('express-validator');

const signupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 120 })
    .withMessage('Name must be at most 120 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .normalizeEmail()
    .isEmail()
    .withMessage('Invalid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .normalizeEmail()
    .isEmail()
    .withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .normalizeEmail()
    .isEmail(),
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
];

const verifyEmailBodyValidation = [body('token').trim().notEmpty().withMessage('Token is required')];

const verifyEmailQueryValidation = [query('token').trim().notEmpty().withMessage('Token is required')];

module.exports = {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailBodyValidation,
  verifyEmailQueryValidation,
};
