const aiService = require('../services/ai.service');

/**
 * AI Controller
 * Handles AI-powered hotel recommendation requests
 */

exports.getRecommendations = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message is required' 
      });
    }

    let result;

    // Check if this is a follow-up question
    if (conversationHistory && conversationHistory.length > 0) {
      const lastRecommendations = conversationHistory[conversationHistory.length - 1].recommendations;
      result = await aiService.handleFollowUp(message, lastRecommendations);
    } else {
      result = await aiService.getRecommendations(message);
    }

    res.json(result);
  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get recommendations',
      error: error.message 
    });
  }
};

exports.healthCheck = async (req, res) => {
  res.json({ 
    success: true, 
    message: 'AI service is running' 
  });
};
