/**
 * @fileoverview Hijacking Case Caching
 *
 * Provides shared caching for hijacking case details to reduce duplicate API calls.
 * Solved cases are cached permanently, open cases are cached for 5 minutes.
 *
 * @module server/websocket/hijacking-cache
 */

const { apiCall } = require('../utils/api');
const logger = require('../utils/logger');

/**
 * Cache for solved/paid hijacking cases to reduce API calls.
 * Cases in this set will not trigger /hijacking/get-case API calls.
 * @type {Set<number>}
 */
const solvedHijackingCases = new Set();

/**
 * Shared cache for hijacking case details.
 * Maps case_id -> { details, timestamp, isOpen }
 * Reduces duplicate /hijacking/get-case API calls.
 * @type {Map<number, {details: Object, timestamp: number, isOpen: boolean}>}
 */
const hijackingCaseDetailsCache = new Map();

/**
 * Cache TTL for hijacking case details.
 * Open cases: 5 minutes (prices can change)
 * Solved cases: Permanent (never changes)
 * @constant {number}
 */
const HIJACKING_CASE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidates the cache for a specific hijacking case.
 * Used after manual payment to force fresh data fetch.
 *
 * @param {number} caseId - Hijacking case ID to invalidate
 */
function invalidateHijackingCase(caseId) {
  if (hijackingCaseDetailsCache.has(caseId)) {
    hijackingCaseDetailsCache.delete(caseId);
    logger.debug(`[Hijacking Cache] Case ${caseId} invalidated`);
  }
}

/**
 * Fetches hijacking case details with shared caching to reduce duplicate API calls.
 *
 * Caching strategy:
 * - Solved cases: Cached permanently (never changes)
 * - Open cases: Cached for 5 minutes (prices can change)
 *
 * This eliminates duplicate /hijacking/get-case calls from:
 * - performHijackingRefresh() (60s interval)
 * - autoNegotiateHijacking() (via autopilot)
 *
 * @param {number} caseId - Hijacking case ID
 * @returns {Promise<{isOpen: boolean, details: Object, cached: boolean}|null>}
 */
async function getCachedHijackingCase(caseId) {
  try {
    const now = Date.now();

    // Check if already in cache
    if (hijackingCaseDetailsCache.has(caseId)) {
      const cached = hijackingCaseDetailsCache.get(caseId);
      const age = now - cached.timestamp;

      // Solved cases: Cache forever
      if (!cached.isOpen) {
        logger.debug(`[Hijacking Cache] Case ${caseId} (solved) from cache`);
        return { ...cached, cached: true };
      }

      // Open cases: Cache for 5 minutes
      if (age < HIJACKING_CASE_CACHE_TTL) {
        logger.debug(`[Hijacking Cache] Case ${caseId} (open) from cache (age: ${Math.round(age / 1000)}s)`);
        return { ...cached, cached: true };
      }

      // Cache expired for open case
      logger.debug(`[Hijacking Cache] Case ${caseId} cache expired (age: ${Math.round(age / 1000)}s), refreshing`);
    }

    // Fetch fresh data from API
    const caseData = await apiCall('/hijacking/get-case', 'POST', { case_id: caseId });
    const details = caseData?.data;
    if (!details) return null;

    const isOpen = details.paid_amount === null && details.status !== 'solved';

    // Store in cache
    hijackingCaseDetailsCache.set(caseId, {
      details,
      timestamp: now,
      isOpen
    });

    // Also add to solvedHijackingCases Set if solved (legacy compatibility)
    if (!isOpen) {
      solvedHijackingCases.add(caseId);
      logger.debug(`[Hijacking] Case ${caseId} solved, added to cache`);
    }

    logger.debug(`[Hijacking Cache] Case ${caseId} fetched from API (status: ${isOpen ? 'open' : 'solved'})`);

    return { isOpen, details, cached: false };
  } catch (error) {
    logger.error(`[Hijacking Cache] Error fetching case ${caseId}:`, error.message);
    return null;
  }
}

module.exports = {
  solvedHijackingCases,
  hijackingCaseDetailsCache,
  HIJACKING_CASE_CACHE_TTL,
  invalidateHijackingCase,
  getCachedHijackingCase
};
