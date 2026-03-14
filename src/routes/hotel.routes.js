const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const reqRoles = require('../middleware/role.middleware');
const optAuth = require('../middleware/OptAuth.middleware');

const hotelController = require('../controllers/hotel.controller');

//create route
router.post('/',auth,reqRoles('owner','admin'),hotelController.CreateHoltel);
//get all trivagos route
router.get('/',optAuth,hotelController.GetAllHotels);
//get hotel by id route
router.get('/:id',optAuth,hotelController.GetHotel);
//update hotel route
router.patch('/:id',auth,reqRoles('owner','admin'),hotelController.UpdateHotel);
//delete hotel route
router.delete('/:id',auth,reqRoles('owner','admin'),hotelController.DeleteHotel);

module.exports = router;

