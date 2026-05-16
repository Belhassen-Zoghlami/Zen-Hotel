const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const reqRole = require("../middleware/role.middleware");
const adminController = require("../controllers/admin.controller");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/users", auth, reqRole("admin"), adminController.getAllUsers);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get user by id (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 */
router.get("/users/:userId", auth, reqRole("admin"), adminController.getUser);

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Delete user (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete(
  "/users/:userId",
  auth,
  reqRole("admin"),
  adminController.deleteUser,
);

/**
 * @swagger
 * /admin/users/validate-owner/{userId}:
 *   patch:
 *     summary: Validate owner account (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Owner validated
 */
router.patch(
  "/users/validate-owner/:userId",
  auth,
  reqRole("admin"),
  adminController.validateOwner,
);

/**
 * @swagger
 * /admin/users/toggle-user/{userId}:
 *   patch:
 *     summary: Toggle user active status (admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status toggled
 */
router.patch(
  "/users/toggle-user/:userId",
  auth,
  reqRole("admin"),
  adminController.toggleUserStatus,
);

module.exports = router;
