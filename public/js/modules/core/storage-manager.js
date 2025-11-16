/**
 * @fileoverview Per-user localStorage management module.
 * Provides automatic prefixing of storage keys with user ID to prevent
 * data leakage between accounts when switching users.
 *
 * @module core/storage-manager
 */

/**
 * Global prefix for user-specific storage keys.
 * Set during initialization with the user's ID.
 * @type {string|null}
 */
let userStoragePrefix = null;

/**
 * Set the user storage prefix for all storage operations.
 * Called during initialization after user ID is loaded from settings.
 *
 * @param {string|number} userId - User ID to use as prefix
 */
export function setUserStoragePrefix(userId) {
  userStoragePrefix = userId;
  window.USER_STORAGE_PREFIX = userId;

  if (window.DEBUG_MODE) {
    console.log(`[Storage] Per-user storage initialized for userId: ${userId}`);
  }
}

/**
 * Get the current user storage prefix.
 *
 * @returns {string|null} Current user storage prefix
 */
export function getUserStoragePrefix() {
  return userStoragePrefix || window.USER_STORAGE_PREFIX;
}

/**
 * Get user-specific localStorage key to prevent data leakage between accounts.
 * Automatically prefixes key with userId when available.
 *
 * @param {string} key - Base key name (e.g., 'autopilotPaused')
 * @returns {string} User-specific key (e.g., 'autopilotPaused_1234')
 *
 * @example
 * getUserStorageKey('autopilotPaused') // Returns 'autopilotPaused_1234'
 * getUserStorageKey('badgeCache') // Returns 'badgeCache_1234'
 */
export function getUserStorageKey(key) {
  // Use window.CACHE_KEY if it's for badge cache
  if (key === 'badgeCache') {
    return window.CACHE_KEY || 'badgeCache';
  }

  // For other keys, check if we have a userId from settings
  const prefix = getUserStoragePrefix();
  if (prefix) {
    return `${key}_${prefix}`;
  }

  // Fallback to non-prefixed key if userId not yet loaded
  return key;
}

/**
 * Get item from localStorage with automatic per-user prefixing.
 *
 * @param {string} key - Storage key
 * @returns {string|null} Stored value or null
 *
 * @example
 * const paused = getStorage('autopilotPaused');
 * if (paused !== null) {
 *   const isPaused = JSON.parse(paused);
 * }
 */
export function getStorage(key) {
  return localStorage.getItem(getUserStorageKey(key));
}

/**
 * Set item in localStorage with automatic per-user prefixing.
 *
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 *
 * @example
 * setStorage('autopilotPaused', JSON.stringify(true));
 * setStorage('settingsSectionStates', JSON.stringify({general: 'open'}));
 */
export function setStorage(key, value) {
  localStorage.setItem(getUserStorageKey(key), value);
}

/**
 * Remove item from localStorage with automatic per-user prefixing.
 *
 * @param {string} key - Storage key to remove
 *
 * @example
 * removeStorage('autopilotPaused');
 */
export function removeStorage(key) {
  localStorage.removeItem(getUserStorageKey(key));
}

/**
 * Clear all user-specific storage keys.
 * Only clears keys that match the current user prefix.
 *
 * @returns {number} Number of keys cleared
 */
export function clearUserStorage() {
  const prefix = getUserStoragePrefix();
  if (!prefix) {
    console.warn('[Storage] Cannot clear user storage: no prefix set');
    return 0;
  }

  let clearedCount = 0;
  const keysToRemove = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.endsWith(`_${prefix}`)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    clearedCount++;
  });

  if (window.DEBUG_MODE) {
    console.log(`[Storage] Cleared ${clearedCount} user-specific keys`);
  }

  return clearedCount;
}

// Expose globally for backward compatibility with other modules
window.getStorage = getStorage;
window.setStorage = setStorage;
