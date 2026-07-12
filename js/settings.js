/* js/settings.js */

export const DEFAULT_SETTINGS = {
  enabled: true,
  theme: 'Dark',
  language: navigator.language && navigator.language.startsWith('tr') ? 'tr' : 'en',
  deleteOnTabClose: true,
  deleteOnStartup: true,
  deleteOnNavAway: false,
  cleanDelay: 3,
  keepSessionCookies: false,
  showCounterOnIcon: true,
  showNotifications: false,
  enableCookieAging: false,
  maxCookieAge: 24,
  enableScheduledCleanup: false,
  cleanupInterval: '6h',
  
  // Greylist expiration settings
  autoExpireGreylist: true,
  greylistExpireDays: 7,
  
  // Install / Protected Since date
  installDate: 0, // Will be set on install in background.js
  
  // Premium Features
  cleanLocalStorage: false,
  cleanIndexedDB: false,
  cleanCache: false,
  isPremium: false, // Default is free version
  blockThirdPartyCookies: false, // Premium feature: block third-party cookies
  keepOnlyLoginCookiesForWhitelisted: false, // Keep only login cookies for whitelisted sites, clean the rest
  enableCookieHardening: false, // Security: Enforce Secure and SameSite Lax/Strict to prevent theft
  autoAcceptCookies: false, // Automatically accept/dismiss cookie consent banners
  
  // Lists
  whitelistedDomains: [],
  greylistedDomains: [],
  
  // Deletion History
  deletionLog: [],
  
  // Statistics
  stats: {
    cleanedToday: 0,
    totalDeleted: 0,
    whitelistedCount: 0,
    trackersBlocked: 0, // Stat for blocked third-party trackers
    lastCleanedDate: '',
    dailyHistory: {} // Stores YYYY-MM-DD: count
  }
};

// Add deletion log entry
export async function logDeletionEvent(domain, count, cookieNames = []) {
  if (count <= 0) return;
  const current = await getSettings();
  const logEntry = {
    domain: domain,
    count: count,
    cookies: cookieNames,
    timestamp: new Date().toISOString()
  };
  
  // Keep logs capped at 100 entries to save storage
  const updatedLogs = [logEntry, ...(current.deletionLog || [])].slice(0, 100);
  await saveSettings({ deletionLog: updatedLogs });
}

// Get settings from storage
export function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
      if (items.installDate === 0) {
        items.installDate = Date.now();
        chrome.storage.local.set({ installDate: items.installDate });
      }
      resolve(items);
    });
  });
}

// Save specific settings to storage
export function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set(settings, () => {
      resolve();
    });
  });
}

// Reset settings to default (keeps lists and stats optional or resets them based on parameter)
export function resetSettings(resetAll = false) {
  return new Promise((resolve) => {
    if (resetAll) {
      chrome.storage.local.set(DEFAULT_SETTINGS, () => resolve());
    } else {
      getSettings().then((current) => {
        const defaultsExceptData = { ...DEFAULT_SETTINGS };
        // preserve whitelists, greylists, and stats
        defaultsExceptData.whitelistedDomains = current.whitelistedDomains;
        defaultsExceptData.greylistedDomains = current.greylistedDomains;
        defaultsExceptData.stats = current.stats;
        chrome.storage.local.set(defaultsExceptData, () => resolve());
      });
    }
  });
}

// Check stats reset on a new day
export async function checkDailyStatsReset() {
  const current = await getSettings();
  const today = new Date().toISOString().split('T')[0];
  if (current.stats.lastCleanedDate !== today) {
    const updatedStats = {
      ...current.stats,
      cleanedToday: 0,
      lastCleanedDate: today
    };
    await saveSettings({ stats: updatedStats });
    return updatedStats;
  }
  return current.stats;
}

// Update stats counts
export async function incrementDeletedCount(count) {
  if (count <= 0) return;
  const current = await getSettings();
  const todayStats = await checkDailyStatsReset();
  
  const today = new Date().toISOString().split('T')[0];
  const history = todayStats.dailyHistory || {};
  history[today] = (history[today] || 0) + count;
  
  const updatedStats = {
    ...todayStats,
    cleanedToday: todayStats.cleanedToday + count,
    totalDeleted: todayStats.totalDeleted + count,
    dailyHistory: history
  };
  
  await saveSettings({ stats: updatedStats });
  
  if (current.showCounterOnIcon) {
    updateBadge(updatedStats.cleanedToday);
  }
}

// Helper to update extension badge
export function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' }); // update to purple
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Increment trackers blocked count
export async function incrementTrackersBlocked(count) {
  if (count <= 0) return;
  const current = await getSettings();
  const updatedStats = {
    ...(current.stats || {}),
    trackersBlocked: (current.stats.trackersBlocked || 0) + count
  };
  await saveSettings({ stats: updatedStats });
}
