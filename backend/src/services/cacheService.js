/**
 * cacheService.js
 * In-memory LRU cache for university knowledge base answers.
 * Safe: never caches personalized, private, or error responses.
 * TTL: 30 minutes. Max 300 entries.
 */

const CACHE_TTL_MS = 30 * 60 * 1000;  // 30 minutes
const MAX_ENTRIES = 300;

// Simple Map-based LRU: evict oldest entry when full
class LRUCache {
  constructor(maxSize, ttlMs) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.store = new Map(); // key -> { value, expiresAt }
  }

  _isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this._isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    // Refresh position (LRU behavior)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    // Evict expired entries first
    for (const [k, v] of this.store) {
      if (this._isExpired(v)) this.store.delete(k);
    }
    // Evict oldest if still full
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
  get size() { return this.store.size; }
}

const cache = new LRUCache(MAX_ENTRIES, CACHE_TTL_MS);

/**
 * Normalize a question into a stable cache key.
 * Strips punctuation, lowercases, collapses whitespace.
 * Works for English, Kurdish, and Arabic.
 */
function normalizeCacheKey(question) {
  return question
    .toLowerCase()
    .replace(/[?؟!.,،;:\-–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determine if a question is cacheable (impersonal, university fact).
 * Never cache: greetings, "my" questions, personalized queries.
 */
function isCacheable(message) {
  const lower = message.toLowerCase();
  const personalTriggers = [
    'my ', 'mine', 'i am', "i'm", 'our ', 'me ',
    'حسابی', 'نمره‌ام', 'درسم',  // Kurdish personal
    'حسابي', 'درجتي',              // Arabic personal
  ];
  if (personalTriggers.some(t => lower.includes(t))) return false;
  if (lower.length < 10) return false; // Too short = greeting/unclear
  return true;
}

/**
 * Get a cached response for a question.
 * Returns null on cache miss.
 */
function getCached(message) {
  if (!isCacheable(message)) return null;
  const key = normalizeCacheKey(message);
  return cache.get(key);
}

/**
 * Store a response in cache.
 * Only stores complete (non-streaming) responses.
 */
function setCached(message, value) {
  if (!isCacheable(message)) return;
  if (!value || !value.reply || value.reply.length < 20) return;
  const key = normalizeCacheKey(message);
  cache.set(key, value);
}

/**
 * Invalidate all cached entries (call when knowledge base is re-synced).
 */
function invalidateAll() {
  cache.clear();
  console.log('[Cache] All entries invalidated.');
}

function getStats() {
  return { size: cache.size, maxSize: MAX_ENTRIES, ttlMinutes: CACHE_TTL_MS / 60000 };
}

module.exports = { getCached, setCached, invalidateAll, getStats, isCacheable };
