/**
 * @fileoverview Vessel Departure Routes
 *
 * This module provides the universal endpoint for vessel departures.
 * It supports departing all vessels or specific vessels by ID.
 *
 * Key Features:
 * - Universal depart endpoint for all vessels or specific ones
 * - Integration with autopilot system for departure logic
 * - Audit logging of departure results
 * - Harbor fee tracking for vessel history
 * - WebSocket broadcast notifications
 *
 * @requires express - Router and middleware
 * @requires ../../utils/api - API helper functions
 * @requires ../../autopilot - Autopilot departure logic
 * @requires ../../utils/audit-logger - Transaction logging
 * @requires ../../utils/harbor-fee-store - Harbor fee persistence
 * @module server/routes/game/depart
 */

const express = require('express');
const { getUserId } = require('../../utils/api');
const autopilot = require('../../autopilot');
const { auditLog, CATEGORIES, SOURCES, formatCurrency } = require('../../utils/audit-logger');
const { saveHarborFee } = require('../../utils/harbor-fee-store');
const logger = require('../../utils/logger');
const { broadcastToUser } = require('../../websocket');

const router = express.Router();

/**
 * Universal depart endpoint
 * Depart all vessels or specific vessels from harbor
 *
 * @route POST /api/route/depart
 * @body {array} [vessel_ids] - Optional array of specific vessel IDs to depart. If not provided, departs all vessels.
 *
 * @returns {object} Departure result with:
 *   - success {boolean} - Whether departure was successful
 *   - departedCount {number} - Number of vessels that departed
 *   - totalRevenue {number} - Total revenue from departed vessels
 *   - totalFuelUsed {number} - Total fuel consumed
 *   - totalCO2Used {number} - Total CO2 consumed
 *   - totalHarborFees {number} - Total harbor fees paid
 *   - departedVessels {array} - Details of each departed vessel
 *   - highFeeCount {number} - Count of vessels with excessive harbor fees
 *   - highFeeVessels {array} - Vessels with excessive harbor fees
 *   - message {string} - Status message if no vessels departed
 *
 * @error 400 - vessel_ids must be an array if provided
 * @error 500 - Failed to depart vessels
 *
 * Side effects:
 * - Broadcasts departure notification via WebSocket
 * - Logs departure results to audit log
 * - Saves harbor fees for vessel history
 * - Triggers harbor map refresh broadcast
 */
router.post('/depart', async (req, res) => {
  try {
    const userId = getUserId();

    // Extract vessel IDs from request body (optional)
    const vesselIds = req.body?.vessel_ids || null;

    if (vesselIds && !Array.isArray(vesselIds)) {
      return res.status(400).json({ error: 'vessel_ids must be an array' });
    }

    if (vesselIds) {
      logger.debug(`[Depart API] Departing ${vesselIds.length} specific vessels`);
    } else {
      logger.debug(`[Depart API] Departing ALL vessels in harbor`);
    }

    // Call universal depart function
    // vesselIds = null means "depart all"
    // vesselIds = [1,2,3] means "depart these specific vessels"
    const { broadcastHarborMapRefresh } = require('../../websocket');
    // (using broadcastToUser imported at top of file)
    const result = await autopilot.departVessels(userId, vesselIds, broadcastToUser, autopilot.autoRebuyAll, autopilot.tryUpdateAllData);

    // LOGBOOK: Manual vessel departure (same format as Auto-Depart)
    if (result && result.success && result.departedCount > 0) {
      // Log success
      await auditLog(
        userId,
        CATEGORIES.VESSEL,
        'Manual Depart',
        `${result.departedCount} vessels | +${formatCurrency(result.totalRevenue)}`,
        {
          vesselCount: result.departedCount,
          totalRevenue: result.totalRevenue,
          totalFuelUsed: result.totalFuelUsed,
          totalCO2Used: result.totalCO2Used,
          totalHarborFees: result.totalHarborFees,
          departedVessels: result.departedVessels
        },
        'SUCCESS',
        SOURCES.MANUAL
      );

      // Log warnings if any vessels had excessive harbor fees
      if (result.highFeeCount > 0) {
        const totalHarborFees = result.highFeeVessels.reduce((sum, v) => sum + v.harborFee, 0);
        await auditLog(
          userId,
          CATEGORIES.VESSEL,
          'Manual Depart',
          `${result.highFeeCount} vessel${result.highFeeCount > 1 ? 's' : ''} with excessive harbor fees | ${formatCurrency(totalHarborFees)} fees`,
          {
            vesselCount: result.highFeeCount,
            totalHarborFees: totalHarborFees,
            highFeeVessels: result.highFeeVessels
          },
          'WARNING',
          SOURCES.MANUAL
        );
      }

      // Save harbor fees for vessel history display
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      for (const vessel of result.departedVessels) {
        try {
          await saveHarborFee(userId, vessel.vesselId, timestamp, vessel.harborFee);
        } catch (error) {
          logger.error(`[Depart API] Failed to save harbor fee for vessel ${vessel.vesselId}:`, error.message);
        }
      }
    }

    // Trigger Harbor Map refresh (vessels departed)
    if (broadcastHarborMapRefresh) {
      broadcastHarborMapRefresh(userId, 'vessels_departed', {
        count: vesselIds ? vesselIds.length : 'all'
      });
    }

    res.json(result || { success: true, message: 'Depart triggered' });
  } catch (error) {
    logger.error('[Depart API] Error:', error);
    res.status(500).json({ error: 'Failed to depart vessels' });
  }
});

module.exports = router;