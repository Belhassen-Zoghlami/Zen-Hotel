"use strict";

const Hotel = require("../models/hotel.model");
const Room = require("../models/room.model");

// ─── Zen API client (OpenAI-compatible) ──────────────────────────────────────
// Endpoint : https://opencode.ai/zen/v1/chat/completions
// Auth     : Bearer token via ZEN_API_KEY env var
// Model    : configured via ZEN_MODEL env var (default: opencode/gpt-5.3-codex)
// Fallback : Fully rule-based logic when Zen is unavailable or the call fails

const ZEN_BASE_URL = "https://opencode.ai/zen/v1";

class AIService {
  constructor() {
    this.apiKey = null;
    this.zenModel = null;
    this._backoffUntil = 0;
    this._backoffReason = null;
    this._geocodeCache = new Map();
    this._initZen();
  }

  // ─── Zen initialisation ──────────────────────────────────────────────────

  _initZen() {
    const apiKey = process.env.ZEN_API_KEY;
    if (!apiKey) {
      console.info(
        "[AIService] ZEN_API_KEY not set — running in rule-based fallback mode.",
      );
      return;
    }
    this.apiKey = apiKey;
    this.zenModel = process.env.ZEN_MODEL || "gpt-5.3-codex";
    console.info(
      `[AIService] Zen initialised with model: ${this.zenModel}`,
    );
  }

  _isZenAvailable() {
    if (this.apiKey === null || this.zenModel === null) return false;
    if (Date.now() < this._backoffUntil) return false;
    return true;
  }

  _clearBackoff() {
    this._backoffUntil = 0;
    this._backoffReason = null;
    this._consecutiveRateLimits = 0;
  }

  async _fetchWithTimeout(url, options, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async _callZen(messages) {
    const response = await this._fetchWithTimeout(
      `${ZEN_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.zenModel,
          messages,
          max_tokens: 2000,
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = null;
      }
      const err = new Error(
        parsed?.error?.message || `Zen API error: ${response.status}`,
      );
      err.status = response.status;
      err.body = parsed;
      throw err;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  _isRateLimitError(err) {
    return (
      err.status === 429 ||
      err.message?.includes("429") ||
      err.message?.includes("rate limit") ||
      err.message?.includes("quota")
    );
  }

  _handleZenError(err) {
    let retryAfterSec = 65;
    this._consecutiveRateLimits = (this._consecutiveRateLimits || 0) + 1;

    if (err.status === 429) {
      if (err.body?.error?.details?.retryAfter) {
        retryAfterSec = parseInt(err.body.error.details.retryAfter, 10) + 5;
      }
      const msg = (err.body?.error?.message ?? "").toLowerCase();
      if (msg.includes("day") || msg.includes("daily")) {
        this._backoffUntil = 0;
        this._backoffReason = null;
        this._consecutiveRateLimits = 0;
        return 0;
      }
    }

    // Exponential backoff: double for each consecutive hit
    const multiplier = Math.min(this._consecutiveRateLimits, 5);
    retryAfterSec = retryAfterSec * Math.pow(2, multiplier - 1);

    this._backoffUntil = Date.now() + retryAfterSec * 1000;
    this._backoffReason = "minute";

    console.warn(
      `[AIService] Zen API rate-limited (attempt ${this._consecutiveRateLimits}). ` +
      `Circuit breaker open for ${retryAfterSec}s (until ${new Date(this._backoffUntil).toISOString()}).`,
    );

    return retryAfterSec;
  }

  // ─── Public status ────────────────────────────────────────────────────────

  getStatus() {
    const backingOff = this.apiKey !== null && Date.now() < this._backoffUntil;
    return {
      aiEnabled: this._isZenAvailable(),
      model: this.zenModel ?? "rule-based-fallback",
      backingOff,
      backoffUntil: backingOff
        ? new Date(this._backoffUntil).toISOString()
        : null,
      backoffReason: backingOff ? this._backoffReason : null,
    };
  }

  // ─── Geospatial helpers ───────────────────────────────────────────────────

  /**
   * Haversine distance between two lat/lng points in kilometres.
   */
  _haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Geocode a place name via OpenStreetMap's free Nominatim API.
   * Returns { lat, lng, displayName } or null.
   */
  async _geocodeLocation(locationName) {
    const cacheKey = locationName.toLowerCase().trim();
    const cached = this._geocodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 86400000) return cached.result;
    if (cached) this._geocodeCache.delete(cacheKey);

    const headers = { "User-Agent": "ZenHotels/1.0" };
    const parseResult = (data) =>
      data?.[0]
        ? {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
          }
        : null;

    const tryFetch = async (params) => {
      const res = await this._fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers },
        5000,
      );
      if (!res.ok) return null;
      return parseResult(await res.json());
    };

    try {
      let result =
        (await tryFetch(
          new URLSearchParams({
            city: locationName,
            country: "Tunisia",
            format: "json",
            limit: "1",
          }),
        )) ||
        (await tryFetch(
          new URLSearchParams({
            q: `${locationName}, Tunisia`,
            format: "json",
            limit: "1",
          }),
        )) ||
        (await tryFetch(
          new URLSearchParams({ q: locationName, format: "json", limit: "1" }),
        ));

      if (result) {
        this._geocodeCache.set(cacheKey, { result, timestamp: Date.now() });
      } else {
        console.warn(`[AIService] Geocoding failed for: "${locationName}"`);
      }
      return result;
    } catch (err) {
      console.error(`[AIService] Geocoding error for "${locationName}":`, err.message);
      return null;
    }
  }

  /**
   * Sort hotels by real-world distance to a target coordinate.
   * Returns hotels annotated with `distanceKm` and `matchScore` based on proximity.
   */
  _findClosestByCoordinates(targetLat, targetLng, hotels, limit = 2) {
    const withDistance = hotels
      .filter((h) => h.coordinates?.latitude != null && h.coordinates?.longitude != null)
      .map((h) => {
        const dist = this._haversineKm(
          targetLat,
          targetLng,
          h.coordinates.latitude,
          h.coordinates.longitude,
        );
        return { ...h.toObject(), distanceKm: Math.round(dist * 100) / 100 };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (withDistance.length > 0) {
      const maxDist = withDistance[withDistance.length - 1].distanceKm;
      const minDist = withDistance[0].distanceKm;
      const range = maxDist - minDist || 1;
      withDistance.forEach((h) => {
        h.matchScore = Math.round(100 - ((h.distanceKm - minDist) / range) * 90);
      });
    }

    return withDistance.slice(0, limit);
  }

  // ─── Room data enrichment ─────────────────────────────────────────────────

  /**
   * For each hotel, fetch its cheapest available room, total room count,
   * and available room count. Attaches `cheapestPrice`, `roomCount`,
   * `availableRooms` to each hotel object.
   */
  async _enrichWithRoomData(hotels) {
    if (hotels.length === 0) return hotels;

    const hotelIds = hotels.map((h) => h._id);

    // Aggregate: total rooms, available rooms, and minimum price per hotel
    const roomStats = await Room.aggregate([
      { $match: { hotel: { $in: hotelIds } } },
      {
        $group: {
          _id: "$hotel",
          totalRooms: { $sum: 1 },
          availableRooms: {
            $sum: { $cond: ["$isAvailable", 1, 0] },
          },
          cheapestPrice: { $min: "$pricePerNight" },
        },
      },
    ]);

    const statsMap = {};
    for (const stat of roomStats) {
      statsMap[String(stat._id)] = {
        totalRooms: stat.totalRooms,
        availableRooms: stat.availableRooms,
        cheapestPrice: stat.cheapestPrice
          ? parseFloat(stat.cheapestPrice.$numberDecimal ?? stat.cheapestPrice.toString())
          : null,
      };
    }

    return hotels.map((h) => {
      const id = String(h._id);
      const stats = statsMap[id];
      return {
        ...h,
        roomCount: stats?.totalRooms ?? 0,
        availableRooms: stats?.availableRooms ?? 0,
        cheapestPrice: stats?.cheapestPrice ?? null,
      };
    });
  }

  // ─── Preference extraction (rule-based) ───────────────────────────────────

  async extractPreferences(userMessage) {
    const preferences = {
      location: null,
      coordinates: null,
      proximityIntent: false,
      minRating: null,
      maxRating: null,
      keywords: [],
      budget: null,
      priceRange: { min: null, max: null },
      negativeKeywords: [],
      amenities: [],
    };

    const message = userMessage.toLowerCase();

    // ── Proximity intent ────────────────────────────────────────────────────
    preferences.proximityIntent =
      message.includes("closest") ||
      message.includes("nearest") ||
      message.includes("closer") ||
      message.includes("close to") ||
      /which.*(?:hotel|one).*closest/.test(message);

    // ── Location ─────────────────────────────────────────────────────────────
    const locationPatterns = [
      /(?:in|at|near|around|close to|closest to|by)\s+([a-z\s]{2,}?)(?:\s+(?:hotel|with|that|and|has|have|is|was|for|but|or|of|the|a|an|in|at|near|by|show|looking|want|need|would|please|tell|find|give|recommend|suggest|search|browse|filter|sort|list)|,|;|$)/i,
      /([a-z]{3,}(?:\s+[a-z]{3,})*)\s+(?:hotel|city|place|area|location)/i,
      /looking\s+(?:for|in)\s+([a-z\s]{2,}?)(?:\s+(?:hotel|with|that|and|has|have|is|was|for|but|or|of|the|a|an|in|at|near|by|show|looking|want|need|would|please|tell|find|give|recommend|suggest|search|browse|filter|sort|list)|,|;|$)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let location = match[1].trim();
        while (/^(a|an|the|near|in|at|i|we|they|he|she|it|you|want|need|would|looking|find|show|give|tell|like|prefer|have|has|with|for)\s+/i.test(location)) {
          location = location.replace(/^(a|an|the|near|in|at|i|we|they|he|she|it|you|want|need|would|looking|find|show|give|tell|like|prefer|have|has|with|for)\s+/i, "");
        }
        if (location.length > 2 && !/^(want|need|would|looking|find|show|give|tell|like|prefer|have|has|hotel|pool|beach|spa|gym|wifi|budget|luxury|cheap)$/i.test(location)) {
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

  // ─── Scoring (string-based) ───────────────────────────────────────────────

  scoreHotels(hotels, preferences) {
    return hotels
      .map((hotel) => {
        let score = 0;

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

        if (preferences.keywords.length > 0 && hotel.description) {
          const description = hotel.description.toLowerCase();
          for (const keyword of preferences.keywords) {
            if (description.includes(keyword)) {
              score += 15;
              if (description.includes(keyword + " ")) score += 5;
            }
          }
        }

        if (preferences.negativeKeywords.length > 0 && hotel.description) {
          const description = hotel.description.toLowerCase();
          for (const negativeKeyword of preferences.negativeKeywords) {
            if (description.includes(negativeKeyword)) score -= 30;
          }
        }

        if (preferences.budget === "low" && hotel.rating) {
          if (parseFloat(hotel.rating) <= 3) score += 10;
        } else if (preferences.budget === "high" && hotel.rating) {
          if (parseFloat(hotel.rating) >= 4) score += 10;
        }

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

  // ─── Response generators ──────────────────────────────────────────────────

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

    const isProximity = recommendations.some((h) => h.distanceKm != null);

    let response;
    if (isProximity) {
      const closest = recommendations[0];
      response = `The closest hotel to your location is **${closest.name}** in ${closest.location}`;
      if (closest.distanceKm != null) {
        response += `, approximately **${closest.distanceKm} km** away`;
      }
      response += `.\n\nHere are the closest options:\n\n`;
    } else {
      response = "Based on your preferences";

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
    }

    recommendations.forEach((hotel, index) => {
      response += `${index + 1}. **${hotel.name}** in ${hotel.location}\n`;
      response += `   Rating: ${hotel.rating}`;
      if (hotel.distanceKm != null) {
        response += ` | ${hotel.distanceKm} km away`;
      } else if (hotel.matchScore) {
        response += ` | Match: ${Math.round(hotel.matchScore)}%`;
      }
      if (hotel.cheapestPrice != null) {
        response += ` | From $${hotel.cheapestPrice}/night`;
      }
      if (hotel.availableRooms > 0) {
        response += ` | ${hotel.availableRooms} room${hotel.availableRooms !== 1 ? "s" : ""} available`;
      }
      response += "\n";
      if (hotel.description)
        response += `   ${hotel.description.substring(0, 120)}...\n`;
      response += "\n";
    });

    response +=
      "Would you like more details about any of these hotels, or would you like me to refine the search with different criteria? You can also ask about specific amenities or price ranges.";
    return response;
  }

  // ─── Zen prompt builders ──────────────────────────────────────────────────

  _buildRecommendationMessages(userMessage, topHotels) {
    const hotelList = topHotels
      .map((h, i) => {
        const dist =
          h.distanceKm != null
            ? ` | ${h.distanceKm} km from your location`
            : "";
        const price =
          h.cheapestPrice != null
            ? ` | From $${h.cheapestPrice}/night`
            : "";
        const avail =
          h.availableRooms != null
            ? ` | ${h.availableRooms} rooms available`
            : "";
        const score =
          h.matchScore != null
            ? ` (match score: ${Math.round(h.matchScore)})`
            : "";
        const desc = h.description
          ? h.description.substring(0, 200)
          : "No description available.";
        return [
          `${i + 1}. ${h.name} — ${h.location}${dist}${price}${avail}`,
          `   Rating   : ${h.rating ?? "N/A"} / 5${score}`,
          `   Overview : ${desc}`,
        ].join("\n");
      })
      .join("\n\n");

    const systemPrompt = `You are a warm, knowledgeable hotel concierge assistant.

A guest has asked: "${userMessage}"

Based on our database search, here are the top ${topHotels.length} matching hotels:

${hotelList}

Please write a friendly, helpful recommendation response in 2-4 paragraphs:
- Address the guest's specific request directly in the opening sentence.
- If the guest asked about the closest hotel, lead with the nearest option and mention the distance.
- Reference the hotels by name and explain clearly why each one fits what the guest is looking for.
- Highlight standout features (location, rating, special amenities, pricing) relevant to their request.
- Close with an invitation to ask follow-up questions or request more details about any specific hotel.
- Keep the tone conversational, helpful, and enthusiastic — but concise.
- Do NOT invent information that isn't in the hotel data above.`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];
  }

  _buildFollowUpMessages(previousRecommendations, followUpMessage) {
    const hotelList = previousRecommendations
      .slice(0, 5)
      .map((h, i) => {
        const dist =
          h.distanceKm != null
            ? ` | ${h.distanceKm} km from your location`
            : "";
        const price =
          h.cheapestPrice != null
            ? ` | From $${h.cheapestPrice}/night`
            : "";
        const score =
          h.matchScore != null
            ? ` (match score: ${Math.round(h.matchScore)})`
            : "";
        const desc = h.description
          ? h.description.substring(0, 150)
          : "No description available.";
        return `${i + 1}. ${h.name} — ${h.location} | Rating: ${h.rating ?? "N/A"}/5${dist}${price}${score}\n   ${desc}`;
      })
      .join("\n\n");

    const systemPrompt =
      `You are a warm, knowledgeable hotel concierge assistant.\n` +
      `The guest was previously shown these hotel recommendations:\n\n${hotelList}\n\n` +
      `Answer any follow-up questions about these hotels helpfully and conversationally. ` +
      `Reference hotels by name. If the question requires a completely new search, say so politely.`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: followUpMessage },
    ];
  }

  // ─── Main public methods ──────────────────────────────────────────────────

  async getRecommendations(userMessage) {
    try {
      const preferences = await this.extractPreferences(userMessage);

      const hotels = await Hotel.find().select(
        "-owner -createdAt -updatedAt -__v",
      ).limit(100);

      let topRecommendations = [];
      let geocoded = null;

      // Try coordinate-based proximity search when a location is mentioned
      if (preferences.location || preferences.proximityIntent) {
        const searchTerm = preferences.location || userMessage;
        geocoded = await this._geocodeLocation(searchTerm);
        if (geocoded) {
          preferences.coordinates = { lat: geocoded.lat, lng: geocoded.lng };
          topRecommendations = this._findClosestByCoordinates(
            geocoded.lat,
            geocoded.lng,
            hotels,
          );
        }
      }

      // Fall back to string-based scoring when geocoding failed or no location
      if (topRecommendations.length === 0) {
        const scoredHotels = this.scoreHotels(hotels, preferences);
        topRecommendations = scoredHotels
          .filter((hotel) => hotel.matchScore > 0)
          .slice(0, 2);
      }

      // Enrich with room data (prices, availability)
      topRecommendations = await this._enrichWithRoomData(topRecommendations);

      // Prefer hotels with available rooms, but keep at least one result
      const withRooms = topRecommendations.filter((h) => h.availableRooms > 0);
      if (withRooms.length > 0) {
        topRecommendations = withRooms;
      }

      // Step 3: try Zen
      if (this._isZenAvailable()) {
        try {
          const messages = this._buildRecommendationMessages(
            userMessage,
            topRecommendations,
          );
          const text = await this._callZen(messages);
          this._clearBackoff();

          return {
            success: true,
            message: text,
            recommendations: topRecommendations,
            preferences,
            usingAI: true,
            geocodedLocation: geocoded
              ? { lat: geocoded.lat, lng: geocoded.lng, name: geocoded.displayName }
              : null,
          };
        } catch (zenErr) {
          if (this._isRateLimitError(zenErr)) {
            this._handleZenError(zenErr);
          } else {
            console.error(
              "[AIService] Zen API call failed, using fallback:",
              zenErr.message,
            );
          }
        }
      }

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
        geocodedLocation: geocoded
          ? { lat: geocoded.lat, lng: geocoded.lng, name: geocoded.displayName }
          : null,
      };
    } catch (error) {
      console.error("[AIService] getRecommendations error:", error);
      throw new Error("Failed to generate recommendations");
    }
  }

  async handleFollowUp(userMessage, previousRecommendations) {
    if (
      this._isZenAvailable() &&
      previousRecommendations &&
      previousRecommendations.length > 0
    ) {
      try {
        const messages = this._buildFollowUpMessages(
          previousRecommendations,
          userMessage,
        );
        const text = await this._callZen(messages);

        return {
          success: true,
          message: text,
          recommendations: previousRecommendations,
          usingAI: true,
        };
      } catch (zenErr) {
        if (this._isRateLimitError(zenErr)) {
          this._handleZenError(zenErr);
        } else {
          console.error(
            "[AIService] Zen chat failed, using fallback:",
            zenErr.message,
          );
        }
      }
    }

    const message = userMessage.toLowerCase();

    if (message.includes("more") && message.includes("detail")) {
      const hotelNumbers = message.match(/\d+/g);
      if (hotelNumbers && hotelNumbers.length > 0) {
        const index = parseInt(hotelNumbers[0]) - 1;
        if (previousRecommendations && previousRecommendations[index]) {
          const hotel = previousRecommendations[index];
          let detail =
            `Here are more details about **${hotel.name}**:\n\n` +
            `Location: ${hotel.location}\n` +
            `Rating: ${hotel.rating} stars\n`;
          if (hotel.distanceKm != null) {
            detail += `Distance: ${hotel.distanceKm} km from your location\n`;
          } else {
            detail += `Match Score: ${Math.round(hotel.matchScore)}%\n`;
          }
          detail +=
            `Description: ${hotel.description || "No description available"}\n\n` +
            "Would you like to see other hotels, book this one, or refine your search?";
          return {
            success: true,
            message: detail,
            recommendations: previousRecommendations,
            usingAI: false,
          };
        }
      }
    }

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

    if (
      message.includes("compare") ||
      message.includes("difference") ||
      message.includes("better")
    ) {
      if (previousRecommendations && previousRecommendations.length >= 2) {
        let comparison = "Here's a comparison of the top hotels:\n\n";
        previousRecommendations.slice(0, 3).forEach((hotel, index) => {
          comparison += `${index + 1}. **${hotel.name}**\n`;
          comparison += `   Rating: ${hotel.rating} stars`;
          if (hotel.distanceKm != null) {
            comparison += ` | ${hotel.distanceKm} km away`;
          } else {
            comparison += ` | Match: ${Math.round(hotel.matchScore)}%`;
          }
          comparison += `\n   Location: ${hotel.location}\n\n`;
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

    if (message.includes("top") || message.includes("best")) {
      const topHotels = (previousRecommendations || []).slice(0, 3);
      let response = "Here are the top recommendations:\n\n";
      topHotels.forEach((hotel, index) => {
        response += `${index + 1}. **${hotel.name}** — ${hotel.rating} stars`;
        if (hotel.distanceKm != null) {
          response += ` (${hotel.distanceKm} km away)`;
        } else {
          response += ` (${Math.round(hotel.matchScore)}% match)`;
        }
        response += "\n";
      });
      response += "\nWould you like more details about any of these?";
      return {
        success: true,
        message: response,
        recommendations: previousRecommendations,
        usingAI: false,
      };
    }

    return await this.getRecommendations(userMessage);
  }
}

module.exports = new AIService();
