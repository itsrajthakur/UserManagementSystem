const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
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

module.exports = mongoose.model('Role', roleSchema);
