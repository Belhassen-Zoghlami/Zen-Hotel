const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const auth = require('../middleware/auth.middleware');
const reqRoles = require('../middleware/role.middleware');
const upload = require('../middleware/images.middleware');
const optAuth = require('../middleware/OptAuth.middleware');


/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management
 */

/**
 * @swagger
 * /Room/{hotelId}:
 *   post:
 *     summary: Create a room (owner/admin)
 *     tags: [Rooms]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - roomNumber
 *               - type
 *               - capacity
 *               - pricePerNight
 *               - isAvailable
 *             properties:
 *               roomNumber:
 *                 type: string
 *                 example: "101"
 *               type:
 *                 type: string
 *                 enum: [single, double, suite]
 *                 example: single
 *               capacity:
 *                 type: number
 *                 example: 2
 *               pricePerNight:
 *                 type: number
 *                 example: 120
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Wifi", "AC", "TV"]
 *               description:
 *                 type: string
 *                 example: Cozy room with city view
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Room images
 *     responses:
 *       200:
 *         description: Room created successfully
 *       403:
 *         description: Access unauthorized
 */
//get all rooms route
router.get('/:hotelId',optAuth,roomController.GetHotelRooms);
//create room route
router.post('/:hotelId',auth,reqRoles('owner','admin'),upload.array("images",5),roomController.CreateRoom);
//get room by id route
router.get('/:hotelId/:roomId',auth,roomController.GetRoom);
//update room route
router.patch('/:hotelId/:roomId',auth,reqRoles('owner','admin'),upload.array("images",5),roomController.UpdateRoom);
//delete room route
router.delete('/:hotelId/:roomId',auth, reqRoles('owner','admin'), roomController.DeleteRoom);

module.exports = router;