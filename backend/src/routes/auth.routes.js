const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@zenhotels.com
 *               password:
 *                 type: string
 *                 example: Admin123456
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.Logout);
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);

module.exports = router;
