const { Router } = require('express');
const {
  signup,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middlewares/validate.middleware');
const {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailBodyValidation,
  verifyEmailQueryValidation,
} = require('../validators/auth.validators');

const router = Router();

router.post('/signup', signupValidation, validateRequest, signup);
router.post('/login', loginValidation, validateRequest, login);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validateRequest, resetPassword);
router.post('/verify-email', verifyEmailBodyValidation, validateRequest, verifyEmail);
router.get('/verify-email', verifyEmailQueryValidation, validateRequest, verifyEmail);

router.get('/me', authenticate, getMe);

module.exports = router;
