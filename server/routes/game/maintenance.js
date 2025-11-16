/**
 * @fileoverview Vessel Maintenance Routes
 *
 * This module provides endpoints for vessel maintenance operations including
 * wear repairs and drydock services (major/minor antifouling restoration).
 *
 * Key Features:
 * - Get maintenance cost calculations for vessels
 * - Perform bulk wear maintenance repairs
 * - Check drydock service availability and pricing
 * - Execute bulk drydock operations with lock management
 * - Audit logging for all maintenance operations
 * - WebSocket notifications for operation progress
 *
 * @requires express - Router and middleware
 * @requires validator - Input sanitization
 * @requires ../../utils/api - API helper functions
 * @requires ../../state - Global state management
 * @requires ../../autopilot - For capacity caching and data updates
 * @requires ../../utils/audit-logger - Transaction logging
 * @requires ../../websocket - WebSocket broadcasting
 * @requires ../../utils/logger - Logging utility
 * @module server/routes/game/maintenance
 */

const express = require('express');
const validator = require('validator');
const { apiCall, getUserId } = require('../../utils/api');
const { broadcastToUser } = require('../../websocket');
const logger = require('../../utils/logger');
const autopilot = require('../../autopilot');
const { auditLog, CATEGORIES, SOURCES, formatCurrency } = require('../../utils/audit-logger');

const router = express.Router();

/**
 * POST /api/maintenance/get
 * Calculates maintenance cost for specified vessels
 *
 * Returns total repair cost and individual vessel costs for wear maintenance.
 *
 * @route POST /api/maintenance/get
 * @body {array} vessel_ids - Array of vessel IDs to check maintenance for
 *
 * @returns {object} Maintenance cost data:
 *   - data.vessels {array} - Individual vessel maintenance details
 *   - data.total_cost {number} - Total cost for all vessels
 *   - user.cash {number} - User's current cash balance
 *
 * @error 400 - Missing vessel_ids
 * @error 500 - Failed to get maintenance cost
 */
router.post('/get', express.json(), async (req, res) => {
  const { vessel_ids } = req.body;

  if (!vessel_ids) {
    return res.status(400).json({ error: 'Missing vessel_ids' });
  }

  try {
    const data = await apiCall('/maintenance/get', 'POST', { vessel_ids });
    res.json(data);
  } catch (error) {
    logger.error('Error getting maintenance cost:', error);
    res.status(500).json({ error: 'Failed to get maintenance cost' });
  }
});

/**
 * POST /api/maintenance/do-wear-maintenance-bulk
 * Performs bulk wear maintenance on multiple vessels
 *
 * Repairs all specified vessels in a single API call.
 *
 * @route POST /api/maintenance/do-wear-maintenance-bulk
 * @body {array} vessel_ids - Array of vessel IDs to repair
 *
 * @returns {object} Maintenance result from game API
 *
 * @error 400 - Missing vessel_ids
 * @error 500 - Failed to perform bulk maintenance
 */
router.post('/do-wear-maintenance-bulk', express.json(), async (req, res) => {
  const { vessel_ids } = req.body;

  if (!vessel_ids) {
    return res.status(400).json({ error: 'Missing vessel_ids' });
  }

  try {
    const data = await apiCall('/maintenance/do-wear-maintenance-bulk', 'POST', { vessel_ids });
    res.json(data);
  } catch (error) {
    logger.error('Error performing bulk maintenance:', error);
    res.status(500).json({ error: 'Failed to perform bulk maintenance' });
  }
});

/**
 * POST /api/maintenance/get-drydock-status
 * Gets drydock maintenance pricing for specified vessels
 *
 * Returns pricing for major/minor drydock and wear repairs based on speed setting.
 *
 * @route POST /api/maintenance/get-drydock-status
 * @body {array} vessel_ids - Array of vessel IDs to check
 * @body {string} speed - "maximum" or "minimum" speed setting
 * @body {string} maintenance_type - "major" or "minor" drydock type
 *
 * @returns {object} Drydock pricing information:
 *   - vessels {array} - Individual vessel drydock details with cost and duration
 *   - totalCost {number} - Total cost for all vessels
 *   - cash {number} - User's current cash balance
 *
 * @error 400 - Missing vessel_ids, invalid speed, or invalid maintenance_type
 * @error 500 - Failed to get drydock status
 */
router.post('/get-drydock-status', express.json(), async (req, res) => {
  const { vessel_ids, speed, maintenance_type } = req.body;

  if (!vessel_ids) {
    return res.status(400).json({ error: 'Missing vessel_ids' });
  }

  if (!speed || !['maximum', 'minimum'].includes(speed)) {
    return res.status(400).json({ error: 'Invalid speed. Must be "maximum" or "minimum"' });
  }

  if (!maintenance_type || !['major', 'minor'].includes(maintenance_type)) {
    return res.status(400).json({ error: 'Invalid maintenance_type. Must be "major" or "minor"' });
  }

  try {
    const data = await apiCall('/maintenance/get', 'POST', {
      vessel_ids
    });

    // Parse maintenance data and extract correct costs based on type
    const vessels = data.data.vessels.map(v => {
      const maintenanceType = maintenance_type === 'major' ? 'drydock_major' : 'drydock_minor';
      const maintenanceInfo = v.maintenance_data?.find(m => m.type === maintenanceType);

      return {
        id: v.id,
        cost: maintenanceInfo?.discounted_price || maintenanceInfo?.price || 0,
        duration: maintenanceInfo?.duration || 0,
        nearest_dry_dock: v.nearest_dry_dock
      };
    });

    const totalCost = vessels.reduce((sum, v) => sum + v.cost, 0);

    res.json({
      vessels,
      totalCost,
      cash: data.user.cash
    });
  } catch (error) {
    logger.error('Error getting drydock status:', error);
    res.status(500).json({ error: 'Failed to get drydock status' });
  }
});

/**
 * POST /api/maintenance/bulk-drydock
 * Executes drydock maintenance for specified vessels
 *
 * Sends vessels to nearest drydock for major or minor antifouling restoration.
 * Uses lock management to prevent concurrent operations.
 *
 * @route POST /api/maintenance/bulk-drydock
 * @body {array} vessel_ids - Array of vessel IDs to send to drydock
 * @body {string} speed - "maximum" or "minimum" speed setting
 * @body {string} maintenance_type - "major" or "minor" drydock type
 *
 * @returns {object} Drydock execution result from game API
 *
 * @error 400 - Missing vessel_ids, invalid speed, or invalid maintenance_type
 * @error 409 - Drydock operation already in progress (lock conflict)
 * @error 500 - Failed to execute drydock
 *
 * Side effects:
 * - Acquires/releases drydock lock to prevent concurrent operations
 * - Broadcasts operation start/complete notifications
 * - Updates bunker display (cash changed)
 * - Logs operation to audit log
 * - Triggers data update for drydock count badge
 */
router.post('/bulk-drydock', express.json(), async (req, res) => {
  const { vessel_ids, speed, maintenance_type } = req.body;

  if (!vessel_ids) {
    return res.status(400).json({ error: 'Missing vessel_ids' });
  }

  if (!speed || !['maximum', 'minimum'].includes(speed)) {
    return res.status(400).json({ error: 'Invalid speed. Must be "maximum" or "minimum"' });
  }

  if (!maintenance_type || !['major', 'minor'].includes(maintenance_type)) {
    return res.status(400).json({ error: 'Invalid maintenance_type. Must be "major" or "minor"' });
  }

  const userId = getUserId();
  const state = require('../../state');

  // LOCK: Prevent concurrent drydock operations (race condition protection)
  if (state.getLockStatus(userId, 'drydock')) {
    logger.debug('[Drydock] SKIPPED - Another drydock operation is already in progress');
    return res.status(409).json({ error: 'Drydock operation already in progress' });
  }

  // Set lock and broadcast to all clients
  state.setLockStatus(userId, 'drydock', true);
  broadcastToUser(userId, 'drydock_start', {});
  broadcastToUser(userId, 'lock_status', {
    depart: state.getLockStatus(userId, 'depart'),
    fuelPurchase: state.getLockStatus(userId, 'fuelPurchase'),
    co2Purchase: state.getLockStatus(userId, 'co2Purchase'),
    repair: state.getLockStatus(userId, 'repair'),
    bulkBuy: state.getLockStatus(userId, 'bulkBuy'),
    drydock: true
  });
  logger.debug('[Drydock] Lock acquired');

  try {
    const data = await apiCall('/maintenance/do-major-drydock-maintenance-bulk', 'POST', {
      vessel_ids,
      speed,
      maintenance_type
    });
    const vesselCount = JSON.parse(vessel_ids).length;
    if (userId && data.data?.success) {
      logger.info(`[Manual Drydock] User sent ${vesselCount} vessel(s) to drydock (${maintenance_type}, ${speed} speed)`);

      // AUDIT LOG: Manual bulk drydock
      // (using audit-logger imported at top of file)

      const vessels = data.data.vessels || [];
      let totalCost = 0;

      // Calculate total cost if vessel data is available
      if (vessels.length > 0) {
        totalCost = vessels.reduce((sum, v) => sum + (v.cost || 0), 0);
      }

      // Log with available data (even if vessels array is empty)
      await auditLog(
        userId,
        CATEGORIES.VESSEL,
        'Manual Bulk Drydock',
        vessels.length > 0
          ? `Sent ${vessels.length} vessel(s) to ${maintenance_type} drydock (${speed} speed) for ${formatCurrency(totalCost)}`
          : `Sent ${vesselCount} vessel(s) to ${maintenance_type} drydock (${speed} speed)`,
        {
          vessel_count: vessels.length > 0 ? vessels.length : vesselCount,
          total_cost: totalCost > 0 ? totalCost : undefined,
          maintenance_type: maintenance_type,
          speed: speed,
          vessels: vessels.length > 0 ? vessels.map(v => ({
            id: v.id,
            cost: v.cost,
            duration: v.duration,
            nearest_dry_dock: v.nearest_dry_dock
          })) : undefined
        },
        'SUCCESS',
        SOURCES.MANUAL
      );

      // Broadcast success notification
      broadcastToUser(userId, 'user_action_notification', {
        type: 'success',
        message: `🔧 <strong>Drydock Scheduled!</strong><br><br>Sent ${vesselCount} vessel(s) to drydock`
      });

      // Broadcast bunker update (cash/fuel/co2 updated)
      if (data.user) {
        const cachedCapacity = autopilot.getCachedCapacity(userId);
        broadcastToUser(userId, 'bunker_update', {
          fuel: data.user.fuel / 1000,
          co2: (data.user.co2 || data.user.co2_certificate) / 1000,
          cash: data.user.cash,
          maxFuel: cachedCapacity.maxFuel,
          maxCO2: cachedCapacity.maxCO2
        });
      }

      // Trigger immediate drydock count update
      await autopilot.tryUpdateAllData();
    }

    // Release lock BEFORE sending response
    state.setLockStatus(userId, 'drydock', false);
    logger.debug('[Drydock] Lock released');

    // Broadcast drydock complete and updated lock status
    broadcastToUser(userId, 'drydock_complete', { count: vesselCount });
    broadcastToUser(userId, 'lock_status', {
      depart: state.getLockStatus(userId, 'depart'),
      fuelPurchase: state.getLockStatus(userId, 'fuelPurchase'),
      co2Purchase: state.getLockStatus(userId, 'co2Purchase'),
      repair: state.getLockStatus(userId, 'repair'),
      bulkBuy: state.getLockStatus(userId, 'bulkBuy'),
      drydock: false
    });

    res.json(data);
  } catch (error) {
    logger.error('Error executing drydock:', error);

    // Release lock on error
    state.setLockStatus(userId, 'drydock', false);

    if (userId) {
      const safeErrorMessage = validator.escape(error.message || 'Unknown error');
      broadcastToUser(userId, 'user_action_notification', {
        type: 'error',
        message: `🔧 <strong>Drydock Failed</strong><br><br>${safeErrorMessage}`
      });

      // Broadcast drydock complete and updated lock status on error
      broadcastToUser(userId, 'drydock_complete', { count: 0 });
      broadcastToUser(userId, 'lock_status', {
        depart: state.getLockStatus(userId, 'depart'),
        fuelPurchase: state.getLockStatus(userId, 'fuelPurchase'),
        co2Purchase: state.getLockStatus(userId, 'co2Purchase'),
        repair: state.getLockStatus(userId, 'repair'),
        bulkBuy: state.getLockStatus(userId, 'bulkBuy'),
        drydock: false
      });

      // AUDIT LOG: Manual bulk drydock failed
      // (using audit-logger imported at top of file)
      try {
        const vesselCount = vessel_ids ? JSON.parse(vessel_ids).length : 0;

        await auditLog(
          userId,
          CATEGORIES.VESSEL,
          'Manual Bulk Drydock',
          `Failed to send ${vesselCount} vessel(s) to ${maintenance_type || 'unknown'} drydock: ${error.message}`,
          {
            vessel_count: vesselCount,
            maintenance_type: maintenance_type || 'unknown',
            speed: speed || 'unknown',
            error: error.message,
            stack: error.stack
          },
          'ERROR',
          SOURCES.MANUAL
        );
      } catch (auditError) {
        logger.error('[Drydock] Audit logging failed:', auditError.message);
      }
    }

    res.status(500).json({ error: 'Failed to execute drydock' });
  } finally {
    // ALWAYS release lock, even if error occurred
    state.setLockStatus(userId, 'drydock', false);
    logger.debug('[Drydock] Lock released (finally)');
  }
});

module.exports = router;