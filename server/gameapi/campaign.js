/**
 * @fileoverview Marketing Campaign API Client Module
 *
 * This module handles all marketing campaign-related API calls including:
 * - Fetching available and active campaigns
 * - Activating campaigns by ID
 * - Campaign cache management
 *
 * @requires ../utils/api - API helper functions
 * @requires ../utils/logger - Logging utility
 * @requires ../cache - Campaign caching system
 * @module server/gameapi/campaign
 */

const { apiCall } = require('../utils/api');
const logger = require('../utils/logger');
const cache = require('../cache');

/**
 * Fetches available marketing campaigns and active campaign status.
 * Uses cache to avoid duplicate API calls (campaigns change rarely).
 * Used by auto-campaign-renewal feature.
 *
 * @returns {Promise<Object>} Object with available and active campaigns arrays
 */
async function fetchCampaigns() {
  try {
    // Check cache first
    const cached = cache.getCampaignCache();
    if (cached) {
      const available = cached.data.marketing_campaigns;
      const active = cached.data.active_campaigns;

      logger.debug(`[GameAPI] Campaigns from cache - Active: ${active.length}, Available: ${available.length}`);

      return {
        available: available,
        active: active
      };
    }

    // Cache miss - fetch from API
    const data = await apiCall('/marketing-campaign/get-marketing', 'POST', {});

    // Store in cache
    cache.setCampaignCache(data);

    const available = data.data.marketing_campaigns;
    const active = data.data.active_campaigns;

    logger.debug(`[GameAPI] Fetched campaigns from API - Active: ${active.length}, Available: ${available.length}`);

    return {
      available: available,
      active: active
    };
  } catch (error) {
    logger.error('[GameAPI] Error fetching campaigns:', error.message);
    return {
      available: [],
      active: []
    };
  }
}

/**
 * Activates a marketing campaign by ID.
 * Used by auto-campaign-renewal feature.
 *
 * @param {number} campaignId - Campaign ID to activate
 * @returns {Promise<Object>} Activation result with success status
 */
async function activateCampaign(campaignId) {
  await apiCall('/marketing-campaign/activate-marketing-campaign', 'POST', {
    campaign_id: campaignId
  });

  // Invalidate campaign cache after activation
  cache.invalidateCampaignCache();

  return {
    success: true,
    campaignId: campaignId
  };
}

module.exports = {
  fetchCampaigns,
  activateCampaign
};