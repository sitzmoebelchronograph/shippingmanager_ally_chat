/**
 * @fileoverview Messenger Chat List Caching
 *
 * Provides shared caching for /messenger/get-chats API responses.
 * Reduces duplicate API calls from messenger refresh, hijacking refresh, and badge updates.
 *
 * @module server/websocket/messenger-cache
 */

const { apiCall } = require('../utils/api');
const logger = require('../utils/logger');

/**
 * Shared cache for /messenger/get-chats API responses.
 * Reduces duplicate API calls from messenger refresh, hijacking refresh, and badge updates.
 * @type {{ data: Array|null, timestamp: number }}
 */
let messengerChatsCache = {
  data: null,
  timestamp: 0
};

/**
 * Cache TTL for /messenger/get-chats in milliseconds (15 seconds).
 * @constant {number}
 */
const MESSENGER_CHATS_CACHE_TTL = 15000;

/**
 * Fetches messenger chats with shared caching to reduce duplicate API calls.
 *
 * Multiple systems need chat data (messenger refresh, hijacking refresh, badge updates).
 * Without caching, each would make separate API calls to /messenger/get-chats.
 * This function implements a 15-second cache that all systems share.
 *
 * Cache Logic:
 * - If cache is fresh (< 15 seconds old), return cached data immediately
 * - If cache is stale (>= 15 seconds old), fetch fresh data and update cache
 * - Cache is shared across all callers (messenger, hijacking, badges)
 *
 * Impact:
 * - Reduces ~3 duplicate API calls per 15-second window to just 1 call
 * - Saves ~12 API calls/minute during typical usage
 * - All callers get synchronized data from same fetch
 *
 * @async
 * @function getCachedMessengerChats
 * @returns {Promise<Array>} Array of chat objects from /messenger/get-chats
 *
 * @example
 * // Called by messenger refresh, hijacking refresh, and badge updates
 * const chats = await getCachedMessengerChats();
 * const unreadCount = chats.filter(c => c.new).length;
 */
async function getCachedMessengerChats() {
  const now = Date.now();
  const cacheAge = now - messengerChatsCache.timestamp;

  // Return cached data if still fresh
  if (messengerChatsCache.data && cacheAge < MESSENGER_CHATS_CACHE_TTL) {
    logger.debug(`[Messenger Cache] Using cached data (age: ${Math.round(cacheAge / 1000)}s)`);
    return messengerChatsCache.data;
  }

  // Cache stale or empty - fetch fresh data
  try {
    const data = await apiCall('/messenger/get-chats', 'POST', {});
    const chats = data?.data;

    // Update cache
    messengerChatsCache = {
      data: chats,
      timestamp: now
    };

    logger.debug(`[Messenger Cache] Fetched fresh data (${chats.length} chats)`);

    return chats;
  } catch (error) {
    logger.error('[Messenger Cache] Error fetching chats:', error.message);

    // Return stale cache if available (better than nothing)
    if (messengerChatsCache.data) {
      logger.warn('[Messenger Cache] Returning stale cache due to error');
      return messengerChatsCache.data;
    }

    return [];
  }
}

module.exports = {
  getCachedMessengerChats,
  MESSENGER_CHATS_CACHE_TTL
};
