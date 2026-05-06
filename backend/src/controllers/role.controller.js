const { Role, Permission, User } = require('../models');
const createHttpError = require('../utils/httpError');
const { ROLE_LEVEL } = require('../constants/rbac');
const {
  inferRoleLevel,
  isImmutableSuperAdminRole,
  assertCanManageRoleDefinition,
} = require('../utils/roleHierarchy');

async function createRole(req, res, next) {
  try {
    const { name, description, isActive, permissionIds = [] } = req.body;
    let requestedLevel = req.body.roleLevel;

    if (requestedLevel != null) {
      requestedLevel = Number(requestedLevel);
      if (!Number.isFinite(requestedLevel)) {
        return next(createHttpError(400, 'roleLevel must be a number'));
      }
      if (requestedLevel >= ROLE_LEVEL.SUPERADMIN) {
        return next(createHttpError(403, 'Cannot create a SuperAdmin-level role via API'));
      }
      if (requestedLevel >= req.rbac.actorRoleLevel) {
        return next(createHttpError(403, 'Cannot create a role at or above your privilege level'));
      }
    }

    const trimmedName = String(name || '').trim();
    if (/^superadmin$/i.test(trimmedName)) {
      return next(createHttpError(403, 'Reserved role name'));
    }

    const exists = await Role.findOne({ name: trimmedName, isDeleted: false });
    if (exists) {
      return next(createHttpError(409, 'Role name already exists'));
    }

    const uniqueIds = [...new Set(permissionIds.map((id) => String(id)))];
    if (uniqueIds.length) {
      const count = await Permission.countDocuments({ _id: { $in: uniqueIds }, isDeleted: false });
      if (count !== uniqueIds.length) {
        return next(createHttpError(400, 'One or more permission ids are invalid'));
      }
    }

    const roleLevel =
      requestedLevel !== undefined && requestedLevel !== null
        ? requestedLevel
        : ROLE_LEVEL.EMPLOYEE;

    if (roleLevel >= ROLE_LEVEL.SUPERADMIN) {
      return next(createHttpError(403, 'Invalid role level'));
    }
    if (roleLevel >= req.rbac.actorRoleLevel) {
      return next(createHttpError(403, 'Cannot create a role at or above your privilege level'));
    }

    const role = await Role.create({
      name: trimmedName,
      roleLevel,
      description: description != null ? String(description).trim() : '',
      isActive: isActive !== false,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      permissions: uniqueIds,
    });

    const populated = await Role.findById(role._id).populate({
      path: 'permissions',
      select: 'resource action description',
      match: { isDeleted: false },
    });

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
    const actorLevel = req.rbac.actorRoleLevel;
    const roles = await Role.find({ roleLevel: { $lt: actorLevel }, isDeleted: false })
      .sort({ roleLevel: -1, name: 1 })
      .populate({
        path: 'permissions',
        select: 'resource action description',
        match: { isDeleted: false },
      });

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
    const role = await Role.findOne({ _id: req.params.roleId, isDeleted: false }).populate({
      path: 'permissions',
      select: 'resource action description',
      match: { isDeleted: false },
    });

    if (!role) {
      return next(createHttpError(404, 'Role not found'));
    }

    if (inferRoleLevel(role) >= req.rbac.actorRoleLevel) {
      return next(createHttpError(403, 'Cannot access roles at or above your privilege level'));
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
    const role = await Role.findOne({ _id: req.params.roleId, isDeleted: false });
    if (!role) {
      return next(createHttpError(404, 'Role not found'));
    }

    if (isImmutableSuperAdminRole(role)) {
      return next(createHttpError(403, 'This system role cannot be modified'));
    }

    assertCanManageRoleDefinition(req, role);

    const { name, description, permissionIds, isActive } = req.body;

    if (name !== undefined && String(name).trim() !== role.name) {
      if (/^superadmin$/i.test(String(name).trim())) {
        return next(createHttpError(403, 'Reserved role name'));
      }
      const dup = await Role.findOne({
        name: String(name).trim(),
        _id: { $ne: role._id },
        isDeleted: false,
      });
      if (dup) {
        return next(createHttpError(409, 'Role name already exists'));
      }
      role.name = String(name).trim();
    }

    if (description !== undefined) {
      role.description = String(description).trim();
    }

    if (isActive !== undefined) {
      role.isActive = Boolean(isActive);
    }

    if (req.body.roleLevel !== undefined) {
      const nextLevel = Number(req.body.roleLevel);
      if (!Number.isFinite(nextLevel)) {
        return next(createHttpError(400, 'roleLevel must be a number'));
      }
      if (nextLevel >= ROLE_LEVEL.SUPERADMIN) {
        return next(createHttpError(403, 'Cannot set SuperAdmin-level role via API'));
      }
      if (nextLevel >= req.rbac.actorRoleLevel) {
        return next(createHttpError(403, 'Cannot set role level at or above your privilege level'));
      }
      role.roleLevel = nextLevel;
    }

    if (permissionIds !== undefined) {
      const uniqueIds = [...new Set(permissionIds.map((id) => String(id)))];
      const count = await Permission.countDocuments({ _id: { $in: uniqueIds }, isDeleted: false });
      if (count !== uniqueIds.length) {
        return next(createHttpError(400, 'One or more permission ids are invalid'));
      }
      role.permissions = uniqueIds;
    }

    if (
      name !== undefined ||
      description !== undefined ||
      isActive !== undefined ||
      permissionIds !== undefined ||
      req.body.roleLevel !== undefined
    ) {
      await role.save();
    }

    const populated = await Role.findOne({ _id: role._id, isDeleted: false }).populate({
      path: 'permissions',
      select: 'resource action description',
      match: { isDeleted: false },
    });

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
    const role = await Role.findOne({ _id: req.params.roleId, isDeleted: false });
    if (!role) {
      return next(createHttpError(404, 'Role not found'));
    }

    if (isImmutableSuperAdminRole(role)) {
      return next(createHttpError(403, 'This system role cannot be modified'));
    }

    assertCanManageRoleDefinition(req, role);

    const uniqueIds = [...new Set(req.body.permissionIds.map((id) => String(id)))];
    const count = await Permission.countDocuments({ _id: { $in: uniqueIds }, isDeleted: false });
    if (count !== uniqueIds.length) {
      return next(createHttpError(400, 'One or more permission ids are invalid'));
    }

    role.permissions = uniqueIds;
    await role.save();

    const populated = await Role.findOne({ _id: role._id, isDeleted: false }).populate({
      path: 'permissions',
      select: 'resource action description',
      match: { isDeleted: false },
    });

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
    const role = await Role.findOne({ _id: req.params.roleId, isDeleted: false });
    if (!role) {
      return next(createHttpError(404, 'Role not found'));
    }

    if (isImmutableSuperAdminRole(role)) {
      return next(createHttpError(403, 'Cannot delete a protected system role'));
    }

    assertCanManageRoleDefinition(req, role);

    const assigned = await User.countDocuments({ role: role._id, isDeleted: false });
    if (assigned > 0) {
      return next(createHttpError(409, 'Cannot delete role assigned to users'));
    }

    role.isDeleted = true;
    role.deletedAt = new Date();
    role.deletedBy = req.auth?.sub || null;
    await role.save();

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
  async restoreRole(req, res, next) {
    try {
      const role = await Role.findOne({ _id: req.params.roleId, isDeleted: true });
      if (!role) return next(createHttpError(404, 'Deleted role not found'));

      if (role.roleLevel >= req.rbac.actorRoleLevel) {
        return next(createHttpError(403, 'Cannot restore role at or above your privilege level'));
      }

      role.isDeleted = false;
      role.deletedAt = null;
      role.deletedBy = null;
      await role.save();

      const populated = await Role.findOne({ _id: role._id, isDeleted: false }).populate({
        path: 'permissions',
        select: 'resource action description',
        match: { isDeleted: false },
      });

      return res.json({
        success: true,
        message: 'Role restored',
        data: { role: populated },
      });
    } catch (err) {
      return next(err);
    }
  },
};
