/* js/cookieManager.js */
import { getSettings, incrementDeletedCount, logDeletionEvent } from './settings.js';

// Parse domain name from URL
export function getDomainFromUrl(urlStr) {
  try {
    if (!urlStr || urlStr.startsWith('chrome://') || urlStr.startsWith('chrome-extension://')) {
      return '';
    }
    const url = new URL(urlStr);
    let hostname = url.hostname;
    // Strip leading www. if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    return '';
  }
}

// Extract base registerable domain (e.g. hbomax.com from play.hbomax.com)
export function getBaseDomain(domain) {
  if (!domain) return '';
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  
  const doubleTlds = ['com', 'co', 'net', 'org', 'gov', 'edu', 'mil', 'ac', 'sch'];
  const tld2 = parts[parts.length - 2];
  const tld1 = parts[parts.length - 1];
  
  if (doubleTlds.includes(tld2) && tld1.length <= 3) {
    return parts.slice(-3).join('.');
  }
  
  return parts.slice(-2).join('.');
}

// Check if a domain matches any patterns in a list (includes subdomains)
export function isDomainMatched(domain, list) {
  if (!domain || !list || !Array.isArray(list)) return false;
  domain = domain.toLowerCase().trim();
  
  return list.some(item => {
    if (!item) return false;
    let pattern = '';
    if (typeof item === 'object') {
      pattern = item.domain || '';
    } else {
      pattern = item || '';
    }
    pattern = pattern.toLowerCase().trim();
    if (!pattern) return false;
    return domain === pattern || domain.endsWith('.' + pattern);
  });
}

// Get all cookies for a specific domain (and all its subdomains/parent domains recursively)
export function getCookiesForDomain(domain) {
  return new Promise((resolve) => {
    if (!domain) {
      resolve([]);
      return;
    }
    chrome.cookies.getAll({}, (allCookies) => {
      if (!allCookies) {
        resolve([]);
        return;
      }
      
      const normDomain = domain.toLowerCase();
      const filtered = allCookies.filter(cookie => {
        const cookieDom = cookie.domain.toLowerCase();
        const normCookieDom = cookieDom.startsWith('.') ? cookieDom.substring(1) : cookieDom;
        
        return normCookieDom === normDomain || 
               normCookieDom.endsWith('.' + normDomain) || 
               normDomain.endsWith('.' + normCookieDom);
      });
      resolve(filtered);
    });
  });
}

// Clear cookies for a specific domain
// If ignoreWhitelist is true, we delete even if whitelisted
export async function cleanCookiesForDomain(domain, ignoreWhitelist = false) {
  const settings = await getSettings();
  if (!settings.enabled) return 0;
  
  if (!ignoreWhitelist) {
    if (isDomainMatched(domain, settings.whitelistedDomains)) {
      return 0; // Whitelisted, do not delete
    }
  }
  
  const cookies = await getCookiesForDomain(domain);
  let deletedCount = 0;
  const deletedNames = [];
  
  for (const cookie of cookies) {
    // Keep session cookies option check
    if (settings.keepSessionCookies && cookie.session) {
      continue;
    }
    
    await deleteCookie(cookie);
    deletedCount++;
    deletedNames.push(cookie.name);
  }
  
  if (deletedCount > 0) {
    await incrementDeletedCount(deletedCount);
    await logDeletionEvent(domain, deletedCount, deletedNames);
  }
  return deletedCount;
}

// Delete a single cookie
function deleteCookie(cookie) {
  return new Promise((resolve) => {
    const protocol = cookie.secure ? "https://" : "http://";
    const url = `${protocol}${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}${cookie.path}`;
    chrome.cookies.remove({
      url: url,
      name: cookie.name,
      storeId: cookie.storeId
    }, (details) => {
      if (chrome.runtime.lastError) {
        console.error(`Failed to delete cookie: ${cookie.name} on ${url}. Error: ${chrome.runtime.lastError.message}`);
      }
      resolve();
    });
  });
}

// Clean all cookies except whitelisted (and optionally greylisted)
export async function cleanAllCookies(includeGreylist = false) {
  const settings = await getSettings();
  if (!settings.enabled) return 0;
  
  return new Promise((resolve) => {
    chrome.cookies.getAll({}, async (cookies) => {
      let deletedCount = 0;
      const deletedByDomain = {}; // { domain: [cookieNames] }
      
      for (const cookie of cookies) {
        let domain = cookie.domain;
        if (domain.startsWith('.')) {
          domain = domain.substring(1);
        }
        
        // Skip whitelisted
        if (isDomainMatched(domain, settings.whitelistedDomains)) {
          continue;
        }
        
        // Skip greylisted if includeGreylist is false
        if (!includeGreylist && isDomainMatched(domain, settings.greylistedDomains)) {
          continue;
        }
        
        // Keep session cookies option
        if (settings.keepSessionCookies && cookie.session) {
          continue;
        }
        
        await deleteCookie(cookie);
        deletedCount++;
        
        if (!deletedByDomain[domain]) {
          deletedByDomain[domain] = [];
        }
        deletedByDomain[domain].push(cookie.name);
      }
      
      if (deletedCount > 0) {
        await incrementDeletedCount(deletedCount);
        // Log deletions per domain
        for (const [dom, names] of Object.entries(deletedByDomain)) {
          await logDeletionEvent(dom, names.length, names);
        }
      }
      resolve(deletedCount);
    });
  });
}

// Clean storage/cache (Premium simulation/implementation)
export async function cleanBrowsingData() {
  const settings = await getSettings();
  if (!settings.enabled) return;
  
  const dataTypes = {};
  if (settings.cleanLocalStorage) dataTypes.localStorage = true;
  if (settings.cleanCache) dataTypes.cache = true;
  if (settings.cleanIndexedDB) dataTypes.indexedDB = true;
  
  if (Object.keys(dataTypes).length > 0) {
    chrome.browsingData.remove({
      since: 0
    }, dataTypes, () => {
      console.log("Browsing data cleared:", dataTypes);
    });
  }
}
