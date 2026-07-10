/* background.js */
import { DEFAULT_SETTINGS, getSettings, saveSettings, incrementDeletedCount } from './js/settings.js';
import { getDomainFromUrl, getBaseDomain, isDomainMatched, cleanCookiesForDomain, cleanAllCookies, cleanBrowsingData } from './js/cookieManager.js';

// Keep track of active tab URLs in memory to detect navigation away and closed tab domains
const tabUrlMap = {};

// Initialize existing tabs mapping on service worker script load
function initTabUrlMap() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url) {
        tabUrlMap[tab.id] = tab.url;
      }
    });
  });
}
initTabUrlMap();

// Also update cache on tab creation
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url) {
    tabUrlMap[tab.id] = tab.url;
  }
  updateBadgeForActiveTab();
});

// On install, populate default settings if not already present
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const settings = { ...DEFAULT_SETTINGS };
    settings.installDate = Date.now();
    await saveSettings(settings);
    console.log('Cookie Guardian installed and defaults initialized.');
  }
});

// Cache urls on creation/update
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateBadgeForActiveTab();
  }
  
  const oldUrl = tabUrlMap[tabId];
  if (tab.url) {
    tabUrlMap[tabId] = tab.url;
  }
  
  if (changeInfo.url) {
    const newUrl = changeInfo.url;
    const domain = getDomainFromUrl(newUrl);
    if (domain) {
      updateGreylistLastVisited(domain);
    }
    
    if (!oldUrl) return;
    
    const settings = await getSettings();
    if (!settings.enabled || !settings.deleteOnNavAway) return;
    
    const oldDomain = getDomainFromUrl(oldUrl);
    const newDomain = getDomainFromUrl(newUrl);
    
    const oldBase = getBaseDomain(oldDomain);
    const newBase = getBaseDomain(newDomain);
    
    if (oldBase && oldBase !== newBase) {
      // Check if other tabs are still open on the old base domain
      const isStillOpen = await isDomainStillOpen(oldBase, tabId);
      if (!isStillOpen) {
        scheduleCleanup(oldBase, settings.cleanDelay);
      }
    }
  }
});

// Handle Tab Closed event
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const closedUrl = tabUrlMap[tabId];
  delete tabUrlMap[tabId];
  
  if (!closedUrl) return;
  
  const settings = await getSettings();
  if (!settings.enabled || !settings.deleteOnTabClose) return;
  
  const closedDomain = getDomainFromUrl(closedUrl);
  if (!closedDomain) return;
  
  const baseDomain = getBaseDomain(closedDomain);
  
  // Check if other tabs are still open on the same base domain
  const isStillOpen = await isDomainStillOpen(baseDomain);
  if (!isStillOpen) {
    scheduleCleanup(baseDomain, settings.cleanDelay);
  }
  updateBadgeForActiveTab();
});

// Update badge when switching active tabs
chrome.tabs.onActivated.addListener(() => {
  updateBadgeForActiveTab();
});

// Update badge when storage/settings are updated
chrome.storage.onChanged.addListener(() => {
  updateBadgeForActiveTab();
});

// Check if a domain has other open tabs (optionally ignoring a specific tab ID)
function isDomainStillOpen(domain, ignoreTabId = null) {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      const openDomains = tabs
        .filter(tab => tab.id !== ignoreTabId && tab.url)
        .map(tab => getDomainFromUrl(tab.url));
      
      const match = openDomains.some(openDom => {
        return openDom === domain || openDom.endsWith('.' + domain) || domain.endsWith('.' + openDom);
      });
      resolve(match);
    });
  });
}

// Show chrome notification on cleanup
async function showNotification(title, count) {
  const settings = await getSettings();
  if (!settings.showNotifications) return;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/icons/icon128.png',
    title: 'Cookie Guardian',
    message: `${title}: Deleted ${count} cookie${count === 1 ? '' : 's'}.`,
    priority: 1
  });
}

// Clean cookies after specified seconds delay (uses persistent alarms to survive Manifest V3 suspend)
function scheduleCleanup(domain, delaySeconds) {
  const alarmName = `cleanup:${domain}`;
  const delayMs = Math.max(1, delaySeconds) * 1000;
  
  chrome.alarms.create(alarmName, {
    when: Date.now() + delayMs
  });
}

// Browser Startup Cleanup
chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  if (settings.enabled && settings.deleteOnStartup) {
    // Delete all cookies on startup, including greylisted domains
    // (since Greylist means keep only for session, and startup is a new session)
    const cleanedCount = await cleanAllCookies(true); 
    console.log(`Startup clean deleted ${cleanedCount} cookies.`);
    if (cleanedCount > 0) {
      showNotification("Startup Cleanup", cleanedCount);
    }
    await cleanBrowsingData();
  }
});

// Periodic Cookie Aging Check alarm creation
chrome.alarms.create('cookieAgingCheck', { periodInMinutes: 30 });

// Periodic Greylist Expiry Check alarm creation
chrome.alarms.create('greylistExpiryCheck', { periodInMinutes: 60 });

// Consolidated Alarm event handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('cleanup:')) {
    const domain = alarm.name.split(':')[1];
    
    // Double check if domain is reopened in the meantime
    const isStillOpen = await isDomainStillOpen(domain);
    if (!isStillOpen) {
      const cleanedCount = await cleanCookiesForDomain(domain);
      if (cleanedCount > 0) {
        console.log(`Auto-cleaned ${cleanedCount} cookies for domain: ${domain}`);
        showNotification(domain, cleanedCount);
        await cleanBrowsingData();
      }
    }
    chrome.alarms.clear(alarm.name);
  } else if (alarm.name === 'scheduledCleanup') {
    const settings = await getSettings();
    if (settings.enabled && settings.enableScheduledCleanup) {
      // Do a scheduled cleanup (preserves whitelisted, keeps greylisted or deletes based on preference.
      // Usually, scheduled cleanup runs during session, so we preserve greylisted).
      const cleanedCount = await cleanAllCookies(false);
      console.log(`Scheduled cleanup deleted ${cleanedCount} cookies.`);
      if (cleanedCount > 0) {
        showNotification("Scheduled Cleanup", cleanedCount);
      }
      await cleanBrowsingData();
    }
  } else if (alarm.name === 'cookieAgingCheck') {
    const settings = await getSettings();
    if (settings.enabled && settings.enableCookieAging) {
      runCookieAgingCleanup(settings.maxCookieAge);
    }
  } else if (alarm.name === 'greylistExpiryCheck') {
    const settings = await getSettings();
    if (settings.enabled && settings.autoExpireGreylist) {
      runGreylistExpiryCleanup(settings.greylistExpireDays);
    }
  }
});

// Update greylist last visited activity
async function updateGreylistLastVisited(domain) {
  const settings = await getSettings();
  let greylist = settings.greylistedDomains;
  let updated = false;
  
  greylist = greylist.map(item => {
    const dom = typeof item === 'object' ? item.domain : item;
    if (dom === domain) {
      updated = true;
      return {
        domain: dom,
        addedAt: typeof item === 'object' ? (item.addedAt || Date.now()) : Date.now(),
        lastVisited: Date.now()
      };
    }
    return item;
  });
  
  if (updated) {
    await saveSettings({ greylistedDomains: greylist });
  }
}

// Clean up expired greylist domains
async function runGreylistExpiryCleanup(expireDays) {
  const settings = await getSettings();
  let greylist = settings.greylistedDomains;
  const now = Date.now();
  const expireMs = expireDays * 24 * 60 * 60 * 1000;
  
  const beforeLength = greylist.length;
  greylist = greylist.filter(item => {
    const lastVisited = typeof item === 'object' ? (item.lastVisited || item.addedAt || now) : now;
    return (now - lastVisited) < expireMs;
  });
  
  if (greylist.length !== beforeLength) {
    await saveSettings({ greylistedDomains: greylist });
    console.log(`Auto-expired ${beforeLength - greylist.length} domains from Greylist.`);
  }
}

// Update badge count and color based on active tab protection state
async function updateBadgeForActiveTab() {
  const settings = await getSettings();
  if (!settings.enabled || !settings.showCounterOnIcon) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }
    
    const domain = getDomainFromUrl(activeTab.url);
    if (!domain) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }
    
    try {
      chrome.cookies.getAll({ domain: domain }, (cookies) => {
        if (chrome.runtime.lastError) {
          chrome.action.setBadgeText({ text: '' });
          return;
        }
        
        const count = cookies ? cookies.length : 0;
        chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
        
        const isWhitelisted = isDomainMatched(domain, settings.whitelistedDomains);
        const isGreylisted = isDomainMatched(domain, settings.greylistedDomains);
        
        if (isWhitelisted) {
          chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // success green
        } else if (isGreylisted) {
          chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // orange warning
        } else {
          chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' }); // primary blue
        }
      });
    } catch (e) {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

// Run initially to populate badge
updateBadgeForActiveTab();


// Cookie Tracker for Aging (Advanced feature)
chrome.cookies.onChanged.addListener(async (changeInfo) => {
  const settings = await getSettings();
  if (!settings.enabled) return;
  
  const { removed, cookie } = changeInfo;
  if (removed) {
    // Delete from tracking
    removeFromCookieTrack(cookie);
    return;
  }
  
  // Track creation time
  if (settings.enableCookieAging) {
    trackCookieCreation(cookie);
  }
});

async function trackCookieCreation(cookie) {
  const result = await chrome.storage.local.get({ cookieCreationTimes: {} });
  const track = result.cookieCreationTimes;
  const key = `${cookie.domain}|${cookie.name}|${cookie.path}`;
  
  if (!track[key]) {
    track[key] = Date.now();
    await chrome.storage.local.set({ cookieCreationTimes: track });
  }
}

async function removeFromCookieTrack(cookie) {
  const result = await chrome.storage.local.get({ cookieCreationTimes: {} });
  const track = result.cookieCreationTimes;
  const key = `${cookie.domain}|${cookie.name}|${cookie.path}`;
  if (track[key]) {
    delete track[key];
    await chrome.storage.local.set({ cookieCreationTimes: track });
  }
}

// Cleanup cookies older than maxAgeHours
async function runCookieAgingCleanup(maxAgeHours) {
  const result = await chrome.storage.local.get({ cookieCreationTimes: {} });
  const track = result.cookieCreationTimes;
  const settings = await getSettings();
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  let deletedCount = 0;
  
  for (const [key, creationTime] of Object.entries(track)) {
    if (now - creationTime > maxAgeMs) {
      // Split details
      const [domain, name, path] = key.split('|');
      
      // Skip whitelist
      if (isDomainMatched(domain, settings.whitelistedDomains)) {
        continue;
      }
      
      // Remove cookie
      const protocol = cookieSecurePlaceholderCheck(domain) ? "https://" : "http://";
      const cleanDomain = domain.startsWith('.') ? domain.substring(1) : domain;
      const url = `${protocol}${cleanDomain}${path}`;
      
      await new Promise((resolve) => {
        chrome.cookies.remove({
          url: url,
          name: name
        }, () => {
          resolve();
        });
      });
      
      delete track[key];
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    await chrome.storage.local.set({ cookieCreationTimes: track });
    await incrementDeletedCount(deletedCount);
    console.log(`Aging cleanup deleted ${deletedCount} cookies.`);
    showNotification("Cookie Aging Cleanup", deletedCount);
  }
}

// Helper to determine if we should use secure protocol for cookie removal
function cookieSecurePlaceholderCheck(domain) {
  // Default to secure since most sites are https
  return true;
}
