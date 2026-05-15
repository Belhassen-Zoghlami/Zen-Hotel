/**
 * Simple in-memory cache middleware for API responses
 * Caches GET requests to improve performance
 */

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const cacheMiddleware = (duration = CACHE_DURATION) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < duration) {
      return res.json(cached.data);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function(data) {
      cache.set(key, {
        data: data,
        timestamp: Date.now()
      });
      return originalJson.call(this, data);
    };

    next();
  };
};

// Clear cache function for when data changes
const clearCache = (pattern) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

module.exports = { cacheMiddleware, clearCache };
