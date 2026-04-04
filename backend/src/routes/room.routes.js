const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const auth = require('../middleware/auth.middleware');
const reqRoles = require('../middleware/role.middleware');
const upload = require('../middleware/images.middleware');

//get all rooms route
router.get('/:hotelId',auth,reqRoles('owner','admin'),roomController.GetHotelRooms);
//create room route
router.post('/:hotelId',auth,reqRoles('owner','admin'),upload.array("images",5),roomController.CreateRoom);
//get room by id route
router.get('/:hotelId/:roomId',auth,reqRoles('owner','admin'),roomController.GetRoom);
//update room route
router.patch('/:hotelId/:roomId',auth,reqRoles('owner','admin'),roomController.UpdateRoom);
//delete room route
router.delete('/:hotelId/:roomId',auth, reqRoles('owner','admin'), roomController.DeleteRoom);

module.exports = router;