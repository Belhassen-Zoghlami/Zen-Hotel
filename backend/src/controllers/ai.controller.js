"use strict";

const aiService = require("../services/ai.service");
const { getRateLimitStatus } = require("../middleware/aiRateLimit.middleware");

/**
 * AI Controller
 * Handles AI-powered hotel recommendation requests.
 */

// ─── GET /recommendations ─────────────────────────────────────────────────────

exports.getRecommendations = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    let result;

    // Route to follow-up handler when conversation history is present
    if (conversationHistory && conversationHistory.length > 0) {
      const lastRecommendations =
        conversationHistory[conversationHistory.length - 1].recommendations;
      result = await aiService.handleFollowUp(message, lastRecommendations);
    } else {
      result = await aiService.getRecommendations(message);
    }

    // Forward the usingAI flag so the client knows which path was taken
    res.json({
      ...result,
      usingAI: result.usingAI ?? false,
    });
  } catch (error) {
    console.error("[AI Controller] getRecommendations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recommendations",
      error: error.message,
    });
  }
};

// ─── GET /health ──────────────────────────────────────────────────────────────

exports.healthCheck = async (req, res) => {
  // Resolve the requesting IP the same way the rate-limit middleware does
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const serviceStatus = aiService.getStatus();
  const rateLimitStatus = getRateLimitStatus(ip);

  res.json({
    success: true,
    message: "AI service is running",
    service: serviceStatus,
    rateLimit: rateLimitStatus,
  });
};

// ─── GET /rate-limit-status ───────────────────────────────────────────────────

exports.getRateLimitStatus = (req, res) => {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const status = getRateLimitStatus(ip);
  const serviceStatus = aiService.getStatus();

  res.json({
    success: true,
    ip,
    ...status,
    // Gemini circuit-breaker state
    backingOff: serviceStatus.backingOff,
    backoffUntil: serviceStatus.backoffUntil,
    backoffReason: serviceStatus.backoffReason,
  });
};
