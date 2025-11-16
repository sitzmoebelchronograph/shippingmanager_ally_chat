/**
 * @fileoverview Marketing Campaign Management Routes
 *
 * This module provides endpoints for viewing and activating marketing campaigns.
 * Marketing campaigns provide temporary bonuses to reputation, revenue, or other game mechanics.
 *
 * Key Features:
 * - Retrieve available and active marketing campaigns
 * - Activate marketing campaigns with cost tracking
 * - Graceful error handling (returns empty arrays to prevent UI breaks)
 * - Audit logging for campaign activations
 * - Cache invalidation for fresh data after activation
 *
 * @requires express - Router and middleware
 * @requires ../../utils/api - API helper functions
 * @requires ../../gameapi - Game API interface
 * @requires ../../utils/audit-logger - Transaction logging
 * @requires ../../cache - Cache management
 * @requires ../../autopilot - For triggering data updates
 * @requires ../../utils/logger - Logging utility
 * @module server/routes/game/marketing
 */

const express = require('express');
const { apiCall, getUserId } = require('../../utils/api');
const gameapi = require('../../gameapi');
const { auditLog, CATEGORIES, SOURCES, formatCurrency } = require('../../utils/audit-logger');
const logger = require('../../utils/logger');
const autopilot = require('../../autopilot');

const router = express.Router();

/**
 * GET /api/marketing/get-campaigns
 * Retrieves available marketing campaigns and active campaign status
 *
 * Returns all available marketing campaigns that can be activated,
 * as well as currently active campaigns with their remaining duration.
 * Uses graceful error handling to prevent UI breaking.
 *
 * @route GET /api/marketing/get-campaigns
 *
 * @returns {object} Campaign data:
 *   - data.marketing_campaigns {array} - Available campaigns to activate
 *   - data.active_campaigns {array} - Currently active campaigns
 *   - user.reputation {number} - User's current reputation level
 *
 * On error, returns empty arrays instead of 500 to keep UI functional:
 *   - data.marketing_campaigns: []
 *   - data.active_campaigns: []
 *   - user.reputation: 0
 */
router.get('/get-campaigns', async (req, res) => {
  try {
    const data = await apiCall('/marketing-campaign/get-marketing', 'POST', {});
    res.json(data);
  } catch (error) {
    logger.error('Error getting marketing campaigns:', error.message, error.stack);

    // Return empty campaigns instead of error to prevent UI breaking
    res.json({
      data: {
        marketing_campaigns: [],
        active_campaigns: []
      },
      user: {
        reputation: 0
      }
    });
  }
});

/**
 * POST /api/marketing/activate-campaign
 * Activates a marketing campaign by campaign_id
 *
 * Activates the specified marketing campaign, deducting the cost from user balance.
 * Used for both manual activation and auto-renewal automation.
 *
 * @route POST /api/marketing/activate-campaign
 * @body {string} campaign_id - ID of the campaign to activate
 *
 * @returns {object} Activation result from game API
 *
 * @error 400 - Missing campaign_id
 * @error 500 - Failed to activate campaign
 *
 * Side effects:
 * - Deducts campaign cost from user balance
 * - Logs activation to audit log
 * - Invalidates campaign cache for fresh data
 * - Triggers data update to refresh UI badges
 */
router.post('/activate-campaign', express.json(), async (req, res) => {
  const { campaign_id } = req.body;

  if (!campaign_id) {
    return res.status(400).json({ error: 'Missing campaign_id' });
  }

  try {
    const data = await apiCall('/marketing-campaign/activate-marketing-campaign', 'POST', { campaign_id });

    // Log campaign activation (regardless of data.success value)
    const userId = getUserId();
    if (userId) {
      // (using audit-logger imported at top of file)
      try {
        // Fetch campaign details to get name and price
        const campaigns = await gameapi.fetchCampaigns();

        // Search in both available and active campaigns (campaign might have moved to active after activation)
        let activatedCampaign = campaigns?.available?.find(c => c.id === campaign_id);
        if (!activatedCampaign) {
          activatedCampaign = campaigns?.active?.find(c => c.id === campaign_id);
        }

        if (activatedCampaign) {
          await auditLog(
            userId,
            CATEGORIES.MARKETING,
            'Campaign Activation',
            `${activatedCampaign.name} (${activatedCampaign.option_name}) | -${formatCurrency(activatedCampaign.price)}`,
            {
              campaign_id,
              campaign_name: activatedCampaign.name,
              campaign_type: activatedCampaign.option_name,
              price: activatedCampaign.price,
              duration: activatedCampaign.duration
            },
            'SUCCESS',
            SOURCES.MANUAL
          );
        } else {
          // Campaign not found in available or active - log with minimal info
          logger.warn(`[Marketing] Campaign ${campaign_id} not found in campaigns list after activation`);
          await auditLog(
            userId,
            CATEGORIES.MARKETING,
            'Campaign Activation',
            `Campaign ID ${campaign_id} activated`,
            {
              campaign_id
            },
            'SUCCESS',
            SOURCES.MANUAL
          );
        }
      } catch (auditError) {
        logger.error('[Marketing] Audit logging failed:', auditError.message);
      }
    }

    // Clear campaign cache to force fresh data fetch
    const cache = require('../../cache');
    cache.invalidateCampaignCache();
    logger.debug('[Marketing] Campaign cache invalidated after activation');

    // Trigger data update to refresh campaign badge and header
    // (using autopilot imported at top of file)
    if (autopilot && autopilot.tryUpdateAllData) {
      try {
        await autopilot.tryUpdateAllData();
        logger.debug('[Marketing] Campaign data update triggered after activation');
      } catch (updateError) {
        logger.error('[Marketing] Failed to update campaign data:', updateError.message);
      }
    }

    res.json(data);
  } catch (error) {
    logger.error('Error activating campaign:', error);

    // Log failed activation attempt
    const userId = getUserId();
    if (userId) {
      // (using audit-logger imported at top of file)
      try {
        await auditLog(
          userId,
          CATEGORIES.MARKETING,
          'Campaign Activation',
          `Failed to activate campaign ${campaign_id}`,
          {
            campaign_id,
            error: error.message
          },
          'ERROR',
          SOURCES.MANUAL
        );
      } catch (auditError) {
        logger.error('[Marketing] Audit logging failed:', auditError.message);
      }
    }

    res.status(500).json({ error: 'Failed to activate campaign' });
  }
});

module.exports = router;