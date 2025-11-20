/**
 * @fileoverview Alliance API Client Module
 *
 * This module handles alliance-related API calls including:
 * - Fetching user's current contribution points
 * - Alliance member statistics
 *
 * @requires ../utils/api - API helper functions
 * @requires ../utils/logger - Logging utility
 * @module server/gameapi/alliance
 */

const { apiCall, getAllianceId } = require('../utils/api');
const logger = require('../utils/logger');

/**
 * Fetches the current user's alliance contribution points
 *
 * Returns the user's current season contribution score from the alliance members API.
 * Used for tracking contribution gains from vessel departures.
 *
 * @async
 * @param {number} userId - User ID to fetch contribution for
 * @returns {Promise<number|null>} Current contribution points or null if user is not in an alliance
 *
 * @example
 * const contribution = await fetchUserContribution(3451210);
 * // Returns: 16033 (current season contribution)
 */
async function fetchUserContribution(userId) {
  try {
    // Get user's alliance ID
    const allianceId = getAllianceId();

    if (!allianceId) {
      logger.debug('[Alliance API] User is not in an alliance, cannot fetch contribution');
      return null;
    }

    // Fetch alliance members with current season stats
    const data = await apiCall('/alliance/get-alliance-members', 'POST', {
      alliance_id: allianceId,
      lifetime_stats: false,
      last_24h_stats: false,
      last_season_stats: false,
      include_last_season_top_contributors: false
    });

    // Find the user in the members list
    const member = data.data.members.find(m => m.user_id === userId);

    if (!member) {
      logger.warn(`[Alliance API] User ${userId} not found in alliance ${allianceId} members`);
      return null;
    }

    logger.debug(`[Alliance API] User ${userId} current contribution: ${member.contribution}`);
    return member.contribution;

  } catch (error) {
    logger.error('[Alliance API] Failed to fetch user contribution:', error.message);
    return null;
  }
}

module.exports = {
  fetchUserContribution
};
