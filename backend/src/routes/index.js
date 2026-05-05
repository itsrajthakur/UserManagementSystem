const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const roleRoutes = require('./role.routes');
const permissionRoutes = require('./permission.routes');
const userRoutes = require('./user.routes');
const rbacDemoRoutes = require('./rbac-demo.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rbac-demo', rbacDemoRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);

module.exports = router;
