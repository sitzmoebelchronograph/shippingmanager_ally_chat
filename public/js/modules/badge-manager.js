/**
 * @fileoverview Badge Manager
 * Centralized badge update system that updates BOTH hidden badges (for compatibility)
 * and map icon bar badges directly. During transition, both are updated. Once hidden
 * buttons are removed, only map icon badges will be updated.
 *
 * @module badge-manager
 */

/**
 * Mapping between badge names and their selectors (both hidden and map icon bar)
 */
const BADGE_SELECTORS = {
  'vesselCount': {
    hidden: '#vesselCount',
    mapIcon: '.map-icon-item[data-action="departAll"] .map-icon-badge'
  },
  'anchorCount': {
    hidden: '#anchorCount',
    mapIcon: '.map-icon-item[data-action="anchor"] .map-icon-badge'
  },
  'repairCount': {
    hidden: '#repairCount',
    mapIcon: '.map-icon-item[data-action="repairAll"] .map-icon-badge'
  },
  'drydockCount': {
    hidden: '#drydockCount',
    mapIcon: '.map-icon-item[data-action="repairAll"] .map-icon-badge-bottom-left'
  },
  'pendingVesselsBadge': {
    hidden: '#pendingVesselsBadge',
    mapIcon: '.map-icon-item[data-action="buyVessels"] .map-icon-badge'
  },
  'unreadBadge': {
    hidden: '#unreadBadge',
    mapIcon: '.map-icon-item[data-action="messenger"] .map-icon-badge'
  },
  'hijackingBadge': {
    hidden: '#hijackingBadge',
    mapIcon: '.map-icon-item[data-action="hijacking"] .map-icon-badge'
  },
  'campaignsCount': {
    hidden: '#campaignsCount',
    mapIcon: '.map-icon-item[data-action="campaigns"] .map-icon-badge'
  },
  'coopBadge': {
    hidden: '#coopBadge',
    mapIcon: '.map-icon-item[data-action="coop"] .map-icon-badge'
  },
  'allianceChatBadge': {
    hidden: '#allianceChatBadge',
    mapIcon: '.map-icon-item[data-action="allianceChat"] .map-icon-badge'
  }
};

/**
 * Badge color classes
 */
const BADGE_COLORS = {
  RED: 'map-badge-red',
  ORANGE: 'map-badge-orange',
  BLUE: 'map-badge-blue',
  GREEN: 'map-badge-green'
};

/**
 * Update a badge with count and visibility
 * Updates BOTH hidden badge (for compatibility) and map icon badge
 * @param {string} badgeName - Name of the badge (e.g., 'vesselCount')
 * @param {number} count - Badge count to display
 * @param {boolean} visible - Whether badge should be visible
 * @param {string} color - Badge color (RED, ORANGE, BLUE, GREEN)
 */
export function updateBadge(badgeName, count, visible = true, color = 'RED') {
  const selectors = BADGE_SELECTORS[badgeName];
  if (!selectors) {
    console.warn(`[Badge Manager] Unknown badge: ${badgeName}`);
    return;
  }

  // Update hidden badge (for compatibility with existing code)
  const hiddenBadge = document.querySelector(selectors.hidden);
  if (hiddenBadge) {
    hiddenBadge.textContent = count;
    if (visible && count > 0) {
      hiddenBadge.classList.remove('hidden');
    } else {
      hiddenBadge.classList.add('hidden');
    }

    // Apply color classes to hidden badge (for compatibility)
    hiddenBadge.classList.remove('badge-red-bg', 'badge-orange-bg', 'badge-green-bg');
    if (color === 'ORANGE') {
      hiddenBadge.classList.add('badge-orange-bg');
    } else if (color === 'GREEN') {
      hiddenBadge.classList.add('badge-green-bg');
    } else if (color === 'RED') {
      hiddenBadge.classList.add('badge-red-bg');
    }
    // Note: BLUE color is handled by CSS (#vesselCount specific rule)
  }

  // Update map icon badge
  const mapIconBadge = document.querySelector(selectors.mapIcon);
  if (mapIconBadge) {
    mapIconBadge.textContent = count;
    if (visible && count > 0) {
      mapIconBadge.classList.remove('hidden');
    } else {
      mapIconBadge.classList.add('hidden');
    }

    // Update color
    Object.values(BADGE_COLORS).forEach(colorClass => {
      mapIconBadge.classList.remove(colorClass);
    });
    mapIconBadge.classList.add(BADGE_COLORS[color]);
  }
}

/**
 * Hide a badge completely
 * @param {string} badgeName - Name of the badge to hide
 */
export function hideBadge(badgeName) {
  const selector = BADGE_SELECTORS[badgeName];
  if (!selector) {
    console.warn(`[Badge Manager] Unknown badge: ${badgeName}`);
    return;
  }

  const badge = document.querySelector(selector);
  if (!badge) {
    console.warn(`[Badge Manager] Badge element not found: ${selector}`);
    return;
  }

  badge.classList.add('hidden');
}

/**
 * Show a badge without changing count
 * @param {string} badgeName - Name of the badge to show
 */
export function showBadge(badgeName) {
  const selector = BADGE_SELECTORS[badgeName];
  if (!selector) {
    console.warn(`[Badge Manager] Unknown badge: ${badgeName}`);
    return;
  }

  const badge = document.querySelector(selector);
  if (!badge) {
    console.warn(`[Badge Manager] Badge element not found: ${selector}`);
    return;
  }

  badge.classList.remove('hidden');
}

/**
 * Get current badge count
 * @param {string} badgeName - Name of the badge
 * @returns {number} Current badge count
 */
export function getBadgeCount(badgeName) {
  const selector = BADGE_SELECTORS[badgeName];
  if (!selector) {
    console.warn(`[Badge Manager] Unknown badge: ${badgeName}`);
    return 0;
  }

  const badge = document.querySelector(selector);
  if (!badge) {
    console.warn(`[Badge Manager] Badge element not found: ${selector}`);
    return 0;
  }

  return parseInt(badge.textContent) || 0;
}

/**
 * Mapping between action names and hidden button IDs
 */
const ACTION_BUTTON_MAP = {
  'departAll': 'departAllBtn',
  'anchor': 'anchorBtn',
  'repairAll': 'repairAllBtn',
  'buyVessels': 'buyVesselsBtn',
  'sellVessels': 'sellVesselsBtn',
  'messenger': 'allChatsBtn',
  'hijacking': 'hijackingBtn',
  'campaigns': 'campaignsBtn',
  'coop': 'coopBtn',
  'allianceChat': 'allianceChatBtn',
  'contactList': 'contactListBtn',
  'settings': 'settingsBtn',
  'forecast': 'forecastBtn',
  'logbook': 'logbookBtn',
  'docs': 'docsBtn'
};

/**
 * Update button disabled state
 * Updates BOTH hidden button and map icon button
 * @param {string} action - Action name (e.g., 'departAll')
 * @param {boolean} disabled - Whether button should be disabled
 */
export function updateButtonState(action, disabled) {
  // Update hidden button (for compatibility)
  const buttonId = ACTION_BUTTON_MAP[action];
  if (buttonId) {
    const hiddenButton = document.getElementById(buttonId);
    if (hiddenButton) {
      hiddenButton.disabled = disabled;
    }
  }

  // Update map icon button
  const mapIconItem = document.querySelector(`.map-icon-item[data-action="${action}"]`);
  if (mapIconItem) {
    if (disabled) {
      mapIconItem.style.opacity = '0.3';
      mapIconItem.style.filter = 'grayscale(1)';
      mapIconItem.style.pointerEvents = 'none';
    } else {
      mapIconItem.style.opacity = '';
      mapIconItem.style.filter = '';
      mapIconItem.style.pointerEvents = '';
    }
  }
}

/**
 * Update button visibility (for alliance buttons)
 * Updates BOTH hidden button and map icon button
 * @param {string} action - Action name (e.g., 'coop', 'allianceChat')
 * @param {boolean} visible - Whether button should be visible
 */
export function updateButtonVisibility(action, visible) {
  // Update hidden button (for compatibility)
  const buttonId = ACTION_BUTTON_MAP[action];
  if (buttonId) {
    const hiddenButton = document.getElementById(buttonId);
    if (hiddenButton) {
      hiddenButton.style.display = visible ? '' : 'none';
    }
  }

  // Update map icon button
  const mapIconItem = document.querySelector(`.map-icon-item[data-action="${action}"]`);
  if (mapIconItem) {
    mapIconItem.style.display = visible ? '' : 'none';
  }
}

/**
 * Update button tooltip
 * Updates BOTH hidden button and map icon button
 * @param {string} action - Action name
 * @param {string} tooltip - New tooltip text
 */
export function updateButtonTooltip(action, tooltip) {
  // Update hidden button (for compatibility)
  const buttonId = ACTION_BUTTON_MAP[action];
  if (buttonId) {
    const hiddenButton = document.getElementById(buttonId);
    if (hiddenButton) {
      hiddenButton.title = tooltip;
    }
  }

  // Update map icon button
  const mapIconItem = document.querySelector(`.map-icon-item[data-action="${action}"]`);
  if (mapIconItem) {
    mapIconItem.title = tooltip;
  }
}

/**
 * Export color constants for external use
 */
export { BADGE_COLORS };
