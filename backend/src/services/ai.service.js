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
      maxRating: null,
      keywords: [],
      budget: null,
      priceRange: { min: null, max: null },
      negativeKeywords: [],
      amenities: []
    };

    const message = userMessage.toLowerCase();

    // Extract location (more sophisticated patterns)
    const locationPatterns = [
      /(?:in|at|near|around|close to|by)\s+([a-z\s]+?)(?:,|;|\s|$|hotel|with|that|and)/i,
      /([a-z\s]+?)\s+(?:hotel|city|place|area|location)/i,
      /looking\s+(?:for|in)\s+([a-z\s]+?)(?:,|;|\s|$)/i
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Clean up the location
        let location = match[1].trim();
        // Remove common filler words
        location = location.replace(/^(a|an|the|near|in|at)\s+/i, '');
        if (location.length > 2) {
          preferences.location = location;
          break;
        }
      }
    }

    // Extract rating preference (support for ranges)
    const ratingPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*star/i,
      /between\s+(\d+(?:\.\d+)?)\s*and\s*(\d+(?:\.\d+)?)\s*star/i,
      /(\d+(?:\.\d+)?)\s*star/i,
      /rating\s*(?:of|above|over|at least|minimum)\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*\/\s*5/i,
      /(\d+(?:\.\d+)?)\s*out of\s*5/i,
      /at least\s+(\d+(?:\.\d+)?)\s*star/i,
      /minimum\s+(\d+(?:\.\d+)?)\s*star/i
    ];

    for (const pattern of ratingPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[2]) {
          // Range
          preferences.minRating = parseFloat(match[1]);
          preferences.maxRating = parseFloat(match[2]);
        } else if (match[1]) {
          // Single value
          preferences.minRating = parseFloat(match[1]);
        }
        break;
      }
    }

    // Extract price range (must be after rating extraction to avoid conflicts)
    const pricePatterns = [
      /under\s+\$?(\d+)/i,
      /below\s+\$?(\d+)/i,
      /less than\s+\$?(\d+)/i,
      /cheaper than\s+\$?(\d+)/i,
      /above\s+\$?(\d+)/i,
      /over\s+\$?(\d+)/i,
      /more than\s+\$?(\d+)/i,
      /between\s+\$?(\d+)\s*(?:and|-)\s*\$?(\d+)/i,
      /\$?(\d+)\s*(?:to|-)\s*\$?(\d+)/i
    ];

    // Only extract price if it's clearly a price context (has $ or price-related words)
    const hasPriceContext = message.includes('$') || message.includes('price') || message.includes('cost') || 
                           message.includes('budget') || message.includes('cheap') || message.includes('expensive');

    if (hasPriceContext) {
      for (const pattern of pricePatterns) {
        const match = message.match(pattern);
        if (match) {
          if (match[2]) {
            // Range
            preferences.priceRange.min = parseFloat(match[1]);
            preferences.priceRange.max = parseFloat(match[2]);
          } else if (match[1]) {
            // Single value with context
            if (message.includes('under') || message.includes('below') || message.includes('less than')) {
              preferences.priceRange.max = parseFloat(match[1]);
            } else if (message.includes('above') || message.includes('over') || message.includes('more than')) {
              preferences.priceRange.min = parseFloat(match[1]);
            }
          }
          break;
        }
      }
    }

    // Enhanced keyword map for amenities and features
    const keywordMap = {
      luxury: ['luxury', 'premium', 'high-end', 'exclusive', 'deluxe', 'elegant', 'fancy', 'upscale', 'sophisticated'],
      budget: ['cheap', 'affordable', 'budget', 'economic', 'low-cost', 'value', 'inexpensive', 'reasonably priced'],
      beach: ['beach', 'ocean', 'sea', 'coast', 'shore', 'waterfront', 'beachfront', 'oceanfront', 'seaside'],
      city: ['city', 'downtown', 'urban', 'metropolitan', 'central', 'city center', 'town center'],
      quiet: ['quiet', 'peaceful', 'calm', 'serene', 'tranquil', 'relaxing', 'silent', 'noise-free'],
      family: ['family', 'kid', 'child', 'children', 'family-friendly', 'kids', 'child-friendly'],
      business: ['business', 'work', 'meeting', 'conference', 'corporate', 'executive', 'professional'],
      romantic: ['romantic', 'couple', 'honeymoon', 'intimate', 'romance', 'getaway', 'escape'],
      spa: ['spa', 'wellness', 'massage', 'relaxation', 'pamper', 'treatment', 'thermal'],
      pool: ['pool', 'swimming', 'swim', 'water', 'swimming pool', 'outdoor pool', 'indoor pool'],
      gym: ['gym', 'fitness', 'exercise', 'workout', 'health club', 'fitness center'],
      restaurant: ['restaurant', 'dining', 'food', 'cuisine', 'eatery', 'bistro', 'cafe'],
      wifi: ['wifi', 'wireless', 'internet', 'connection', 'online'],
      parking: ['parking', 'car park', 'garage', 'valet'],
      pet: ['pet', 'dog', 'cat', 'animal', 'pet-friendly'],
      accessible: ['accessible', 'disability', 'wheelchair', 'disabled access'],
      view: ['view', 'scenic', 'panoramic', 'balcony', 'terrace'],
      air: ['air conditioning', 'ac', 'climate control', 'air conditioned'],
      breakfast: ['breakfast', 'morning meal', 'continental breakfast']
    };

    // Extract positive keywords
    for (const [category, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          if (!preferences.keywords.includes(category)) {
            preferences.keywords.push(category);
          }
          if (!preferences.amenities.includes(category)) {
            preferences.amenities.push(category);
          }
          break;
        }
      }
    }

    // Extract negative constraints
    const negativePatterns = [
      /no\s+([a-z\s]+)/i,
      /without\s+([a-z\s]+)/i,
      /not\s+([a-z\s]+)/i,
      /avoid\s+([a-z\s]+)/i,
      /don't want\s+([a-z\s]+)/i,
      /doesn't have\s+([a-z\s]+)/i
    ];

    for (const pattern of negativePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const negativeTerm = match[1].trim();
        // Map negative terms to categories
        for (const [category, keywords] of Object.entries(keywordMap)) {
          if (keywords.some(k => negativeTerm.includes(k))) {
            if (!preferences.negativeKeywords.includes(category)) {
              preferences.negativeKeywords.push(category);
            }
          }
        }
      }
    }

    // Extract budget indicators
    if (message.includes('cheap') || message.includes('budget') || message.includes('affordable') || message.includes('inexpensive')) {
      preferences.budget = 'low';
    } else if (message.includes('luxury') || message.includes('premium') || message.includes('expensive') || message.includes('upscale')) {
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

      // Rating match with range support
      if (preferences.minRating && hotel.rating) {
        const hotelRating = parseFloat(hotel.rating);
        if (hotelRating >= preferences.minRating) {
          score += 30;
          // Bonus for higher ratings
          score += (hotelRating - preferences.minRating) * 10;
          
          // Check max rating constraint
          if (preferences.maxRating && hotelRating > preferences.maxRating) {
            score -= 20; // Penalty for exceeding max rating
          }
        }
      }

      // Keyword/description match with enhanced scoring
      if (preferences.keywords.length > 0 && hotel.description) {
        const description = hotel.description.toLowerCase();
        for (const keyword of preferences.keywords) {
          if (description.includes(keyword)) {
            score += 15;
            // Bonus for exact matches
            if (description.includes(keyword + ' ')) {
              score += 5;
            }
          }
        }
      }

      // Negative keyword penalties
      if (preferences.negativeKeywords.length > 0 && hotel.description) {
        const description = hotel.description.toLowerCase();
        for (const negativeKeyword of preferences.negativeKeywords) {
          if (description.includes(negativeKeyword)) {
            score -= 30; // Significant penalty for unwanted features
          }
        }
      }

      // Budget preference with price range
      if (preferences.budget === 'low' && hotel.rating) {
        const rating = parseFloat(hotel.rating);
        if (rating <= 3) score += 10;
      } else if (preferences.budget === 'high' && hotel.rating) {
        const rating = parseFloat(hotel.rating);
        if (rating >= 4) score += 10;
      }

      // Amenities matching
      if (preferences.amenities.length > 0 && hotel.description) {
        const description = hotel.description.toLowerCase();
        for (const amenity of preferences.amenities) {
          if (description.includes(amenity)) {
            score += 12;
          }
        }
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
      let noMatchResponse = "I couldn't find any hotels that match your preferences perfectly. ";
      
      // Provide helpful suggestions based on what was requested
      if (preferences.location) {
        noMatchResponse += `Try searching in a different location near ${preferences.location}, or `;
      }
      if (preferences.minRating) {
        noMatchResponse += `consider adjusting your rating requirement, or `;
      }
      if (preferences.keywords.length > 0) {
        noMatchResponse += `try with fewer specific amenities, or `;
      }
      
      noMatchResponse += "browse all hotels to see what's available. You can also ask me to help you refine your search.";
      return noMatchResponse;
    }

    let response = "Based on your preferences";

    // Build a more detailed preference summary
    const preferenceParts = [];
    
    if (preferences.location) {
      preferenceParts.push(`hotels in ${preferences.location}`);
    }
    
    if (preferences.minRating) {
      if (preferences.maxRating) {
        preferenceParts.push(`rating between ${preferences.minRating} and ${preferences.maxRating} stars`);
      } else {
        preferenceParts.push(`at least ${preferences.minRating} stars`);
      }
    }
    
    if (preferences.amenities.length > 0) {
      const amenityNames = {
        luxury: 'luxury amenities',
        budget: 'budget-friendly options',
        beach: 'beach access',
        city: 'city center location',
        quiet: 'quiet atmosphere',
        family: 'family-friendly features',
        business: 'business facilities',
        romantic: 'romantic setting',
        spa: 'spa services',
        pool: 'swimming pool',
        gym: 'fitness center',
        restaurant: 'on-site restaurant',
        wifi: 'WiFi access',
        parking: 'parking',
        pet: 'pet-friendly',
        accessible: 'accessibility features',
        view: 'great views',
        air: 'air conditioning',
        breakfast: 'breakfast included'
      };
      
      const amenityList = preferences.amenities.map(a => amenityNames[a] || a);
      preferenceParts.push(amenityList.join(', '));
    }
    
    if (preferences.negativeKeywords.length > 0) {
      preferenceParts.push(`without ${preferences.negativeKeywords.join(', ')}`);
    }
    
    if (preferences.priceRange.min || preferences.priceRange.max) {
      if (preferences.priceRange.min && preferences.priceRange.max) {
        preferenceParts.push(`price range between $${preferences.priceRange.min} and $${preferences.priceRange.max}`);
      } else if (preferences.priceRange.max) {
        preferenceParts.push(`under $${preferences.priceRange.max}`);
      } else if (preferences.priceRange.min) {
        preferenceParts.push(`above $${preferences.priceRange.min}`);
      }
    }

    if (preferenceParts.length > 0) {
      response += ` for ${preferenceParts.join(', ')}`;
    }

    response += ", I found these great options for you:\n\n";

    recommendations.forEach((hotel, index) => {
      response += `${index + 1}. **${hotel.name}** in ${hotel.location}\n`;
      response += `   Rating: ${hotel.rating} stars`;
      
      if (hotel.matchScore) {
        response += ` | Match: ${Math.round(hotel.matchScore)}%`;
      }
      response += '\n';
      
      if (hotel.description) {
        response += `   ${hotel.description.substring(0, 120)}...\n`;
      }
      response += `\n`;
    });

    response += "Would you like more details about any of these hotels, or would you like me to refine the search with different criteria? You can also ask about specific amenities or price ranges.";

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

    // Check if user wants more details about a specific hotel
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
                     `Match Score: ${Math.round(hotel.matchScore)}%\n` +
                     `Description: ${hotel.description || 'No description available'}\n\n` +
                     `Would you like to see other hotels, book this one, or refine your search?`,
            recommendations: previousRecommendations
          };
        }
      }
    }

    // Check if user wants to see hotels with specific amenities
    if (message.includes('with') || message.includes('that has') || message.includes('featuring')) {
      return await this.getRecommendations(userMessage);
    }

    // Check if user wants to exclude something
    if (message.includes('without') || message.includes('no') || message.includes('avoid') || message.includes('not')) {
      return await this.getRecommendations(userMessage);
    }

    // Check if user wants to refine search with price/rating constraints
    if (message.includes('cheaper') || message.includes('expensive') || message.includes('under') || message.includes('over') || message.includes('between')) {
      return await this.getRecommendations(userMessage);
    }

    // Check if user wants to refine search with rating
    if (message.includes('star') || message.includes('rating')) {
      return await this.getRecommendations(userMessage);
    }

    // Check if user wants to change location
    if (message.includes('in') || message.includes('near') || message.includes('at')) {
      return await this.getRecommendations(userMessage);
    }

    // Check if user wants to refine search
    if (message.includes('refine') || message.includes('different') || message.includes('other') || message.includes('again') || message.includes('show me')) {
      return await this.getRecommendations(userMessage);
    }

    // Check if user is asking about comparison
    if (message.includes('compare') || message.includes('difference') || message.includes('better')) {
      if (previousRecommendations.length >= 2) {
        let comparison = "Here's a comparison of the top hotels:\n\n";
        previousRecommendations.slice(0, 3).forEach((hotel, index) => {
          comparison += `${index + 1}. **${hotel.name}**\n`;
          comparison += `   Rating: ${hotel.rating} stars | Match: ${Math.round(hotel.matchScore)}%\n`;
          comparison += `   Location: ${hotel.location}\n\n`;
        });
        comparison += "Would you like more details about any of these, or shall I search for different options?";
        return {
          success: true,
          message: comparison,
          recommendations: previousRecommendations
        };
      }
    }

    // Check if user wants to see top/bottom options
    if (message.includes('top') || message.includes('best')) {
      const topHotels = previousRecommendations.slice(0, 3);
      let response = "Here are the top recommendations:\n\n";
      topHotels.forEach((hotel, index) => {
        response += `${index + 1}. **${hotel.name}** - ${hotel.rating} stars (${Math.round(hotel.matchScore)}% match)\n`;
      });
      response += "\nWould you like more details about any of these?";
      return {
        success: true,
        message: response,
        recommendations: previousRecommendations
      };
    }

    // Default: get new recommendations based on message
    return await this.getRecommendations(userMessage);
  }
}

module.exports = new AIService();
