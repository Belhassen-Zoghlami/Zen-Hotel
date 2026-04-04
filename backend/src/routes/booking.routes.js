const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const reqRoles = require('../middleware/role.middleware');
const bookingController = require('../controllers/booking.controller');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management
 */

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - hotelId
 *               - checkIn
 *               - checkOut
 *             properties:
 *               roomId:
 *                 type: string
 *                 example: 64f1a2b3c4d5e6f7a8b9c0d1
 *               hotelId:
 *                 type: string
 *                 example: 64f1a2b3c4d5e6f7a8b9c0d2
 *               checkIn:
 *                 type: string
 *                 format: date
 *                 example: 2026-04-01
 *               checkOut:
 *                 type: string
 *                 format: date
 *                 example: 2026-04-05
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Conflict dates or invalid input
 *       401:
 *         description: Authentication required
 */
router.post('/', auth, reqRoles('client'), bookingController.createBooking);

/**
 * @swagger
 * /bookings/my:
 *   get:
 *     summary: Get all bookings of the logged-in client
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of client bookings
 *       401:
 *         description: Authentication required
 */
router.get('/my', auth, reqRoles('client'), bookingController.getMyBookings);

/**
 * @swagger
 * /bookings/all:
 *   get:
 *     summary: Get all bookings (admin only)
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all bookings
 *       403:
 *         description: Insufficient permissions
 */
router.get('/all', auth, reqRoles('admin'), bookingController.getAllBookings);

/**
 * @swagger
 * /bookings/hotel/{hotelId}:
 *   get:
 *     summary: Get all bookings for a specific hotel (owner/admin)
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of hotel bookings
 *       403:
 *         description: Insufficient permissions
 */
router.get('/hotel/:hotelId', auth, reqRoles('owner', 'admin'), bookingController.getHotelBookings);

/**
 * @swagger
 * /bookings/{bookingId}/confirm:
 *   patch:
 *     summary: Confirm a booking (owner/admin)
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking confirmed
 *       400:
 *         description: Only pending bookings can be confirmed
 *       404:
 *         description: Booking not found
 */
router.patch('/:bookingId/confirm', auth, reqRoles('owner', 'admin'), bookingController.confirmBooking);

/**
 * @swagger
 * /bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel a booking (client/owner/admin)
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelReason:
 *                 type: string
 *                 example: Change of plans
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       403:
 *         description: Access unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch('/:bookingId/cancel', auth, reqRoles('client', 'owner', 'admin'), bookingController.cancelBooking);

module.exports = router;