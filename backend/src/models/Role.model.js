const mongoose = require('mongoose');
const { ROLE_LEVEL, ROLE_LEVEL_BY_CANONICAL_NAME } = require('../constants/rbac');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    /** Privilege rank — higher value = more powerful (see constants/rbac ROLE_LEVEL). */
    roleLevel: {
      type: Number,
      required: true,
      min: ROLE_LEVEL.EMPLOYEE,
      max: ROLE_LEVEL.SUPERADMIN,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    /** Inactive roles block login and all secured API access for assigned users. */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    /** Permissions inherited by every user assigned this role (ObjectIds → Permission). */
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
  },
  { timestamps: true }
);

roleSchema.pre('validate', function assignDefaultRoleLevel(next) {
  if (this.roleLevel == null) {
    const n = String(this.name || '').trim();
    this.roleLevel =
      ROLE_LEVEL_BY_CANONICAL_NAME[n] !== undefined
        ? ROLE_LEVEL_BY_CANONICAL_NAME[n]
        : ROLE_LEVEL.EMPLOYEE;
  }
  next();
});

module.exports = mongoose.model('Role', roleSchema);
