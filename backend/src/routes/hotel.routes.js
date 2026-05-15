const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const reqRoles = require('../middleware/role.middleware');
const optAuth = require('../middleware/OptAuth.middleware');
const upload = require('../middleware/images.middleware');
const { cacheMiddleware } = require('../middleware/cache.middleware');

const hotelController = require('../controllers/hotel.controller');

/**
 * @swagger
 * tags:
 *   name: Hotels
 *   description: Hotel management
 */


/**
 * @swagger
 * /Hotel:
 *   post:
 *     summary: Create a new hotel (owner/admin)
 *     tags: [Hotels]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *               - rating
 *             properties:
 *               name:
 *                 type: string
 *                 example: Grand Palace Hotel
 *               location:
 *                 type: string
 *                 example: Paris, France
 *               rating:
 *                 type: string
 *                 example: "5"
 *               description:
 *                 type: string
 *                 example: A luxury hotel in the heart of Paris
 *     responses:
 *       201:
 *         description: Hotel created successfully
 *       403:
 *         description: Access unauthorized
 */
//create route
router.post('/',auth,reqRoles('owner','admin'),upload.array("images",5),hotelController.CreateHoltel);

/**
 * @swagger
 * /Hotel:
 *   get:
 *     summary: Get all hotels
 *     tags: [Hotels]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: rating
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of hotels
 */
//get all trivagos route
router.get('/', cacheMiddleware(300000), optAuth, hotelController.GetAllHotels); // Cache for 5 minutes

/**
 * @swagger
 * /Hotel/{id}:
 *   get:
 *     summary: Get hotel by id
 *     tags: [Hotels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel details
 */
//get hotel by id route
router.get('/:id', cacheMiddleware(300000), optAuth, hotelController.GetHotel); // Cache for 5 minutes

/**
 * @swagger
 * /Hotel/{id}:
 *   patch:
 *     summary: Update hotel (owner/admin)
 *     tags: [Hotels]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               rating:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hotel updated
 */
//update hotel route
router.patch('/:id',auth,reqRoles('owner','admin'),upload.array("images",5),hotelController.UpdateHotel);


/**
 * @swagger
 * /Hotel/{id}:
 *   delete:
 *     summary: Delete hotel (owner/admin)
 *     tags: [Hotels]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel deleted
 */
//delete hotel route
router.delete('/:id',auth,reqRoles('owner','admin'),hotelController.DeleteHotel);

module.exports = router;

