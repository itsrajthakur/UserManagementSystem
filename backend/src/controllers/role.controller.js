const { Role, Permission, User } = require('../models');
const createHttpError = require('../utils/httpError');
const { PROTECTED_ROLE_NAMES } = require('../constants/rbac');

function isProtectedRole(role) {
  return PROTECTED_ROLE_NAMES.includes(role.name);
}

async function createRole(req, res, next) {
  try {
    const { name, description, permissionIds = [] } = req.body;
    const exists = await Role.findOne({ name });
    if (exists) {
      return next(createHttpError(409, 'Role name already exists'));
    }

    const uniqueIds = [...new Set(permissionIds.map((id) => String(id)))];
    if (uniqueIds.length) {
      const count = await Permission.countDocuments({ _id: { $in: uniqueIds } });
      if (count !== uniqueIds.length) {
        return next(createHttpError(400, 'One or more permission ids are invalid'));
      }
    }

    const role = await Role.create({
      name,
      description: description != null ? String(description).trim() : '',
      permissions: uniqueIds,
    });

    const populated = await Role.findById(role._id).populate('permissions', 'resource action description');

    return res.status(201).json({
      success: true,
      message: 'Role created',
      data: { role: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function listRoles(req, res, next) {
  try {
    const roles = await Role.find().sort({ name: 1 }).populate('permissions', 'resource action description');

    return res.json({
      success: true,
      data: { roles },
    });
  } catch (err) {
    return next(err);
  }
}

async function getRoleById(req, res, next) {
  try {
    const role = await Role.findById(req.params.roleId).populate('permissions', 'resource action description');

    if (!role) {
      return next(createHttpError(404, 'Role not found'));
    }

    return res.json({
      success: true,
      data: { role },
    });
  } catch (err) {
    return next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) {
      return next(createHttpError(404, 'Role not found'));
    }

    const { name, description, permissionIds } = req.body;

    if (name !== undefined && name.trim() !== role.name) {
      if (isProtectedRole(role)) {
        return next(createHttpError(403, 'Cannot rename a protected role'));
      }
      const dup = await Role.findOne({ name: name.trim(), _id: { $ne: role._id } });
      if (dup) {
        return next(createHttpError(409, 'Role name already exists'));
      }
      role.name = name.trim();
    }

    if (description !== undefined) {
      role.description = String(description).trim();
    }

    if (permissionIds !== undefined) {
      const uniqueIds = [...new Set(permissionIds.map((id) => String(id)))];
      const count = await Permission.countDocuments({ _id: { $in: uniqueIds } });
      if (count !== uniqueIds.length) {
        return next(createHttpError(400, 'One or more permission ids are invalid'));
      }
      role.permissions = uniqueIds;
    }

    if (name !== undefined || description !== undefined || permissionIds !== undefined) {
      await role.save();
    }

    const populated = await Role.findById(role._id).populate('permissions', 'resource action description');

    return res.json({
      success: true,
      message: 'Role updated',
      data: { role: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function assignPermissionsToRole(req, res, next) {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) {
      return next(createHttpError(404, 'Role not found'));
    }

    const uniqueIds = [...new Set(req.body.permissionIds.map((id) => String(id)))];

    const count = await Permission.countDocuments({ _id: { $in: uniqueIds } });
    if (count !== uniqueIds.length) {
      return next(createHttpError(400, 'One or more permission ids are invalid'));
    }

    role.permissions = uniqueIds;
    await role.save();

    const populated = await Role.findById(role._id).populate('permissions', 'resource action description');

    return res.json({
      success: true,
      message: 'Permissions assigned to role',
      data: { role: populated },
    });
  } catch (err) {
    return next(err);
  }
}

async function deleteRole(req, res, next) {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) {
      return next(createHttpError(404, 'Role not found'));
    }

    if (isProtectedRole(role)) {
      return next(createHttpError(403, 'Cannot delete a protected role'));
    }

    const assigned = await User.countDocuments({ role: role._id });
    if (assigned > 0) {
      return next(createHttpError(409, 'Cannot delete role assigned to users'));
    }

    await Role.deleteOne({ _id: role._id });

    return res.json({
      success: true,
      message: 'Role deleted',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createRole,
  listRoles,
  getRoleById,
  updateRole,
  assignPermissionsToRole,
  deleteRole,
};
