const express = require('express');
const router = express.Router();
const  optAuth = require('../middleware/OptAuth.middleware')
const homecontroller = require('../controllers/home.controller');

router.get('/home',optAuth,homecontroller.homepage);

module.exports = router;