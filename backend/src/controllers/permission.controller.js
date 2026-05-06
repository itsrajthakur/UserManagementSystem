const mongoose = require('mongoose');
const { Permission, Role } = require('../models');
const createHttpError = require('../utils/httpError');

async function createPermission(req, res, next) {
  try {
    const { resource, action, description } = req.body;

    const exists = await Permission.findOne({ resource, action, isDeleted: false });
    if (exists) {
      return next(createHttpError(409, 'Permission already exists'));
    }

    const permission = await Permission.create({
      resource,
      action,
      description: description || '',
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });

    return res.status(201).json({
      success: true,
      message: 'Permission created',
      data: { permission },
    });
  } catch (err) {
    return next(err);
  }
}

async function listPermissions(req, res, next) {
  try {
    const permissions = await Permission.find({ isDeleted: false }).sort({ resource: 1, action: 1 });

    return res.json({
      success: true,
      data: { permissions },
    });
  } catch (err) {
    return next(err);
  }
}

async function getPermissionById(req, res, next) {
  try {
    const permission = await Permission.findOne({ _id: req.params.permissionId, isDeleted: false });
    if (!permission) {
      return next(createHttpError(404, 'Permission not found'));
    }

    return res.json({
      success: true,
      data: { permission },
    });
  } catch (err) {
    return next(err);
  }
}

async function updatePermission(req, res, next) {
  try {
    const permission = await Permission.findOne({ _id: req.params.permissionId, isDeleted: false });
    if (!permission) {
      return next(createHttpError(404, 'Permission not found'));
    }

    if (req.body.description !== undefined) {
      permission.description = req.body.description;
    }

    await permission.save();

    return res.json({
      success: true,
      message: 'Permission updated',
      data: { permission },
    });
  } catch (err) {
    return next(err);
  }
}

async function deletePermission(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const permission = await Permission.findOne({ _id: req.params.permissionId, isDeleted: false }).session(
      session
    );
    if (!permission) {
      await session.abortTransaction();
      return next(createHttpError(404, 'Permission not found'));
    }

    await Role.updateMany(
      { permissions: permission._id },
      { $pull: { permissions: permission._id } },
      { session }
    );

    permission.isDeleted = true;
    permission.deletedAt = new Date();
    permission.deletedBy = req.auth?.sub || null;
    await permission.save({ session });
    await session.commitTransaction();

    return res.json({
      success: true,
      message: 'Permission deleted',
    });
  } catch (err) {
    await session.abortTransaction();
    return next(err);
  } finally {
    session.endSession();
  }
}

async function restorePermission(req, res, next) {
  try {
    const permission = await Permission.findOne({ _id: req.params.permissionId, isDeleted: true });
    if (!permission) return next(createHttpError(404, 'Deleted permission not found'));

    const clash = await Permission.findOne({
      _id: { $ne: permission._id },
      resource: permission.resource,
      action: permission.action,
      isDeleted: false,
    });
    if (clash) {
      return next(
        createHttpError(409, 'Cannot restore permission because an active permission with same key exists')
      );
    }

    permission.isDeleted = false;
    permission.deletedAt = null;
    permission.deletedBy = null;
    await permission.save();

    return res.json({
      success: true,
      message: 'Permission restored',
      data: { permission },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createPermission,
  listPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
  restorePermission,
};
