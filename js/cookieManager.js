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

// Known SSO (Single Sign-On) and Cross-Domain Authentication clusters
const SSO_CLUSTERS = [
  ['primevideo.com', 'amazon.com', 'amazon.com.tr', 'amazon.co.uk', 'amazon.de', 'primegaming.com', 'twitch.tv'],
  ['youtube.com', 'google.com', 'google.com.tr'],
  ['hbomax.com', 'max.com', 'hbo.com'],
  ['disneyplus.com', 'disney.com', 'bamgrid.com'],
  ['microsoft.com', 'live.com', 'office.com', 'xbox.com'],
  ['apple.com', 'icloud.com'],
  ['epicgames.com', 'unrealengine.com'],
  ['ea.com', 'origin.com'],
  ['playstation.com', 'sony.com', 'sonyentertainmentnetwork.com']
];

// Check if a domain matches any patterns in a list (includes subdomains)
export function isDomainMatched(domain, list) {
  if (!domain || !list || !Array.isArray(list)) return false;
  domain = domain.toLowerCase().trim();
  
  // Expand domain with SSO clusters to prevent cross-domain auth from being broken
  // If the user whitelisted 'primevideo.com' and the cookie is for 'amazon.com',
  // we check if ANY domain in the cluster matches the whitelist.
  let domainsToCheck = [domain];
  for (const cluster of SSO_CLUSTERS) {
    if (cluster.some(c => domain === c || domain.endsWith('.' + c))) {
      for (const c of cluster) {
        if (!domainsToCheck.includes(c)) domainsToCheck.push(c);
      }
    }
  }
  
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
    
    for (const d of domainsToCheck) {
      // 1. Regular Expression Check
      if ((pattern.startsWith('/') && pattern.endsWith('/')) || pattern.includes('^') || pattern.includes('$') || pattern.includes('|')) {
        try {
          let cleanRegexStr = pattern;
          if (pattern.startsWith('/') && pattern.endsWith('/')) {
            cleanRegexStr = pattern.substring(1, pattern.length - 1);
          }
          const regex = new RegExp(cleanRegexStr, 'i');
          if (regex.test(d)) return true;
        } catch (e) {
          // invalid regex, ignore and fallback
        }
      }
      
      // 2. Wildcard (Glob) Check
      if (pattern.includes('*')) {
        try {
          const regexStr = '^' + pattern
            .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // escape special characters except *
            .replace(/\*/g, '.*') + '$';
          const regex = new RegExp(regexStr, 'i');
          if (regex.test(d)) return true;
        } catch (e) {
          // fallback
        }
      }
      
      // 3. Exact matching or Subdomain matching
      if (d === pattern || d.endsWith('.' + pattern)) return true;
    }
    return false;
  });
}

// Helper to identify login/session cookies and consent/preference cookies
export function isLoginCookie(cookie) {
  if (cookie.session) return true;
  
  const name = cookie.name.toLowerCase();
  const value = cookie.value.toLowerCase();
  
  // Common session/auth/consent cookie name patterns
  const loginPatterns = [
    'session', 'token', 'auth', 'login', 'user', 'member', 'sid', 'ssid', 
    'userid', 'sign', 'remember', 'secure', 'pass', 'pwd', 'key', 'uuid', 
    'guid', 'jwt', 'sso', 'identity', 'cred', 'claim', 'account',
    // Consent and GDPR preference keywords to prevent banner popups
    'consent', 'cookie', 'gdpr', 'ccpa', 'notice', 'banner', 'dismiss', 
    'accept', 'decline', 'choice', 'opt', 'ack', 'cfg', 'pref'
  ];
  
  const isMatch = loginPatterns.some(pattern => name.includes(pattern));
  if (isMatch) return true;
  
  // Some sites use short names for login tokens (like 'at', 'rt', 'ut', 'uid', 'li')
  if (value.length > 32 && (name.includes('at') || name.includes('rt') || name.includes('ut') || name.includes('uid') || name.includes('li') || name.includes('key'))) {
    return true;
  }
  
  return false;
}

// Clean only non-login cookies for a whitelisted domain
export async function cleanNonLoginCookiesForDomain(domain) {
  const settings = await getSettings();
  const cookies = await getCookiesForDomain(domain);
  let deletedCount = 0;
  const deletedNames = [];
  
  for (const cookie of cookies) {
    if (isLoginCookie(cookie)) {
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
      if (settings.keepOnlyLoginCookiesForWhitelisted) {
        return await cleanNonLoginCookiesForDomain(domain);
      }
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
    await cleanBrowsingDataForDomain(domain);
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
          if (settings.keepOnlyLoginCookiesForWhitelisted) {
            if (!isLoginCookie(cookie)) {
              await deleteCookie(cookie);
              deletedCount++;
              if (!deletedByDomain[domain]) {
                deletedByDomain[domain] = [];
              }
              deletedByDomain[domain].push(cookie.name);
            }
          }
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
          await cleanBrowsingDataForDomain(dom);
        }
      }
      resolve(deletedCount);
    });
  });
}

// Clean storage per domain (respects Whitelist!)
export async function cleanBrowsingDataForDomain(domain) {
  const settings = await getSettings();
  if (!settings.enabled) return;
  
  // NEVER clear browsing data for whitelisted domains!
  if (isDomainMatched(domain, settings.whitelistedDomains)) {
    return;
  }
  
  const dataTypes = {};
  if (settings.cleanLocalStorage) dataTypes.localStorage = true;
  if (settings.cleanIndexedDB) dataTypes.indexedDB = true;
  
  if (Object.keys(dataTypes).length > 0) {
    const origin = `https://${domain}`;
    const originHttp = `http://${domain}`;
    try {
      chrome.browsingData.remove({
        origins: [origin, originHttp],
        since: 0
      }, dataTypes, () => {
        console.log(`Browsing data cleared for: ${domain}`);
      });
    } catch (e) {
      console.error(`Error clearing browsing data for ${domain}:`, e);
    }
  }
}

// Clear global cache if enabled (since cache is global in Chrome)
export async function cleanBrowsingData() {
  const settings = await getSettings();
  if (!settings.enabled) return;
  
  if (settings.cleanCache) {
    chrome.browsingData.remove({
      since: 0
    }, { cache: true }, () => {
      console.log("Global browser cache cleared.");
    });
  }
}
