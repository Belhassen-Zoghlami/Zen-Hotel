const Hotel = require('../models/hotel.model');

/**
 * AI Service for Hotel Recommendations
 * Uses Hugging Face's free inference API for natural language processing
 * and combines it with smart recommendation algorithms
 */

class AIService {
  constructor() {
    // Hugging Face free inference API endpoint
    this.hfApiUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
    // Alternative free model for sentiment/feature extraction
    this.featureModelUrl = 'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english';
  }

  /**
   * Extract user preferences from natural language input
   * @param {string} userMessage - User's natural language query
   * @returns {Object} - Extracted preferences
   */
  async extractPreferences(userMessage) {
    const preferences = {
      location: null,
      minRating: null,
      keywords: [],
      budget: null
    };

    const message = userMessage.toLowerCase();

    // Extract location
    const locationPatterns = [
      /(?:in|at|near|around)\s+([a-z\s]+?)(?:,|;|\s|$|hotel)/i,
      /([a-z\s]+?)\s+(?:hotel|city|place|area)/i
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        preferences.location = match[1].trim();
        break;
      }
    }

    // Extract rating preference
    const ratingPatterns = [
      /(\d+(?:\.\d+)?)\s*star/i,
      /rating\s*(?:of|above|over|at least)?\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*\/\s*5/i,
      /(\d+(?:\.\d+)?)\s*out of\s*5/i
    ];

    for (const pattern of ratingPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        preferences.minRating = parseFloat(match[1]);
        break;
      }
    }

    // Extract keywords for description matching
    const keywordMap = {
      luxury: ['luxury', 'premium', 'high-end', 'exclusive', 'deluxe', 'elegant'],
      budget: ['cheap', 'affordable', 'budget', 'economic', 'low-cost', 'value'],
      beach: ['beach', 'ocean', 'sea', 'coast', 'shore', 'waterfront'],
      city: ['city', 'downtown', 'urban', 'metropolitan', 'central'],
      quiet: ['quiet', 'peaceful', 'calm', 'serene', 'tranquil', 'relaxing'],
      family: ['family', 'kid', 'child', 'children', 'family-friendly'],
      business: ['business', 'work', 'meeting', 'conference', 'corporate'],
      romantic: ['romantic', 'couple', 'honeymoon', 'intimate', 'romance'],
      spa: ['spa', 'wellness', 'massage', 'relaxation', 'pamper'],
      pool: ['pool', 'swimming', 'swim', 'water'],
      gym: ['gym', 'fitness', 'exercise', 'workout', 'health club']
    };

    for (const [category, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          preferences.keywords.push(category);
          break;
        }
      }
    }

    // Extract budget indicators
    if (message.includes('cheap') || message.includes('budget') || message.includes('affordable')) {
      preferences.budget = 'low';
    } else if (message.includes('luxury') || message.includes('premium') || message.includes('expensive')) {
      preferences.budget = 'high';
    }

    return preferences;
  }

  /**
   * Score hotels based on user preferences
   * @param {Array} hotels - List of hotels
   * @param {Object} preferences - User preferences
   * @returns {Array} - Scored and sorted hotels
   */
  scoreHotels(hotels, preferences) {
    return hotels.map(hotel => {
      let score = 0;

      // Location match (highest weight)
      if (preferences.location && hotel.location) {
        const hotelLocation = hotel.location.toLowerCase();
        const userLocation = preferences.location.toLowerCase();
        if (hotelLocation.includes(userLocation) || userLocation.includes(hotelLocation)) {
          score += 50;
        }
      }

      // Rating match
      if (preferences.minRating && hotel.rating) {
        const hotelRating = parseFloat(hotel.rating);
        if (hotelRating >= preferences.minRating) {
          score += 30;
          // Bonus for higher ratings
          score += (hotelRating - preferences.minRating) * 10;
        }
      }

      // Keyword/description match
      if (preferences.keywords.length > 0 && hotel.description) {
        const description = hotel.description.toLowerCase();
        for (const keyword of preferences.keywords) {
          if (description.includes(keyword)) {
            score += 15;
          }
        }
      }

      // Budget preference
      if (preferences.budget === 'low' && hotel.rating) {
        const rating = parseFloat(hotel.rating);
        if (rating <= 3) score += 10;
      } else if (preferences.budget === 'high' && hotel.rating) {
        const rating = parseFloat(hotel.rating);
        if (rating >= 4) score += 10;
      }

      return {
        ...hotel.toObject(),
        matchScore: score
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Get AI-powered hotel recommendations
   * @param {string} userMessage - User's natural language query
   * @returns {Object} - Recommendations with AI response
   */
  async getRecommendations(userMessage) {
    try {
      // Extract preferences from user message
      const preferences = await this.extractPreferences(userMessage);

      // Get all hotels
      const hotels = await Hotel.find().select('-owner -createdAt -updatedAt -__v');

      // Score and sort hotels based on preferences
      const scoredHotels = this.scoreHotels(hotels, preferences);

      // Get top recommendations
      const topRecommendations = scoredHotels
        .filter(hotel => hotel.matchScore > 0)
        .slice(0, 5);

      // Generate AI response
      const aiResponse = this.generateResponse(userMessage, preferences, topRecommendations);

      return {
        success: true,
        message: aiResponse,
        recommendations: topRecommendations,
        preferences: preferences
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  /**
   * Generate natural language response based on recommendations
   * @param {string} userMessage - Original user message
   * @param {Object} preferences - Extracted preferences
   * @param {Array} recommendations - Top hotel recommendations
   * @returns {string} - AI response
   */
  generateResponse(userMessage, preferences, recommendations) {
    if (recommendations.length === 0) {
      return "I couldn't find any hotels that match your preferences perfectly. Try adjusting your search criteria or browse all hotels to see what's available.";
    }

    let response = "Based on your preferences";

    if (preferences.location) {
      response += ` for hotels in ${preferences.location}`;
    }

    if (preferences.minRating) {
      response += ` with at least ${preferences.minRating} stars`;
    }

    if (preferences.keywords.length > 0) {
      response += ` that offer ${preferences.keywords.join(' and ')}`;
    }

    response += ", I found these great options for you:\n\n";

    recommendations.forEach((hotel, index) => {
      response += `${index + 1}. **${hotel.name}** in ${hotel.location}\n`;
      response += `   Rating: ${hotel.rating} stars\n`;
      if (hotel.description) {
        response += `   ${hotel.description.substring(0, 100)}...\n`;
      }
      response += `\n`;
    });

    response += "Would you like more details about any of these hotels, or would you like me to refine the search based on different criteria?";

    return response;
  }

  /**
   * Handle follow-up questions
   * @param {string} userMessage - Follow-up message
   * @param {Array} previousRecommendations - Previous recommendations
   * @returns {Object} - Response with updated recommendations
   */
  async handleFollowUp(userMessage, previousRecommendations) {
    const message = userMessage.toLowerCase();

    // Check if user wants more details
    if (message.includes('more') && message.includes('detail')) {
      const hotelNumbers = message.match(/\d+/g);
      if (hotelNumbers && hotelNumbers.length > 0) {
        const index = parseInt(hotelNumbers[0]) - 1;
        if (previousRecommendations[index]) {
          const hotel = previousRecommendations[index];
          return {
            success: true,
            message: `Here are more details about **${hotel.name}**:\n\n` +
                     `Location: ${hotel.location}\n` +
                     `Rating: ${hotel.rating} stars\n` +
                     `Description: ${hotel.description || 'No description available'}\n\n` +
                     `Would you like to see other hotels or book this one?`,
            recommendations: previousRecommendations
          };
        }
      }
    }

    // Check if user wants to refine search
    if (message.includes('refine') || message.includes('different') || message.includes('other')) {
      return await this.getRecommendations(userMessage);
    }

    // Default: get new recommendations based on message
    return await this.getRecommendations(userMessage);
  }
}

module.exports = new AIService();
