"use strict";

const express = require("express");
const router = express.Router();
const optAuth = require("../middleware/OptAuth.middleware");
const aiRateLimit = require("../middleware/aiRateLimit.middleware");
const aiController = require("../controllers/ai.controller");

/**
 * @swagger
 * tags:
 *   name: AI Recommendations
 *   description: AI-powered hotel recommendations (Gemini 1.5 Flash + rule-based fallback)
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
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
// aiRateLimit runs first, then optAuth, then the handler
router.post(
  "/recommendations",
  aiRateLimit,
  optAuth,
  aiController.getRecommendations,
);

/**
 * @swagger
 * /ai/health:
 *   get:
 *     summary: Check AI service health and rate-limit state
 *     tags: [AI Recommendations]
 *     responses:
 *       200:
 *         description: AI service status including Gemini availability and rate limits
 */
router.get("/health", aiController.healthCheck);

/**
 * @swagger
 * /ai/rate-limit-status:
 *   get:
 *     summary: Get current rate-limit counters for the requesting IP
 *     tags: [AI Recommendations]
 *     responses:
 *       200:
 *         description: Rate-limit state for the requesting IP
 */
router.get("/rate-limit-status", aiController.getRateLimitStatus);

module.exports = router;
