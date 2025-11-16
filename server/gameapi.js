/**
 * @fileoverview Game API Client - Central Entry Point
 *
 * This module re-exports all API functions from sub-modules for backward compatibility.
 * Existing code using require('./gameapi') or require('../gameapi') continues to work unchanged.
 *
 * Sub-modules:
 * - bunker.js: Fuel/CO2 prices and purchases
 * - vessel.js: Vessel operations and departures
 * - port.js: Port and route data
 * - campaign.js: Marketing campaigns
 * - maintenance.js: Vessel repairs
 * - util.js: Events, messages, game index
 *
 * @module server/gameapi
 */

// Import all sub-modules
const bunkerAPI = require('./gameapi/bunker');
const vesselAPI = require('./gameapi/vessel');
const portAPI = require('./gameapi/port');
const campaignAPI = require('./gameapi/campaign');
const maintenanceAPI = require('./gameapi/maintenance');
const utilAPI = require('./gameapi/util');

// Re-export all functions for backward compatibility
module.exports = {
  // Bunker operations (bunker.js)
  fetchPrices: bunkerAPI.fetchPrices,
  fetchBunkerState: bunkerAPI.fetchBunkerState,
  purchaseFuel: bunkerAPI.purchaseFuel,
  purchaseCO2: bunkerAPI.purchaseCO2,

  // Vessel operations (vessel.js)
  fetchVessels: vesselAPI.fetchVessels,
  departVessel: vesselAPI.departVessel,
  getVesselHistory: vesselAPI.getVesselHistory,
  getAllUserVessels: vesselAPI.getAllUserVessels,

  // Port operations (port.js)
  fetchAssignedPorts: portAPI.fetchAssignedPorts,
  fetchAutoPrice: portAPI.fetchAutoPrice,
  getAssignedPorts: portAPI.getAssignedPorts,
  getVesselPorts: portAPI.getVesselPorts,
  getRoutesByPorts: portAPI.getRoutesByPorts,

  // Campaign operations (campaign.js)
  fetchCampaigns: campaignAPI.fetchCampaigns,
  activateCampaign: campaignAPI.activateCampaign,

  // Maintenance operations (maintenance.js)
  getMaintenanceCost: maintenanceAPI.getMaintenanceCost,
  bulkRepairVessels: maintenanceAPI.bulkRepairVessels,
  fetchRepairCount: maintenanceAPI.fetchRepairCount,

  // Utility operations (util.js)
  fetchUnreadMessages: utilAPI.fetchUnreadMessages,
  fetchEventData: utilAPI.fetchEventData,
  getGameIndex: utilAPI.getGameIndex
};