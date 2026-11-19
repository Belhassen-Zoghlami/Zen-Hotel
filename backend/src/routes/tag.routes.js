const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const reqRoles = require('../middleware/role.middleware');
const tagController = require('../controllers/tag.controller');

router.post('/', auth, reqRoles('admin', 'owner'), tagController.createTag);
router.get('/', tagController.getTags);
router.get('/:id', tagController.getTagById);
router.patch('/:id', auth, reqRoles('admin', 'owner'), tagController.updateTag);
router.delete('/:id', auth, reqRoles('admin', 'owner'), tagController.deleteTag);

module.exports = router;
