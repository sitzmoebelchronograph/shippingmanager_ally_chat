/**
 * @fileoverview Game Management API Routes - Main Router
 *
 * This module serves as the central router that imports and mounts all game-related
 * sub-routers. It organizes game endpoints into logical groups for better maintainability
 * and parallel development.
 *
 * Sub-routers:
 * - vessel.js: Vessel management (buy, sell, repair, rename)
 * - bunker.js: Fuel and CO2 purchasing
 * - maintenance.js: Vessel wear repairs and drydock services
 * - marketing.js: Marketing campaign management
 * - autopilot.js: Autopilot control and status
 * - depart.js: Vessel departure logic
 * - user.js: User settings, company data, and version checking
 *
 * URL Structure:
 * - /api/vessel/*     → vessel.js
 * - /api/bunker/*     → bunker.js
 * - /api/maintenance/* → maintenance.js
 * - /api/marketing/*  → marketing.js
 * - /api/autopilot/*  → autopilot.js
 * - /api/route/*      → depart.js
 * - /api/user/*       → user.js
 * - /api/port/*       → user.js
 * - /api/game/*       → user.js
 * - /api/version/*    → user.js
 * - /api/check-price-alerts → autopilot.js (special top-level route)
 *
 * @requires express - Router and middleware
 * @module server/routes/game
 */

const express = require('express');
const router = express.Router();

// Import sub-routers
const vesselRoutes = require('./game/vessel');
const bunkerRoutes = require('./game/bunker');
const maintenanceRoutes = require('./game/maintenance');
const marketingRoutes = require('./game/marketing');
const autopilotRoutes = require('./game/autopilot');
const departRoutes = require('./game/depart');
const userRoutes = require('./game/user');

/**
 * Mount sub-routers at their resource paths
 * All sub-routers handle their specific resource endpoints
 */

// Vessel management routes
// GET  /api/vessel/get-vessels
// GET  /api/vessel/get-all-acquirable
// POST /api/vessel/get-sell-price
// POST /api/vessel/sell-vessels
// POST /api/vessel/purchase-vessel
// POST /api/vessel/bulk-buy-start
// POST /api/vessel/broadcast-purchase-summary
// POST /api/vessel/broadcast-sale-summary
// POST /api/vessel/get-repair-preview
// POST /api/vessel/bulk-repair
// POST /api/vessel/rename-vessel
router.use('/vessel', vesselRoutes);

// Bunker management routes
// GET  /api/bunker/get-prices
// POST /api/bunker/purchase-fuel
// POST /api/bunker/purchase-co2
router.use('/bunker', bunkerRoutes);

// Maintenance routes
// POST /api/maintenance/get
// POST /api/maintenance/do-wear-maintenance-bulk
// POST /api/maintenance/get-drydock-status
// POST /api/maintenance/bulk-drydock
router.use('/maintenance', maintenanceRoutes);

// Marketing routes
// GET  /api/marketing/get-campaigns
// POST /api/marketing/activate-campaign
router.use('/marketing', marketingRoutes);

// Autopilot routes
// POST /api/autopilot/trigger-depart
// POST /api/autopilot/toggle
// GET  /api/autopilot/status
router.use('/autopilot', autopilotRoutes);

// Departure routes
// POST /api/route/depart
router.use('/route', departRoutes);

// User routes (primary mount point)
// POST /api/user/get-company
// GET  /api/user/get-settings
router.use('/user', userRoutes);

/**
 * Special route mappings for endpoints that don't follow RESTful patterns
 * These routes are mounted at different paths but handled by userRoutes
 */

// Port routes (handled by userRoutes)
// GET /api/port/get-assigned-ports
router.get('/port/get-assigned-ports', (req, res, next) => {
  req.url = '/port/get-assigned-ports';
  userRoutes(req, res, next);
});

// Game routes (handled by userRoutes)
// POST /api/game/index
router.post('/game/index', (req, res, next) => {
  req.url = '/game/index';
  userRoutes(req, res, next);
});

// Version routes (handled by userRoutes)
// GET /api/version/check
router.get('/version/check', (req, res, next) => {
  req.url = '/version/check';
  userRoutes(req, res, next);
});

// Special top-level route for price alerts (handled by autopilotRoutes)
// POST /api/check-price-alerts
// Note: This is mounted directly at /check-price-alerts, not under /autopilot
router.post('/check-price-alerts', (req, res, next) => {
  req.url = '/check-price-alerts';
  autopilotRoutes(req, res, next);
});

module.exports = router;