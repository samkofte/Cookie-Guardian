/* background.js */
import { DEFAULT_SETTINGS, getSettings, saveSettings, incrementDeletedCount, incrementTrackersBlocked } from './js/settings.js';
import { getDomainFromUrl, getBaseDomain, isDomainMatched, cleanCookiesForDomain, cleanAllCookies, cleanBrowsingData, isLoginCookie } from './js/cookieManager.js';

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
    // If it's a whitelisted domain, process hardening and cleanup IMMEDIATELY on tab close
    if (isDomainMatched(baseDomain, settings.whitelistedDomains)) {
      if (settings.enableCookieHardening) {
        hardenDomainCookies(baseDomain);
      }
      // Schedule cleanup immediately (bypass delay for whitelisted to ensure non-login cookies are wiped instantly)
      scheduleCleanup(baseDomain, 0); 
    } else {
      // Normal greylist/unwhitelisted domains wait for cleanDelay
      scheduleCleanup(baseDomain, settings.cleanDelay);
    }
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
  updateDNRRules();
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


// Cookie Tracker for Aging (Advanced feature) - Batched to prevent PC performance issues
let cookieAgeUpdateTimeout = null;
let cookieAgePendingUpdates = { add: [], remove: [] };

chrome.cookies.onChanged.addListener(async (changeInfo) => {
  const settings = await getSettings();
  if (!settings.enabled) return;
  
  const { removed, cookie } = changeInfo;
  if (removed) {
    if (settings.enableCookieAging) {
      queueCookieRemoval(cookie);
    }
    return;
  }
  
  if (settings.enableCookieAging) {
    queueCookieCreation(cookie);
  }
  
});

// Process hardening for an entire domain at once (e.g., when the tab is closed)
async function hardenDomainCookies(domain) {
  const settings = await getSettings();
  if (!settings.enabled || !settings.enableCookieHardening) return;
  
  chrome.cookies.getAll({ domain }, async (cookies) => {
    for (const cookie of cookies) {
      await hardenCookie(cookie);
    }
  });
}

function queueCookieCreation(cookie) {
  cookieAgePendingUpdates.add.push(cookie);
  scheduleCookieAgeStorageUpdate();
}

function queueCookieRemoval(cookie) {
  cookieAgePendingUpdates.remove.push(cookie);
  scheduleCookieAgeStorageUpdate();
}

function scheduleCookieAgeStorageUpdate() {
  if (cookieAgeUpdateTimeout) clearTimeout(cookieAgeUpdateTimeout);
  cookieAgeUpdateTimeout = setTimeout(async () => {
    // Clone queues and reset immediately to capture new events while processing
    const toAdd = [...cookieAgePendingUpdates.add];
    const toRemove = [...cookieAgePendingUpdates.remove];
    cookieAgePendingUpdates = { add: [], remove: [] };
    
    if (toAdd.length === 0 && toRemove.length === 0) return;

    const result = await chrome.storage.local.get({ cookieCreationTimes: {} });
    const track = result.cookieCreationTimes;
    let changed = false;
    
    for (const cookie of toAdd) {
      const key = `${cookie.domain}|${cookie.name}|${cookie.path}`;
      if (!track[key]) {
        track[key] = Date.now();
        changed = true;
      }
    }
    
    for (const cookie of toRemove) {
      const key = `${cookie.domain}|${cookie.name}|${cookie.path}`;
      if (track[key]) {
        delete track[key];
        changed = true;
      }
    }
    
    if (changed) {
      await chrome.storage.local.set({ cookieCreationTimes: track });
    }
  }, 2000); // Batch every 2 seconds to minimize I/O overhead
}

// Hardens login cookies to prevent session theft (XSS/MITM/CSRF protection)
let isHardening = false; // prevents recursive loop when calling cookies.set inside change listener
async function hardenCookie(cookie) {
  if (isHardening) return;
  const settings = await getSettings();
  if (!settings.enabled || !settings.enableCookieHardening) return;
  
  const needsSecure = !cookie.secure;
  const needsSameSite = !cookie.sameSite || cookie.sameSite === 'no_restriction';
  
  if (isLoginCookie(cookie) && (needsSecure || needsSameSite)) {
    isHardening = true;
    
    const protocol = "https://"; // Force Secure (HTTPS only)
    const cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
    const url = `${protocol}${cleanDomain}${cookie.path}`;
    
    const setDetails = {
      url: url,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      secure: true, // Force Secure
      httpOnly: cookie.httpOnly, // Keep same httpOnly flag (forcing it may break client-side site scripts)
      sameSite: cookie.sameSite === 'no_restriction' ? 'lax' : (cookie.sameSite || 'lax'), // Force Lax SameSite
      storeId: cookie.storeId
    };
    
    if (!cookie.hostOnly) {
      setDetails.domain = cookie.domain;
    }
    
    if (!cookie.session) {
      setDetails.expirationDate = cookie.expirationDate;
    }
    
    chrome.cookies.set(setDetails, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to harden cookie:", chrome.runtime.lastError.message);
      } else {
        console.log(`Hardened cookie: ${cookie.name} on ${cookie.domain} (Secure=true, SameSite=Lax)`);
      }
      isHardening = false;
    });
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

// Update Declarative Net Request rules based on settings
async function updateDNRRules() {
  try {
    const settings = await getSettings();
    if (settings.enabled && settings.blockThirdPartyCookies && settings.isPremium) {
      chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
          {
            id: 1,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "Cookie", operation: "remove" }
              ],
              responseHeaders: [
                { header: "Set-Cookie", operation: "remove" }
              ]
            },
            condition: {
              domainType: "thirdParty",
              resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
            }
          }
        ],
        removeRuleIds: [1]
      });
    } else {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1]
      });
    }
  } catch (e) {
    console.error("Error updating DNR rules:", e);
  }
}

// Initialize DNR rules on script load
updateDNRRules();

// Observe web requests to detect and increment blocked tracker counts
chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    try {
      const settings = await getSettings();
      if (settings.enabled && settings.blockThirdPartyCookies && settings.isPremium) {
        if (details.initiator && details.url) {
          const initDom = getDomainFromUrl(details.initiator);
          const reqDom = getDomainFromUrl(details.url);
          if (initDom && reqDom) {
            const initBase = getBaseDomain(initDom);
            const reqBase = getBaseDomain(reqDom);
            if (initBase && reqBase && initBase !== reqBase) {
              const hasSetCookie = details.responseHeaders && details.responseHeaders.some(h => h.name.toLowerCase() === 'set-cookie');
              if (hasSetCookie) {
                await incrementTrackersBlocked(1);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error counting blocked trackers:", err);
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
