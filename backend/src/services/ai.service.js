"use strict";

const Hotel = require("../models/hotel.model");

// ─── Gemini SDK (optional — only used when GEMINI_API_KEY is present) ─────────
// Uses the new unified @google/genai SDK (supports Gemini 2.0+)
let GoogleGenAI;
try {
  ({ GoogleGenAI } = require("@google/genai"));
} catch (_) {
  // Package not yet installed; AI features will use the rule-based fallback
  GoogleGenAI = null;
}

/**
 * AI Service for Hotel Recommendations
 *
 * Primary path  : Google Gemini 2.0 Flash (free tier) via GEMINI_API_KEY
 *                 Uses the new @google/genai SDK.
 * Fallback path : Fully rule-based logic (extractPreferences + scoreHotels
 *                 + generateResponse) — used when the key is absent or any
 *                 Gemini call throws.
 *
 * Model: gemini-2.0-flash  — free-tier stable, 1 500 req/day on AI Studio
 */
class AIService {
  constructor() {
    this.ai = null; // GoogleGenAI client instance
    this.geminiModel = null; // model name string
    this._backoffUntil = 0; // epoch ms — Gemini blocked until this time
    this._backoffReason = null; // 'minute' | 'daily' | null
    this._initGemini();
  }

  // ─── Gemini initialisation ────────────────────────────────────────────────

  _initGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.info(
        "[AIService] GEMINI_API_KEY not set — running in rule-based fallback mode.",
      );
      return;
    }
    if (!GoogleGenAI) {
      console.warn(
        "[AIService] @google/genai package not installed — running in fallback mode.",
      );
      return;
    }
    try {
      this.ai = new GoogleGenAI({ apiKey });
      this.geminiModel = "gemini-2.0-flash"; // free-tier stable model
      console.info(
        `[AIService] Gemini initialised with model: ${this.geminiModel}`,
      );
    } catch (err) {
      console.error(
        "[AIService] Failed to initialise Gemini client:",
        err.message,
      );
      this.ai = null;
      this.geminiModel = null;
    }
  }

  /** True when Gemini is configured and the circuit breaker is not open. */
  get _geminiEnabled() {
    if (this.ai === null || this.geminiModel === null) return false;
    if (Date.now() < this._backoffUntil) return false;
    // Reset backoff state once the window has passed
    this._backoffUntil = 0;
    this._backoffReason = null;
    return true;
  }

  /**
   * Parse a Google RESOURCE_EXHAUSTED error and engage the circuit breaker.
   * Returns the retryAfter value in seconds (or a sensible default).
   */
  _handleGeminiQuotaError(err) {
    let retryAfterSec = 60; // safe default
    let reason = "minute";

    try {
      // The error message is a JSON string when it comes from @google/genai
      const body =
        typeof err.message === "string" && err.message.startsWith("{")
          ? JSON.parse(err.message)
          : (err.errorDetails ?? null);

      if (body?.error) {
        const details = body.error.details ?? [];

        // Extract retryDelay from RetryInfo detail
        for (const d of details) {
          if (d["@type"]?.includes("RetryInfo") && d.retryDelay) {
            const parsed = parseInt(d.retryDelay, 10);
            if (!isNaN(parsed)) retryAfterSec = parsed + 5; // add 5 s buffer
            break;
          }
        }

        // Determine if this is a daily exhaustion
        const msg = body.error.message ?? "";
        const violations =
          details.find((d) => d["@type"]?.includes("QuotaFailure"))
            ?.violations ?? [];
        const isDaily =
          violations.some((v) => v.quotaId?.toLowerCase().includes("perday")) ||
          msg.toLowerCase().includes("per day");

        if (isDaily) {
          // Daily quota blown — block for the rest of the day
          const now = new Date();
          // Gemini resets at midnight Pacific (UTC-7 or UTC-8); use UTC midnight as close proxy
          const midnightUTC = new Date(
            Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate() + 1,
            ),
          );
          retryAfterSec = Math.ceil(
            (midnightUTC.getTime() - Date.now()) / 1000,
          );
          reason = "daily";
        }
      }
    } catch (_) {
      /* parsing failed — use defaults */
    }

    this._backoffUntil = Date.now() + retryAfterSec * 1000;
    this._backoffReason = reason;

    console.warn(
      `[AIService] Gemini quota exhausted (${reason}). Circuit breaker open for ${retryAfterSec}s ` +
        `(until ${new Date(this._backoffUntil).toISOString()}).`,
    );

    return retryAfterSec;
  }

  // ─── Public status ────────────────────────────────────────────────────────

  /**
   * Returns service metadata used by the health-check endpoint.
   * @returns {{ aiEnabled: boolean, model: string }}
   */
  getStatus() {
    const backingOff = this.ai !== null && Date.now() < this._backoffUntil;
    return {
      aiEnabled: this._geminiEnabled,
      model: this.geminiModel ?? "rule-based-fallback",
      backingOff,
      backoffUntil: backingOff
        ? new Date(this._backoffUntil).toISOString()
        : null,
      backoffReason: backingOff ? this._backoffReason : null,
    };
  }

  // ─── Preference extraction (rule-based, kept 100 % intact) ───────────────

  /**
   * Extract user preferences from natural language input.
   * @param {string} userMessage
   * @returns {Promise<Object>}
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
      amenities: [],
    };

    const message = userMessage.toLowerCase();

    // ── Location ─────────────────────────────────────────────────────────────
    const locationPatterns = [
      /(?:in|at|near|around|close to|by)\s+([a-z\s]+?)(?:,|;|\s|$|hotel|with|that|and)/i,
      /([a-z\s]+?)\s+(?:hotel|city|place|area|location)/i,
      /looking\s+(?:for|in)\s+([a-z\s]+?)(?:,|;|\s|$)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let location = match[1].trim();
        location = location.replace(/^(a|an|the|near|in|at)\s+/i, "");
        if (location.length > 2) {
          preferences.location = location;
          break;
        }
      }
    }

    // ── Rating ────────────────────────────────────────────────────────────────
    const ratingPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*star/i,
      /between\s+(\d+(?:\.\d+)?)\s*and\s*(\d+(?:\.\d+)?)\s*star/i,
      /(\d+(?:\.\d+)?)\s*star/i,
      /rating\s*(?:of|above|over|at least|minimum)\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*\/\s*5/i,
      /(\d+(?:\.\d+)?)\s*out of\s*5/i,
      /at least\s+(\d+(?:\.\d+)?)\s*star/i,
      /minimum\s+(\d+(?:\.\d+)?)\s*star/i,
    ];

    for (const pattern of ratingPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[2]) {
          preferences.minRating = parseFloat(match[1]);
          preferences.maxRating = parseFloat(match[2]);
        } else if (match[1]) {
          preferences.minRating = parseFloat(match[1]);
        }
        break;
      }
    }

    // ── Price range ───────────────────────────────────────────────────────────
    const pricePatterns = [
      /under\s+\$?(\d+)/i,
      /below\s+\$?(\d+)/i,
      /less than\s+\$?(\d+)/i,
      /cheaper than\s+\$?(\d+)/i,
      /above\s+\$?(\d+)/i,
      /over\s+\$?(\d+)/i,
      /more than\s+\$?(\d+)/i,
      /between\s+\$?(\d+)\s*(?:and|-)\s*\$?(\d+)/i,
      /\$?(\d+)\s*(?:to|-)\s*\$?(\d+)/i,
    ];

    const hasPriceContext =
      message.includes("$") ||
      message.includes("price") ||
      message.includes("cost") ||
      message.includes("budget") ||
      message.includes("cheap") ||
      message.includes("expensive");

    if (hasPriceContext) {
      for (const pattern of pricePatterns) {
        const match = message.match(pattern);
        if (match) {
          if (match[2]) {
            preferences.priceRange.min = parseFloat(match[1]);
            preferences.priceRange.max = parseFloat(match[2]);
          } else if (match[1]) {
            if (
              message.includes("under") ||
              message.includes("below") ||
              message.includes("less than")
            ) {
              preferences.priceRange.max = parseFloat(match[1]);
            } else if (
              message.includes("above") ||
              message.includes("over") ||
              message.includes("more than")
            ) {
              preferences.priceRange.min = parseFloat(match[1]);
            }
          }
          break;
        }
      }
    }

    // ── Keywords / amenities ─────────────────────────────────────────────────
    const keywordMap = {
      luxury: [
        "luxury",
        "premium",
        "high-end",
        "exclusive",
        "deluxe",
        "elegant",
        "fancy",
        "upscale",
        "sophisticated",
      ],
      budget: [
        "cheap",
        "affordable",
        "budget",
        "economic",
        "low-cost",
        "value",
        "inexpensive",
        "reasonably priced",
      ],
      beach: [
        "beach",
        "ocean",
        "sea",
        "coast",
        "shore",
        "waterfront",
        "beachfront",
        "oceanfront",
        "seaside",
      ],
      city: [
        "city",
        "downtown",
        "urban",
        "metropolitan",
        "central",
        "city center",
        "town center",
      ],
      quiet: [
        "quiet",
        "peaceful",
        "calm",
        "serene",
        "tranquil",
        "relaxing",
        "silent",
        "noise-free",
      ],
      family: [
        "family",
        "kid",
        "child",
        "children",
        "family-friendly",
        "kids",
        "child-friendly",
      ],
      business: [
        "business",
        "work",
        "meeting",
        "conference",
        "corporate",
        "executive",
        "professional",
      ],
      romantic: [
        "romantic",
        "couple",
        "honeymoon",
        "intimate",
        "romance",
        "getaway",
        "escape",
      ],
      spa: [
        "spa",
        "wellness",
        "massage",
        "relaxation",
        "pamper",
        "treatment",
        "thermal",
      ],
      pool: [
        "pool",
        "swimming",
        "swim",
        "water",
        "swimming pool",
        "outdoor pool",
        "indoor pool",
      ],
      gym: [
        "gym",
        "fitness",
        "exercise",
        "workout",
        "health club",
        "fitness center",
      ],
      restaurant: [
        "restaurant",
        "dining",
        "food",
        "cuisine",
        "eatery",
        "bistro",
        "cafe",
      ],
      wifi: ["wifi", "wireless", "internet", "connection", "online"],
      parking: ["parking", "car park", "garage", "valet"],
      pet: ["pet", "dog", "cat", "animal", "pet-friendly"],
      accessible: ["accessible", "disability", "wheelchair", "disabled access"],
      view: ["view", "scenic", "panoramic", "balcony", "terrace"],
      air: ["air conditioning", "ac", "climate control", "air conditioned"],
      breakfast: ["breakfast", "morning meal", "continental breakfast"],
    };

    for (const [category, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          if (!preferences.keywords.includes(category))
            preferences.keywords.push(category);
          if (!preferences.amenities.includes(category))
            preferences.amenities.push(category);
          break;
        }
      }
    }

    // ── Negative constraints ──────────────────────────────────────────────────
    const negativePatterns = [
      /no\s+([a-z\s]+)/i,
      /without\s+([a-z\s]+)/i,
      /not\s+([a-z\s]+)/i,
      /avoid\s+([a-z\s]+)/i,
      /don't want\s+([a-z\s]+)/i,
      /doesn't have\s+([a-z\s]+)/i,
    ];

    for (const pattern of negativePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const negativeTerm = match[1].trim();
        for (const [category, keywords] of Object.entries(keywordMap)) {
          if (keywords.some((k) => negativeTerm.includes(k))) {
            if (!preferences.negativeKeywords.includes(category)) {
              preferences.negativeKeywords.push(category);
            }
          }
        }
      }
    }

    // ── Budget indicator ──────────────────────────────────────────────────────
    if (
      message.includes("cheap") ||
      message.includes("budget") ||
      message.includes("affordable") ||
      message.includes("inexpensive")
    ) {
      preferences.budget = "low";
    } else if (
      message.includes("luxury") ||
      message.includes("premium") ||
      message.includes("expensive") ||
      message.includes("upscale")
    ) {
      preferences.budget = "high";
    }

    return preferences;
  }

  // ─── Scoring (rule-based, kept 100 % intact) ──────────────────────────────

  /**
   * Score and sort hotels according to extracted preferences.
   * @param {Array} hotels
   * @param {Object} preferences
   * @returns {Array}
   */
  scoreHotels(hotels, preferences) {
    return hotels
      .map((hotel) => {
        let score = 0;

        // Location match (highest weight)
        if (preferences.location && hotel.location) {
          const hotelLocation = hotel.location.toLowerCase();
          const userLocation = preferences.location.toLowerCase();
          if (
            hotelLocation.includes(userLocation) ||
            userLocation.includes(hotelLocation)
          ) {
            score += 50;
          }
        }

        // Rating match with range support
        if (preferences.minRating && hotel.rating) {
          const hotelRating = parseFloat(hotel.rating);
          if (hotelRating >= preferences.minRating) {
            score += 30;
            score += (hotelRating - preferences.minRating) * 10;
            if (preferences.maxRating && hotelRating > preferences.maxRating) {
              score -= 20;
            }
          }
        }

        // Keyword / description match
        if (preferences.keywords.length > 0 && hotel.description) {
          const description = hotel.description.toLowerCase();
          for (const keyword of preferences.keywords) {
            if (description.includes(keyword)) {
              score += 15;
              if (description.includes(keyword + " ")) score += 5;
            }
          }
        }

        // Negative keyword penalties
        if (preferences.negativeKeywords.length > 0 && hotel.description) {
          const description = hotel.description.toLowerCase();
          for (const negativeKeyword of preferences.negativeKeywords) {
            if (description.includes(negativeKeyword)) score -= 30;
          }
        }

        // Budget preference
        if (preferences.budget === "low" && hotel.rating) {
          if (parseFloat(hotel.rating) <= 3) score += 10;
        } else if (preferences.budget === "high" && hotel.rating) {
          if (parseFloat(hotel.rating) >= 4) score += 10;
        }

        // Amenities matching
        if (preferences.amenities.length > 0 && hotel.description) {
          const description = hotel.description.toLowerCase();
          for (const amenity of preferences.amenities) {
            if (description.includes(amenity)) score += 12;
          }
        }

        return { ...hotel.toObject(), matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  // ─── Rule-based response generator (kept 100 % intact) ───────────────────

  /**
   * Build a natural-language response purely from rule-based logic.
   * Used when Gemini is unavailable or fails.
   * @param {string} userMessage
   * @param {Object} preferences
   * @param {Array}  recommendations
   * @returns {string}
   */
  generateResponse(userMessage, preferences, recommendations) {
    if (recommendations.length === 0) {
      let noMatchResponse =
        "I couldn't find any hotels that match your preferences perfectly. ";
      if (preferences.location)
        noMatchResponse += `Try searching in a different location near ${preferences.location}, or `;
      if (preferences.minRating)
        noMatchResponse += `consider adjusting your rating requirement, or `;
      if (preferences.keywords.length > 0)
        noMatchResponse += `try with fewer specific amenities, or `;
      noMatchResponse +=
        "browse all hotels to see what's available. You can also ask me to help you refine your search.";
      return noMatchResponse;
    }

    let response = "Based on your preferences";

    const preferenceParts = [];
    if (preferences.location)
      preferenceParts.push(`hotels in ${preferences.location}`);

    if (preferences.minRating) {
      preferenceParts.push(
        preferences.maxRating
          ? `rating between ${preferences.minRating} and ${preferences.maxRating} stars`
          : `at least ${preferences.minRating} stars`,
      );
    }

    if (preferences.amenities.length > 0) {
      const amenityNames = {
        luxury: "luxury amenities",
        budget: "budget-friendly options",
        beach: "beach access",
        city: "city center location",
        quiet: "quiet atmosphere",
        family: "family-friendly features",
        business: "business facilities",
        romantic: "romantic setting",
        spa: "spa services",
        pool: "swimming pool",
        gym: "fitness center",
        restaurant: "on-site restaurant",
        wifi: "WiFi access",
        parking: "parking",
        pet: "pet-friendly",
        accessible: "accessibility features",
        view: "great views",
        air: "air conditioning",
        breakfast: "breakfast included",
      };
      const amenityList = preferences.amenities.map(
        (a) => amenityNames[a] || a,
      );
      preferenceParts.push(amenityList.join(", "));
    }

    if (preferences.negativeKeywords.length > 0) {
      preferenceParts.push(
        `without ${preferences.negativeKeywords.join(", ")}`,
      );
    }

    if (preferences.priceRange.min || preferences.priceRange.max) {
      if (preferences.priceRange.min && preferences.priceRange.max) {
        preferenceParts.push(
          `price range between $${preferences.priceRange.min} and $${preferences.priceRange.max}`,
        );
      } else if (preferences.priceRange.max) {
        preferenceParts.push(`under $${preferences.priceRange.max}`);
      } else if (preferences.priceRange.min) {
        preferenceParts.push(`above $${preferences.priceRange.min}`);
      }
    }

    if (preferenceParts.length > 0)
      response += ` for ${preferenceParts.join(", ")}`;
    response += ", I found these great options for you:\n\n";

    recommendations.forEach((hotel, index) => {
      response += `${index + 1}. **${hotel.name}** in ${hotel.location}\n`;
      response += `   Rating: ${hotel.rating} stars`;
      if (hotel.matchScore)
        response += ` | Match: ${Math.round(hotel.matchScore)}%`;
      response += "\n";
      if (hotel.description)
        response += `   ${hotel.description.substring(0, 120)}...\n`;
      response += "\n";
    });

    response +=
      "Would you like more details about any of these hotels, or would you like me to refine the search with different criteria? You can also ask about specific amenities or price ranges.";
    return response;
  }

  // ─── Gemini prompt builder ────────────────────────────────────────────────

  /**
   * Builds the recommendation prompt sent to Gemini.
   * @param {string} userMessage
   * @param {Array}  topHotels      – top 5 scored hotels
   * @returns {string}
   */
  _buildRecommendationPrompt(userMessage, topHotels) {
    const hotelList = topHotels
      .map((h, i) => {
        const score =
          h.matchScore != null
            ? ` (match score: ${Math.round(h.matchScore)})`
            : "";
        const desc = h.description
          ? h.description.substring(0, 200)
          : "No description available.";
        return [
          `${i + 1}. ${h.name} — ${h.location}`,
          `   Rating   : ${h.rating ?? "N/A"} / 5${score}`,
          `   Overview : ${desc}`,
        ].join("\n");
      })
      .join("\n\n");

    return `You are a warm, knowledgeable hotel concierge assistant.

A guest has asked: "${userMessage}"

Based on our database search, here are the top ${topHotels.length} matching hotels:

${hotelList}

Please write a friendly, helpful recommendation response in 2-4 paragraphs:
- Address the guest's specific request directly in the opening sentence.
- Reference the hotels by name and explain clearly why each one fits what the guest is looking for.
- Highlight standout features (location, rating, special amenities) relevant to their request.
- Close with an invitation to ask follow-up questions or request more details about any specific hotel.
- Keep the tone conversational, helpful, and enthusiastic — but concise.
- Do NOT invent information that isn't in the hotel data above.`;
  }

  /**
   * Builds the follow-up prompt sent to Gemini in chat mode.
   * @param {Array}  previousRecommendations
   * @param {string} followUpMessage
   * @returns {{ systemPrompt: string, userTurn: string }}
   */
  _buildFollowUpPrompt(previousRecommendations, followUpMessage) {
    const hotelList = previousRecommendations
      .slice(0, 5)
      .map((h, i) => {
        const score =
          h.matchScore != null
            ? ` (match score: ${Math.round(h.matchScore)})`
            : "";
        const desc = h.description
          ? h.description.substring(0, 150)
          : "No description available.";
        return `${i + 1}. ${h.name} — ${h.location} | Rating: ${h.rating ?? "N/A"}/5${score}\n   ${desc}`;
      })
      .join("\n\n");

    const systemPrompt =
      `You are a warm, knowledgeable hotel concierge assistant.\n` +
      `The guest was previously shown these hotel recommendations:\n\n${hotelList}\n\n` +
      `Answer any follow-up questions about these hotels helpfully and conversationally. ` +
      `Reference hotels by name. If the question requires a completely new search, say so politely.`;

    return { systemPrompt, userTurn: followUpMessage };
  }

  // ─── Main public methods ──────────────────────────────────────────────────

  /**
   * Get hotel recommendations for a user message.
   * Uses Gemini when available, falls back to rule-based logic otherwise.
   *
   * @param {string} userMessage
   * @returns {Promise<{
   *   success        : boolean,
   *   message        : string,
   *   recommendations: Array,
   *   preferences    : Object,
   *   usingAI        : boolean,
   * }>}
   */
  async getRecommendations(userMessage) {
    try {
      // Step 1: rule-based preference extraction
      const preferences = await this.extractPreferences(userMessage);

      // Step 2: fetch & score all hotels
      const hotels = await Hotel.find().select(
        "-owner -createdAt -updatedAt -__v",
      );
      const scoredHotels = this.scoreHotels(hotels, preferences);
      const topRecommendations = scoredHotels
        .filter((hotel) => hotel.matchScore > 0)
        .slice(0, 5);

      // Step 3: try Gemini
      if (this._geminiEnabled) {
        try {
          const prompt = this._buildRecommendationPrompt(
            userMessage,
            topRecommendations,
          );
          const result = await this.ai.models.generateContent({
            model: this.geminiModel,
            contents: prompt,
          });
          const text = result.text;
          // Successful call — clear any lingering backoff state
          this._backoffUntil = 0;
          this._backoffReason = null;

          return {
            success: true,
            message: text,
            recommendations: topRecommendations,
            preferences,
            usingAI: true,
          };
        } catch (geminiErr) {
          const isQuotaError =
            geminiErr.message?.includes("RESOURCE_EXHAUSTED") ||
            geminiErr.message?.includes("429") ||
            geminiErr.status === 429;

          if (isQuotaError) {
            this._handleGeminiQuotaError(geminiErr);
          } else {
            console.error(
              "[AIService] Gemini generateContent failed, using fallback:",
              geminiErr.message,
            );
          }
          // fall through to rule-based fallback below
        }
      }

      // Step 4: rule-based fallback
      const fallbackMessage = this.generateResponse(
        userMessage,
        preferences,
        topRecommendations,
      );
      return {
        success: true,
        message: fallbackMessage,
        recommendations: topRecommendations,
        preferences,
        usingAI: false,
      };
    } catch (error) {
      console.error("[AIService] getRecommendations error:", error);
      throw new Error("Failed to generate recommendations");
    }
  }

  /**
   * Handle a follow-up question in the context of previous recommendations.
   * Uses Gemini chat mode when available, falls back to rule-based logic.
   *
   * @param {string} userMessage
   * @param {Array}  previousRecommendations
   * @returns {Promise<Object>}
   */
  async handleFollowUp(userMessage, previousRecommendations) {
    // ── Gemini chat path ───────────────────────────────────────────────────
    if (
      this._geminiEnabled &&
      previousRecommendations &&
      previousRecommendations.length > 0
    ) {
      try {
        const { systemPrompt, userTurn } = this._buildFollowUpPrompt(
          previousRecommendations,
          userMessage,
        );

        // New SDK: pass the full conversation as a contents array
        const result = await this.ai.models.generateContent({
          model: this.geminiModel,
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            {
              role: "model",
              parts: [
                {
                  text: "Understood! I have the hotel recommendations in mind and I am ready to answer your follow-up questions.",
                },
              ],
            },
            { role: "user", parts: [{ text: userTurn }] },
          ],
        });
        const text = result.text;

        return {
          success: true,
          message: text,
          recommendations: previousRecommendations,
          usingAI: true,
        };
      } catch (geminiErr) {
        const isQuotaError =
          geminiErr.message?.includes("RESOURCE_EXHAUSTED") ||
          geminiErr.message?.includes("429") ||
          geminiErr.status === 429;

        if (isQuotaError) {
          this._handleGeminiQuotaError(geminiErr);
        } else {
          console.error(
            "[AIService] Gemini chat failed, using fallback:",
            geminiErr.message,
          );
        }
        // fall through to rule-based fallback
      }
    }

    // ── Rule-based follow-up fallback (original logic preserved) ─────────
    const message = userMessage.toLowerCase();

    // More details about a specific hotel
    if (message.includes("more") && message.includes("detail")) {
      const hotelNumbers = message.match(/\d+/g);
      if (hotelNumbers && hotelNumbers.length > 0) {
        const index = parseInt(hotelNumbers[0]) - 1;
        if (previousRecommendations && previousRecommendations[index]) {
          const hotel = previousRecommendations[index];
          return {
            success: true,
            message:
              `Here are more details about **${hotel.name}**:\n\n` +
              `Location: ${hotel.location}\n` +
              `Rating: ${hotel.rating} stars\n` +
              `Match Score: ${Math.round(hotel.matchScore)}%\n` +
              `Description: ${hotel.description || "No description available"}\n\n` +
              "Would you like to see other hotels, book this one, or refine your search?",
            recommendations: previousRecommendations,
            usingAI: false,
          };
        }
      }
    }

    // Triggers that warrant a brand-new search
    const newSearchTriggers = [
      message.includes("with") ||
        message.includes("that has") ||
        message.includes("featuring"),
      message.includes("without") ||
        message.includes("no ") ||
        message.includes("avoid") ||
        message.includes("not "),
      message.includes("cheaper") ||
        message.includes("expensive") ||
        message.includes("under") ||
        message.includes("over") ||
        message.includes("between"),
      message.includes("star") || message.includes("rating"),
      message.includes("in ") ||
        message.includes("near") ||
        message.includes("at "),
      message.includes("refine") ||
        message.includes("different") ||
        message.includes("other") ||
        message.includes("again") ||
        message.includes("show me"),
    ];

    if (newSearchTriggers.some(Boolean)) {
      return await this.getRecommendations(userMessage);
    }

    // Comparison request
    if (
      message.includes("compare") ||
      message.includes("difference") ||
      message.includes("better")
    ) {
      if (previousRecommendations && previousRecommendations.length >= 2) {
        let comparison = "Here's a comparison of the top hotels:\n\n";
        previousRecommendations.slice(0, 3).forEach((hotel, index) => {
          comparison += `${index + 1}. **${hotel.name}**\n`;
          comparison += `   Rating: ${hotel.rating} stars | Match: ${Math.round(hotel.matchScore)}%\n`;
          comparison += `   Location: ${hotel.location}\n\n`;
        });
        comparison +=
          "Would you like more details about any of these, or shall I search for different options?";
        return {
          success: true,
          message: comparison,
          recommendations: previousRecommendations,
          usingAI: false,
        };
      }
    }

    // Top / best request
    if (message.includes("top") || message.includes("best")) {
      const topHotels = (previousRecommendations || []).slice(0, 3);
      let response = "Here are the top recommendations:\n\n";
      topHotels.forEach((hotel, index) => {
        response += `${index + 1}. **${hotel.name}** — ${hotel.rating} stars (${Math.round(hotel.matchScore)}% match)\n`;
      });
      response += "\nWould you like more details about any of these?";
      return {
        success: true,
        message: response,
        recommendations: previousRecommendations,
        usingAI: false,
      };
    }

    // Default: fresh recommendation search
    return await this.getRecommendations(userMessage);
  }
}

module.exports = new AIService();
