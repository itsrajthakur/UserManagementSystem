const bcrypt = require('bcrypt');
const { User, Role } = require('../models');
const { EMPLOYEE_ROLE_NAME } = require('../constants/rbac');
const { signToken } = require('../utils/jwt');
const createHttpError = require('../utils/httpError');
const { hashToken, generateRawToken } = require('../utils/tokenHash');
const logger = require('../utils/logger');
const {
  requireEmailVerification,
  appPublicUrl,
  isProd,
} = require('../config/env');

const BCRYPT_ROUNDS = 12;
const RESET_EXPIRE_MS = 60 * 60 * 1000;
const VERIFY_EXPIRE_MS = 48 * 3600 * 1000;

async function ensureEmployeeRole() {
  let role = await Role.findOne({ name: EMPLOYEE_ROLE_NAME, isDeleted: false });
  if (!role) {
    role = await Role.create({
      name: EMPLOYEE_ROLE_NAME,
      description: 'Default self-service user',
      isActive: true,
      permissions: [],
    });
  }
  return role;
}

async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const memberRole = await ensureEmployeeRole();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const payload = {
      name,
      email,
      password: passwordHash,
      role: memberRole._id,
      emailVerified: !requireEmailVerification,
    };

    let rawVerify;
    if (requireEmailVerification) {
      rawVerify = generateRawToken(32);
      payload.emailVerificationTokenHash = hashToken(rawVerify);
      payload.emailVerificationExpires = new Date(Date.now() + VERIFY_EXPIRE_MS);
    }

    const user = await User.create(payload);
    const populated = await User.findById(user._id)
      .select('-password')
      .populate('role', 'name roleLevel isActive permissions');

    if (requireEmailVerification) {
      if (!isProd) {
        logger.info('Email verification link (development)', {
          verifyUrl: `${appPublicUrl}/verify-email?token=${rawVerify}`,
        });
      }
      return res.status(201).json({
        success: true,
        message:
          'Account created. Check your email to verify before using secured APIs when BLOCK_UNVERIFIED_API=true.',
        data: {
          user: populated,
          needsEmailVerification: true,
        },
      });
    }

    const token = signToken({ sub: user._id.toString() });
    return res.status(201).json({
      success: true,
      message: 'Account created',
      data: {
        user: populated,
        token,
        needsEmailVerification: false,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const deletedUser = await User.findOne({ email, isDeleted: true }).select('_id');
    if (deletedUser) {
      return res.status(403).json({ success: false, message: 'Account is deleted' });
    }

    const user = await User.findOne({ email, isDeleted: false })
      .select('+password')
      .populate({
        path: 'role',
        select: 'name roleLevel isActive isDeleted permissions',
        match: { isDeleted: false },
      });

    const valid = user && (await bcrypt.compare(password, user.password));
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }
    if (!user.role) {
      return res.status(403).json({ success: false, message: 'Assigned role is deleted. Please contact admin.' });
    }
    if (user.role.isDeleted) {
      return res.status(403).json({ success: false, message: 'Assigned role is deleted. Please contact admin.' });
    }
    if (!user.role || user.role.isActive === false) {
      return res
        .status(403)
        .json({ success: false, message: 'Your role is inactive. Please contact admin.' });
    }

    const userOut = user.toObject();
    delete userOut.password;

    const token = signToken({ sub: user._id.toString() });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userOut,
        token,
        needsEmailVerification: !user.emailVerified,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findOne({ _id: req.auth.sub, isDeleted: false })
      .select('-password')
      .populate({
        path: 'role',
        select: 'name roleLevel isActive isDeleted',
        match: { isDeleted: false },
        populate: {
          path: 'permissions',
          select: 'resource action description',
          match: { isDeleted: false },
        },
      })
      .populate({ path: 'customPermissions', select: 'resource action description', match: { isDeleted: false } })
      .populate({ path: 'deniedPermissions', select: 'resource action description', match: { isDeleted: false } });

    if (!user) {
      return next(createHttpError(404, 'User not found'));
    }

    if (!user.isActive) {
      return next(createHttpError(403, 'Account is deactivated'));
    }
    if (!user.role || user.role.isDeleted) {
      return next(createHttpError(403, 'Assigned role is deleted. Please contact admin.'));
    }
    if (!user.role || user.role.isActive === false) {
      return next(createHttpError(403, 'Your role is inactive. Please contact admin.'));
    }

    return res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

/** Generic response prevents email enumeration. */
async function forgotPassword(req, res, next) {
  try {
    const rawEmail = (req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email: rawEmail, isDeleted: false }).select('+password');

    const generic = {
      success: true,
      message: 'If an account exists for that email, password reset instructions have been sent.',
    };

    if (!user || !user.isActive) {
      return res.json(generic);
    }

    const raw = generateRawToken(32);
    user.passwordResetTokenHash = hashToken(raw);
    user.passwordResetExpires = new Date(Date.now() + RESET_EXPIRE_MS);
    await user.save();

    if (!isProd) {
      logger.info('Password reset token (dev only)', {
        resetUrl: `${appPublicUrl}/reset-password?token=${raw}`,
      });
    }

    return res.json(generic);
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
      isDeleted: false,
    }).select('+password +passwordResetTokenHash +passwordResetExpires');

    if (!user) {
      return next(createHttpError(400, 'Invalid or expired reset token'));
    }

    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password has been reset. You can sign in.' });
  } catch (err) {
    return next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const raw = (req.body.token || req.query.token || '').trim();
    if (!raw) {
      return next(createHttpError(400, 'Verification token required'));
    }
    const th = hashToken(raw);

    const user = await User.findOne({
      emailVerificationTokenHash: th,
      emailVerificationExpires: { $gt: new Date() },
      isDeleted: false,
    }).select('+emailVerificationTokenHash +emailVerificationExpires');

    if (!user) {
      return next(createHttpError(400, 'Invalid or expired verification token'));
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = signToken({ sub: user._id.toString() });

    return res.json({
      success: true,
      message: 'Email verified',
      data: { token },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  signup,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
