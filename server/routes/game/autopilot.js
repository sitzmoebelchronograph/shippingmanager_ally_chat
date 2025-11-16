/**
 * @fileoverview Autopilot Control Routes
 *
 * This module provides endpoints for controlling and monitoring the autopilot system.
 * The autopilot automates vessel departures, repairs, and rebuy operations.
 *
 * Key Features:
 * - Toggle autopilot pause/resume state
 * - Get current autopilot status
 * - Manual trigger for auto-depart (event-driven)
 * - Price alert checking and notifications
 *
 * @requires express - Router and middleware
 * @requires ../../utils/api - API helper functions
 * @requires ../../autopilot - Autopilot system core logic
 * @requires ../../state - Global state management
 * @requires ../../utils/logger - Logging utility
 * @requires ../../websocket - WebSocket broadcasting
 * @module server/routes/game/autopilot
 */

const express = require('express');
const { getUserId } = require('../../utils/api');
const autopilot = require('../../autopilot');
const logger = require('../../utils/logger');
const { broadcastToUser } = require('../../websocket');

const router = express.Router();

/**
 * POST /api/check-price-alerts
 * Manually trigger price alert check (called on page load)
 *
 * Checks current fuel/CO2 prices against configured alert thresholds
 * and sends browser notifications if prices are below thresholds.
 *
 * @route POST /api/check-price-alerts
 *
 * @returns {object} Status response:
 *   - success {boolean} - Whether check was performed
 *
 * @error 401 - User not authenticated
 * @error 404 - Prices not available yet
 * @error 500 - Failed to check price alerts
 *
 * Side effects:
 * - Sends browser notifications if price alerts triggered
 */
router.post('/check-price-alerts', async (req, res) => {
  try {
    const userId = getUserId();
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const state = require('../../state');
    const prices = state.getPrices(userId);

    if (!prices) {
      return res.status(404).json({ error: 'Prices not available yet' });
    }

    await autopilot.checkPriceAlerts(userId, prices);
    res.json({ success: true });
  } catch (error) {
    logger.error('[API] Failed to check price alerts:', error.message);
    res.status(500).json({ error: 'Failed to check price alerts' });
  }
});

/**
 * POST /api/autopilot/trigger-depart
 * Event-driven auto-depart trigger (called when vessels arrive in harbor)
 *
 * Triggers automatic vessel departure when vessels arrive in harbor,
 * but only if auto-depart is enabled in user settings.
 *
 * @route POST /api/autopilot/trigger-depart
 *
 * @returns {object} Status response:
 *   - success {boolean} - Whether trigger was executed
 *   - message {string} - Status message
 *
 * @error 500 - Failed to trigger auto-depart
 *
 * Side effects:
 * - Departs all vessels in harbor if auto-depart enabled
 * - Broadcasts departure notifications
 * - May trigger rebuy operations if configured
 */
router.post('/trigger-depart', async (req, res) => {
  try {
    const userId = getUserId();
    const state = require('../../state');

    const settings = state.getSettings(userId);

    // Only execute if auto-depart is enabled
    if (!settings?.autoDepartAll) {
      return res.json({ success: false, message: 'Auto-depart not enabled' });
    }

    logger.debug(`[Auto-Depart] Event-driven trigger received for user ${userId}`);

    // Execute auto-depart with all required parameters
    // (using broadcastToUser imported at top of file)
    await autopilot.autoDepartVessels(
      autopilot.isAutopilotPaused(),
      broadcastToUser,
      autopilot.autoRebuyAll,
      autopilot.tryUpdateAllData
    );

    res.json({ success: true, message: 'Auto-depart triggered' });
  } catch (error) {
    logger.error('[Auto-Depart] Trigger failed:', error);
    res.status(500).json({ error: 'Failed to trigger auto-depart' });
  }
});

/**
 * POST /api/autopilot/toggle
 * Pause/Resume autopilot
 *
 * Toggles autopilot paused state. When paused, the central autopilot monitor
 * still runs on its schedule, but skips all actions (depart, repair, rebuy, etc.).
 * Header data updates continue to run normally.
 *
 * @route POST /api/autopilot/toggle
 *
 * @returns {object} New autopilot state:
 *   - success {boolean} - Operation success
 *   - paused {boolean} - New paused state (true=paused, false=running)
 *   - message {string} - Human-readable status
 *
 * @error 500 - Failed to toggle autopilot
 *
 * Side effects:
 * - Updates global autopilot paused state
 * - Broadcasts status change to all connected clients
 */
router.post('/toggle', async (req, res) => {
  try {
    const userId = getUserId();
    // (using broadcastToUser imported at top of file)

    // Toggle paused state in autopilot.js (global state)
    const currentlyPaused = autopilot.isAutopilotPaused();
    const newPausedState = !currentlyPaused;

    if (newPausedState) {
      autopilot.pauseAutopilot();
    } else {
      autopilot.resumeAutopilot();
    }

    const status = newPausedState ? 'paused' : 'resumed';
    logger.info(`[Autopilot] User ${userId} ${status} autopilot`);

    // Broadcast status to this user's connected clients
    broadcastToUser(userId, 'autopilot_status', {
      paused: newPausedState,
      message: `Autopilot ${status}`
    });

    res.json({
      success: true,
      paused: newPausedState,
      message: `Autopilot ${status}`
    });
  } catch (error) {
    logger.error('[Autopilot] Toggle failed:', error);
    res.status(500).json({ error: 'Failed to toggle autopilot' });
  }
});

/**
 * GET /api/autopilot/status
 * Get current autopilot pause status
 *
 * Returns the current autopilot paused state (global state from autopilot.js).
 * Used on page load to sync button state across all devices.
 *
 * @route GET /api/autopilot/status
 *
 * @returns {object} Current autopilot state:
 *   - success {boolean} - Operation success
 *   - paused {boolean} - Current paused state (true=paused, false=running)
 *
 * @error 500 - Failed to get autopilot status
 */
router.get('/status', async (req, res) => {
  try {
    const isPaused = autopilot.isAutopilotPaused();

    res.json({
      success: true,
      paused: isPaused
    });
  } catch (error) {
    logger.error('[Autopilot] Get status failed:', error);
    res.status(500).json({ error: 'Failed to get autopilot status' });
  }
});

module.exports = router;