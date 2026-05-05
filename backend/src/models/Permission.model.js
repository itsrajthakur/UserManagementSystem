const mongoose = require('mongoose');

/** Standard CRUD actions for RBAC. */
const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'];

const permissionSchema = new mongoose.Schema(
  {
    /** Logical resource key, e.g. "users", "roles", "permissions". */
    resource: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    action: {
      type: String,
      required: true,
      enum: PERMISSION_ACTIONS,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

permissionSchema.virtual('slug').get(function slugGetter() {
  return `${this.resource}:${this.action}`;
});

permissionSchema.set('toJSON', { virtuals: true });
permissionSchema.set('toObject', { virtuals: true });

module.exports = {
  Permission: mongoose.model('Permission', permissionSchema),
  PERMISSION_ACTIONS,
};
