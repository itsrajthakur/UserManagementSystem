const mongoose = require('mongoose');
const { Permission, Role } = require('../models');
const createHttpError = require('../utils/httpError');

async function createPermission(req, res, next) {
  try {
    const { resource, action, description } = req.body;

    const permission = await Permission.create({
      resource,
      action,
      description: description || '',
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
    const permissions = await Permission.find().sort({ resource: 1, action: 1 });

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
    const permission = await Permission.findById(req.params.permissionId);
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
    const permission = await Permission.findById(req.params.permissionId);
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
    const permission = await Permission.findById(req.params.permissionId).session(session);
    if (!permission) {
      await session.abortTransaction();
      return next(createHttpError(404, 'Permission not found'));
    }

    await Role.updateMany(
      { permissions: permission._id },
      { $pull: { permissions: permission._id } },
      { session }
    );

    await Permission.deleteOne({ _id: permission._id }).session(session);
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

module.exports = {
  createPermission,
  listPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
};
