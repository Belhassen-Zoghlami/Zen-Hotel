const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const reqRoles = require('../middleware/role.middleware');
const paymentController = require('../controllers/payment.controller');

router.post('/create-checkout', auth, reqRoles('client'), paymentController.createCheckout);
router.post('/verify-session', auth, reqRoles('client'), paymentController.verifySession);
router.post('/refund', auth, reqRoles('client', 'owner', 'admin'), paymentController.refund);

module.exports = router;
