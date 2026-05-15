/**
 * AI Rate Limit Middleware
 *
 * Three-layer guard that keeps our usage safely inside Gemini's free tier:
 *
 *  Gemini free-tier hard limits (gemini-2.0-flash):
 *    • 15 requests / minute  (global across all users)
 *    • 1 500 requests / day  (global across all users)
 *
 *  Our own limits (applied before hitting Gemini):
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  Per-IP daily     │  30 req / IP / day   (midnight UTC)     │
 *  │  Per-IP minute    │   3 req / IP / min   (sliding window)   │
 *  │  Global daily     │ 1 400 req / day      (midnight UTC)     │
 *  │  Global minute    │  12 req / min        (sliding window)   │
 *  └──────────────────────────────────────────────────────────────┘
 *
 *  The global-minute limit (12) is set at 80 % of Gemini's 15 RPM ceiling,
 *  leaving headroom so we never actually hit Gemini's own rate limiter.
 *
 *  When Gemini itself reports RESOURCE_EXHAUSTED the circuit breaker in
 *  ai.service.js opens and callers fall through to rule-based responses
 *  without consuming a user's quota slot.
 *
 * Uses a plain in-memory store — no external dependencies needed.
 */

"use strict";

// ─── Constants ───────────────────────────────────────────────────────────────

const IP_DAILY_LIMIT = 30; // per IP per day
const IP_MINUTE_LIMIT = 3; // per IP per minute  (sliding)
const GLOBAL_DAILY_LIMIT = 1400; // whole server per day
const GLOBAL_MINUTE_LIMIT = 12; // whole server per minute (80 % of Gemini's 15 RPM)

const MS_PER_MINUTE = 60 * 1000;

// ─── In-memory store ─────────────────────────────────────────────────────────

/**
 * ipStore – keyed by IP address
 * {
 *   dailyCount : number,    // requests today
 *   dailyDate  : string,    // YYYY-MM-DD (UTC)
 *   minuteLog  : number[],  // timestamps (ms) of requests in last 60 s
 * }
 */
const ipStore = new Map();

/**
 * globalStore – counters shared across all IPs
 * {
 *   dailyCount  : number,
 *   dailyDate   : string,
 *   minuteLog   : number[],
 * }
 */
const globalStore = {
  dailyCount: 0,
  dailyDate: _todayUTC(),
  minuteLog: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns today's date as a "YYYY-MM-DD" string in UTC. */
function _todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the Unix timestamp (ms) for the next midnight UTC. */
function _nextMidnightUTC() {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
}

/** Retrieves (lazily initialises / daily-resets) the record for an IP. */
function _getIpRecord(ip) {
  const today = _todayUTC();
  if (!ipStore.has(ip)) {
    const record = { dailyCount: 0, dailyDate: today, minuteLog: [] };
    ipStore.set(ip, record);
    return record;
  }
  const record = ipStore.get(ip);
  if (record.dailyDate !== today) {
    record.dailyCount = 0;
    record.dailyDate = today;
    record.minuteLog = [];
  }
  return record;
}

/** Removes timestamps older than 60 s from a sliding-window log array. */
function _pruneLog(log) {
  const cutoff = Date.now() - MS_PER_MINUTE;
  while (log.length > 0 && log[0] < cutoff) log.shift();
}

/** Resets the global daily counters when the UTC date rolls over. */
function _checkGlobalDailyReset() {
  const today = _todayUTC();
  if (globalStore.dailyDate !== today) {
    globalStore.dailyCount = 0;
    globalStore.dailyDate = today;
    // minuteLog is sliding-window — pruning handles it separately
  }
}

// ─── Status helper (exported) ─────────────────────────────────────────────────

/**
 * Returns the current rate-limit state for a given IP without incrementing
 * any counters. Used by the health-check and status endpoints.
 *
 * @param {string} ip
 * @returns {{
 *   ipDailyUsed      : number,
 *   ipDailyLimit     : number,
 *   ipMinuteUsed     : number,
 *   ipMinuteLimit    : number,
 *   globalDailyUsed  : number,
 *   globalDailyLimit : number,
 *   globalMinuteUsed : number,
 *   globalMinuteLimit: number,
 *   resetTime        : string,   // ISO-8601 of next midnight UTC
 * }}
 */
function getRateLimitStatus(ip) {
  _checkGlobalDailyReset();
  _pruneLog(globalStore.minuteLog);

  const record = _getIpRecord(ip);
  _pruneLog(record.minuteLog);

  return {
    ipDailyUsed: record.dailyCount,
    ipDailyLimit: IP_DAILY_LIMIT,
    ipMinuteUsed: record.minuteLog.length,
    ipMinuteLimit: IP_MINUTE_LIMIT,
    globalDailyUsed: globalStore.dailyCount,
    globalDailyLimit: GLOBAL_DAILY_LIMIT,
    globalMinuteUsed: globalStore.minuteLog.length,
    globalMinuteLimit: GLOBAL_MINUTE_LIMIT,
    resetTime: new Date(_nextMidnightUTC()).toISOString(),
  };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Express middleware that enforces AI rate limits.
 * Apply this before the route handler on AI-consuming endpoints.
 *
 * Returns HTTP 429 + JSON when any limit is exceeded.
 * On pass-through, increments all counters and sets X-RateLimit-* headers.
 */
function aiRateLimitMiddleware(req, res, next) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();

  // ── Refresh windows ───────────────────────────────────────────────────────
  _checkGlobalDailyReset();
  _pruneLog(globalStore.minuteLog);

  const record = _getIpRecord(ip);
  _pruneLog(record.minuteLog);

  // ── Evaluate limits (cheapest / most-likely-to-fire first) ────────────────

  // 1. Global minute cap  — protects Gemini's 15 RPM ceiling
  if (globalStore.minuteLog.length >= GLOBAL_MINUTE_LIMIT) {
    const oldest = globalStore.minuteLog[0];
    const retryAfter = Math.max(
      Math.ceil((oldest + MS_PER_MINUTE - now) / 1000),
      1,
    );
    return res.status(429).json({
      success: false,
      message: `The AI service is currently busy. Please wait ${retryAfter} second(s) and try again.`,
      retryAfter,
      limitType: "global_minute",
    });
  }

  // 2. Per-IP minute cap  — prevents a single user from monopolising
  if (record.minuteLog.length >= IP_MINUTE_LIMIT) {
    const oldest = record.minuteLog[0];
    const retryAfter = Math.max(
      Math.ceil((oldest + MS_PER_MINUTE - now) / 1000),
      1,
    );
    return res.status(429).json({
      success: false,
      message: `Too many requests. You can send at most ${IP_MINUTE_LIMIT} AI requests per minute. Please wait ${retryAfter} second(s).`,
      retryAfter,
      limitType: "ip_minute",
    });
  }

  // 3. Global daily cap
  if (globalStore.dailyCount >= GLOBAL_DAILY_LIMIT) {
    const retryAfter = Math.ceil((_nextMidnightUTC() - now) / 1000);
    return res.status(429).json({
      success: false,
      message:
        "The AI service has reached its daily request limit. Please try again tomorrow.",
      retryAfter,
      limitType: "global_daily",
    });
  }

  // 4. Per-IP daily cap
  if (record.dailyCount >= IP_DAILY_LIMIT) {
    const retryAfter = Math.ceil((_nextMidnightUTC() - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `You have reached your daily limit of ${IP_DAILY_LIMIT} AI requests. Your quota resets at midnight UTC.`,
      retryAfter,
      limitType: "ip_daily",
    });
  }

  // ── All checks passed — increment and continue ────────────────────────────
  record.dailyCount += 1;
  record.minuteLog.push(now);
  globalStore.dailyCount += 1;
  globalStore.minuteLog.push(now);

  res.set({
    "X-RateLimit-IP-Daily-Limit": IP_DAILY_LIMIT,
    "X-RateLimit-IP-Daily-Remaining": IP_DAILY_LIMIT - record.dailyCount,
    "X-RateLimit-IP-Minute-Limit": IP_MINUTE_LIMIT,
    "X-RateLimit-IP-Minute-Remaining":
      IP_MINUTE_LIMIT - record.minuteLog.length,
    "X-RateLimit-Global-Daily-Remaining":
      GLOBAL_DAILY_LIMIT - globalStore.dailyCount,
    "X-RateLimit-Global-Minute-Remaining":
      GLOBAL_MINUTE_LIMIT - globalStore.minuteLog.length,
  });

  next();
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = aiRateLimitMiddleware;
module.exports.getRateLimitStatus = getRateLimitStatus;
