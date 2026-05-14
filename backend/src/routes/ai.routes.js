const express = require('express');
const router = express.Router();
const optAuth = require('../middleware/OptAuth.middleware');
const aiController = require('../controllers/ai.controller');

/**
 * @swagger
 * tags:
 *   name: AI Recommendations
 *   description: AI-powered hotel recommendations
 */

/**
 * @swagger
 * /ai/recommendations:
 *   post:
 *     summary: Get AI-powered hotel recommendations
 *     tags: [AI Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: I'm looking for a luxury hotel in Paris with 5 stars
 *               conversationHistory:
 *                 type: array
 *                 description: Previous conversation context for follow-up questions
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Recommendations generated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/recommendations', optAuth, aiController.getRecommendations);

/**
 * @swagger
 * /ai/health:
 *   get:
 *     summary: Check AI service health
 *     tags: [AI Recommendations]
 *     responses:
 *       200:
 *         description: AI service is running
 */
router.get('/health', aiController.healthCheck);

module.exports = router;
