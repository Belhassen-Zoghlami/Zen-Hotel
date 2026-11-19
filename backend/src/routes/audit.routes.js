const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const reqRoles = require('../middleware/role.middleware');
const auditController = require('../controllers/audit.controller');

router.get('/', auth, reqRoles('admin'), auditController.getAuditLogs);

module.exports = router;
