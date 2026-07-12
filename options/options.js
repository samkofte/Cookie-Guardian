/* options/options.js */
import { getSettings, saveSettings, resetSettings } from '../js/settings.js';
import { isDomainMatched, getDomainFromUrl, getBaseDomain, cleanCookiesForDomain } from '../js/cookieManager.js';
import { applyTranslations } from '../js/i18n.js';

function sanitizeDomainInput(inputStr) {
  let raw = inputStr.trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('*') || raw.includes('^') || raw.includes('$') || raw.includes('|') || raw.startsWith('/')) {
    return raw;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    raw = getDomainFromUrl(raw) || raw;
  } else {
    if (raw.includes('/')) raw = raw.split('/')[0];
    if (raw.startsWith('www.')) raw = raw.substring(4);
  }
  return getBaseDomain(raw) || raw;
}

const POPULAR_SITES = [
  // Tech & AI
  { name: 'Google', domain: 'google.com', category: 'Tech & AI' },
  { name: 'OpenAI', domain: 'openai.com', category: 'Tech & AI' },
  { name: 'Claude', domain: 'claude.ai', category: 'Tech & AI' },
  { name: 'Gemini', domain: 'gemini.google.com', category: 'Tech & AI' },
  { name: 'Microsoft', domain: 'microsoft.com', category: 'Tech & AI' },
  { name: 'Apple', domain: 'apple.com', category: 'Tech & AI' },
  { name: 'DuckDuckGo', domain: 'duckduckgo.com', category: 'Tech & AI' },
  { name: 'Bing', domain: 'bing.com', category: 'Tech & AI' },
  { name: 'Yahoo', domain: 'yahoo.com', category: 'Tech & AI' },
  { name: 'Yandex', domain: 'yandex.ru', category: 'Tech & AI' },
  { name: 'Baidu', domain: 'baidu.com', category: 'Tech & AI' },

  // Social & Chat
  { name: 'Facebook', domain: 'facebook.com', category: 'Social & Chat' },
  { name: 'Instagram', domain: 'instagram.com', category: 'Social & Chat' },
  { name: 'Twitter/X', domain: 'twitter.com', category: 'Social & Chat' },
  { name: 'LinkedIn', domain: 'linkedin.com', category: 'Social & Chat' },
  { name: 'Reddit', domain: 'reddit.com', category: 'Social & Chat' },
  { name: 'TikTok', domain: 'tiktok.com', category: 'Social & Chat' },
  { name: 'Pinterest', domain: 'pinterest.com', category: 'Social & Chat' },
  { name: 'Tumblr', domain: 'tumblr.com', category: 'Social & Chat' },
  { name: 'Snapchat', domain: 'snapchat.com', category: 'Social & Chat' },
  { name: 'Discord', domain: 'discord.com', category: 'Social & Chat' },
  { name: 'Telegram', domain: 'telegram.org', category: 'Social & Chat' },
  { name: 'WhatsApp', domain: 'whatsapp.com', category: 'Social & Chat' },

  // Entertainment & Gaming
  { name: 'YouTube', domain: 'youtube.com', category: 'Entertainment & Gaming' },
  { name: 'Netflix', domain: 'netflix.com', category: 'Entertainment & Gaming' },
  { name: 'Spotify', domain: 'spotify.com', category: 'Entertainment & Gaming' },
  { name: 'Twitch', domain: 'twitch.tv', category: 'Entertainment & Gaming' },
  { name: 'Kick', domain: 'kick.com', category: 'Entertainment & Gaming' },
  { name: 'Disney+', domain: 'disneyplus.com', category: 'Entertainment & Gaming' },
  { name: 'HBO Max', domain: 'hbomax.com', category: 'Entertainment & Gaming' },
  { name: 'Amazon Prime', domain: 'primevideo.com', category: 'Entertainment & Gaming' },
  { name: 'Apple Music', domain: 'music.apple.com', category: 'Entertainment & Gaming' },
  { name: 'SoundCloud', domain: 'soundcloud.com', category: 'Entertainment & Gaming' },
  { name: 'Steam', domain: 'steampowered.com', category: 'Entertainment & Gaming' },
  { name: 'Epic Games', domain: 'epicgames.com', category: 'Entertainment & Gaming' },

  // Shopping & Finance
  { name: 'Amazon', domain: 'amazon.com', category: 'Shopping & Finance' },
  { name: 'eBay', domain: 'ebay.com', category: 'Shopping & Finance' },
  { name: 'AliExpress', domain: 'aliexpress.com', category: 'Shopping & Finance' },
  { name: 'Etsy', domain: 'etsy.com', category: 'Shopping & Finance' },
  { name: 'Target', domain: 'target.com', category: 'Shopping & Finance' },
  { name: 'Walmart', domain: 'walmart.com', category: 'Shopping & Finance' },
  { name: 'PayPal', domain: 'paypal.com', category: 'Shopping & Finance' },
  { name: 'Stripe', domain: 'stripe.com', category: 'Shopping & Finance' },
  { name: 'Wise', domain: 'wise.com', category: 'Shopping & Finance' },
  { name: 'Coinbase', domain: 'coinbase.com', category: 'Shopping & Finance' },
  { name: 'Binance', domain: 'binance.com', category: 'Shopping & Finance' },

  // Workspace & Dev
  { name: 'GitHub', domain: 'github.com', category: 'Workspace & Dev' },
  { name: 'GitLab', domain: 'gitlab.com', category: 'Workspace & Dev' },
  { name: 'Notion', domain: 'notion.so', category: 'Workspace & Dev' },
  { name: 'Slack', domain: 'slack.com', category: 'Workspace & Dev' },
  { name: 'Zoom', domain: 'zoom.us', category: 'Workspace & Dev' },
  { name: 'Dropbox', domain: 'dropbox.com', category: 'Workspace & Dev' },
  { name: 'Trello', domain: 'trello.com', category: 'Workspace & Dev' },
  { name: 'Canva', domain: 'canva.com', category: 'Workspace & Dev' },
  { name: 'Figma', domain: 'figma.com', category: 'Workspace & Dev' },
  { name: 'Asana', domain: 'asana.com', category: 'Workspace & Dev' },

  // News & Information
  { name: 'Wikipedia', domain: 'wikipedia.org', category: 'News & Information' },
  { name: 'Stack Overflow', domain: 'stackoverflow.com', category: 'News & Information' },
  { name: 'Medium', domain: 'medium.com', category: 'News & Information' },
  { name: 'Quora', domain: 'quora.com', category: 'News & Information' },
  { name: 'IMDb', domain: 'imdb.com', category: 'News & Information' }
];

function getRelativeTimeString(timestamp) {
  if (!timestamp) return 'Added recently';
  const diffMs = Date.now() - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `Added ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  if (diffHours > 0) {
    return `Added ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffMins > 0) {
    return `Added ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  }
  return 'Added today';
}

let currentSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
  await loadAndBindSettings();
  setupTabNavigation();
  setupListManagers();
  setupDataManagement();
  setupDynamicVisibilityToggles();
});

// Load settings from storage and populate form controls
async function loadAndBindSettings() {
  currentSettings = await getSettings();
  
  // Theme and Translation styling
  applyTheme(currentSettings.theme);
  applyTranslations(document, currentSettings.language || 'en');
  
  // Bind inputs
  bindCheckbox('setting-delete-tab-close', 'deleteOnTabClose');
  bindCheckbox('setting-delete-startup', 'deleteOnStartup');
  bindCheckbox('setting-delete-nav-away', 'deleteOnNavAway');
  bindCheckbox('setting-keep-session', 'keepSessionCookies');
  bindCheckbox('setting-show-counter', 'showCounterOnIcon');
  bindCheckbox('setting-show-notifications', 'showNotifications');
  bindCheckbox('setting-enable-aging', 'enableCookieAging');
  bindCheckbox('setting-enable-schedule', 'enableScheduledCleanup');
  
  bindCheckbox('setting-auto-expire-greylist', 'autoExpireGreylist');
  bindCheckbox('setting-keep-only-login', 'keepOnlyLoginCookiesForWhitelisted');
  
  bindCheckbox('setting-clean-localstorage', 'cleanLocalStorage');
  bindCheckbox('setting-clean-indexeddb', 'cleanIndexedDB');
  bindCheckbox('setting-clean-cache', 'cleanCache');
  bindCheckbox('setting-block-thirdparty', 'blockThirdPartyCookies');
  bindCheckbox('setting-cookie-hardening', 'enableCookieHardening');

  bindSelect('setting-theme', 'theme', (val) => {
    applyTheme(val);
  });
  bindSelect('setting-language', 'language', (val) => {
    applyTranslations(document, val);
  });
  bindSelect('setting-schedule-interval', 'cleanupInterval', (val) => {
    // If schedule enabled, re-setup the background alarm
    if (currentSettings.enableScheduledCleanup) {
      setupBackgroundAlarm(val);
    }
  });

  bindNumberInput('setting-clean-delay', 'cleanDelay');
  bindNumberInput('setting-max-age', 'maxCookieAge');
  bindNumberInput('setting-greylist-expire-days', 'greylistExpireDays');

  // Overview Statistics
  const statsTotalDeleted = document.getElementById('stats-total-deleted');
  if (statsTotalDeleted) statsTotalDeleted.textContent = currentSettings.stats.totalDeleted;
  
  const statsCleanedToday = document.getElementById('stats-cleaned-today');
  if (statsCleanedToday) statsCleanedToday.textContent = currentSettings.stats.cleanedToday;
  
  const trackersBlockedVal = currentSettings.stats.trackersBlocked || 0;
  const statsTrackersBlocked = document.getElementById('stats-trackers-blocked');
  if (statsTrackersBlocked) statsTrackersBlocked.textContent = trackersBlockedVal;
  
  const bandwidthSavedVal = trackersBlockedVal * 12; // 12KB per blocked request
  const statsBandwidthSaved = document.getElementById('stats-bandwidth-saved');
  if (statsBandwidthSaved) {
    if (bandwidthSavedVal >= 1024) {
      statsBandwidthSaved.textContent = (bandwidthSavedVal / 1024).toFixed(1) + ' MB';
    } else {
      statsBandwidthSaved.textContent = bandwidthSavedVal + ' KB';
    }
  }

  // Protection Info
  const protectedSince = document.getElementById('stats-protected-since');
  if (protectedSince) {
    const date = new Date(installDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    protectedSince.textContent = `${day}.${month}.${year}`;
  }
  
  const statsWlCountInfo = document.getElementById('stats-whitelisted-count-info');
  if (statsWlCountInfo) statsWlCountInfo.textContent = currentSettings.whitelistedDomains.length;

  // Whitelist limits badge update
  updateWhitelistLimitBadge();

  // Render Last 7 Days Chart
  renderLast7DaysChart(currentSettings.stats.dailyHistory);

  // Render Detailed Deletion History Log
  renderDetailedDeletionLog(currentSettings.deletionLog);

  // Premium features check
  togglePremiumOverlay(currentSettings.isPremium);

  // Initial Visibility of sections
  toggleSectionVisibility('row-max-age', currentSettings.enableCookieAging);
  toggleSectionVisibility('row-schedule-interval', currentSettings.enableScheduledCleanup);
  toggleSectionVisibility('row-greylist-expire', currentSettings.autoExpireGreylist);
}

// Whitelist limit badge updater helper
function updateWhitelistLimitBadge() {
  const badge = document.getElementById('whitelist-limit-badge');
  if (badge) {
    if (currentSettings.isPremium) {
      badge.textContent = `${currentSettings.whitelistedDomains.length}/∞`;
    } else {
      badge.textContent = `${currentSettings.whitelistedDomains.length}/23`;
    }
  }
}

// Render Detailed Deletion History Log items
function renderDetailedDeletionLog(logArray) {
  const container = document.getElementById('deletion-log-ul');
  if (!container) return;
  container.innerHTML = '';
  
  const isTr = (currentSettings.language === 'tr');
  if (!logArray || logArray.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-dark); padding: 24px; font-size: 13px;">${isTr ? 'Henüz silme işlemi kaydedilmedi.' : 'No deletions logged yet.'}</div>`;
    return;
  }
  
  let totalDisplayed = 0;
  for (const entry of logArray) {
    const cookies = entry.cookies || [];
    let date;
    try {
      date = new Date(entry.timestamp);
    } catch (e) {
      date = new Date();
    }
    
    // Format timestamp: e.g. "10 Tem, 22:32"
    const monthsTr = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = isTr ? monthsTr : monthsEn;
    const timeStr = `${date.getDate()} ${months[date.getMonth()]}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    if (cookies.length > 0) {
      for (const cookieName of cookies) {
        if (totalDisplayed >= 100) break;
        
        const row = document.createElement('div');
        row.className = 'log-item';
        row.innerHTML = `
          <span class="log-item-name">${cookieName} <span class="log-item-domain">${entry.domain}</span></span>
          <span class="log-item-time">${timeStr}</span>
        `;
        container.appendChild(row);
        totalDisplayed++;
      }
    } else {
      if (totalDisplayed >= 100) break;
      const row = document.createElement('div');
      row.className = 'log-item';
      row.innerHTML = `
        <span class="log-item-name">Cookies <span class="log-item-domain">${entry.domain}</span></span>
        <span class="log-item-time">${timeStr}</span>
      `;
      container.appendChild(row);
      totalDisplayed++;
    }
    if (totalDisplayed >= 100) break;
  }
}

// Render Last 7 Days CSS Bar Chart helper
function renderLast7DaysChart(dailyHistory) {
  const container = document.getElementById('weekly-chart-container');
  if (!container) return;
  container.innerHTML = '';
  
  const isTr = (currentSettings.language === 'tr');
  const daysOfWeekTr = ['PAZ', 'PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT'];
  const daysOfWeekEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const daysOfWeek = isTr ? daysOfWeekTr : daysOfWeekEn;
  const history = dailyHistory || {};
  
  // Get last 7 days starting from today backwards
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateString = d.toISOString().split('T')[0];
    const dayLabel = daysOfWeek[d.getDay()];
    const count = history[dateString] || 0;
    last7Days.push({ label: dayLabel, count });
  }
  
  // Find maximum scale in chart
  const maxCount = Math.max(10, ...last7Days.map(d => d.count));
  
  last7Days.forEach(day => {
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-bar-wrapper';
    
    const val = document.createElement('div');
    val.className = 'chart-bar-value';
    val.textContent = day.count > 0 ? day.count : '';
    
    const fill = document.createElement('div');
    fill.className = 'chart-bar-fill';
    
    // Max visual bar height is roughly 120px
    const percent = (day.count / maxCount) * 120;
    fill.style.height = `${Math.max(4, Math.round(percent))}px`;
    
    const lbl = document.createElement('div');
    lbl.className = 'chart-bar-label';
    lbl.textContent = day.label;
    
    wrapper.appendChild(val);
    wrapper.appendChild(fill);
    wrapper.appendChild(lbl);
    container.appendChild(wrapper);
  });
}

// Function to handle theme switching
function applyTheme(theme) {
  if (theme === 'Light') {
    document.documentElement.classList.add('light-theme');
  } else {
    document.documentElement.classList.remove('light-theme');
  }
}

// Helper: Bind input switch/checkbox
function bindCheckbox(id, settingKey) {
  const checkbox = document.getElementById(id);
  if (!checkbox) return;
  checkbox.checked = currentSettings[settingKey] || false;
  checkbox.addEventListener('change', async (e) => {
    const checked = e.target.checked;
    currentSettings[settingKey] = checked;
    await saveSettings({ [settingKey]: checked });
    
    // Dynamic shows
    if (settingKey === 'enableCookieAging') {
      toggleSectionVisibility('row-max-age', checked);
    } else if (settingKey === 'enableScheduledCleanup') {
      toggleSectionVisibility('row-schedule-interval', checked);
      if (checked) {
        setupBackgroundAlarm(currentSettings.cleanupInterval);
      } else {
        chrome.alarms.clear('scheduledCleanup');
      }
    } else if (settingKey === 'autoExpireGreylist') {
      toggleSectionVisibility('row-greylist-expire', checked);
    }
  });
}

// Helper: Bind select dropdown
function bindSelect(id, settingKey, onChangeCallback) {
  const select = document.getElementById(id);
  if (!select) return;
  select.value = currentSettings[settingKey] || '';
  select.addEventListener('change', async (e) => {
    const value = e.target.value;
    currentSettings[settingKey] = value;
    await saveSettings({ [settingKey]: value });
    if (onChangeCallback) onChangeCallback(value);
  });
}

// Helper: Bind number inputs
function bindNumberInput(id, settingKey) {
  const input = document.getElementById(id);
  if (!input) return;
  input.value = currentSettings[settingKey] || 0;
  input.addEventListener('change', async (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    currentSettings[settingKey] = val;
    await saveSettings({ [settingKey]: val });
  });
}

// Toggle Visibility of dependent sections
function toggleSectionVisibility(id, show) {
  const element = document.getElementById(id);
  if (element) {
    element.style.display = show ? 'flex' : 'none';
  }
}

// Set up scheduled alarms for background cleanup
function setupBackgroundAlarm(intervalStr) {
  let periodInMinutes = 360; // default 6h
  if (intervalStr === '15m') periodInMinutes = 15;
  else if (intervalStr === '1h') periodInMinutes = 60;
  else if (intervalStr === '3h') periodInMinutes = 180;
  else if (intervalStr === '6h') periodInMinutes = 360;
  else if (intervalStr === '12h') periodInMinutes = 720;
  else if (intervalStr === '24h') periodInMinutes = 1440;
  
  chrome.alarms.create('scheduledCleanup', {
    periodInMinutes: periodInMinutes
  });
}

// Tab navigation setup
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = `tab-${tab.getAttribute('data-tab')}`;
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// Safe helper to update whitelisted counts in DOM
function updateWhitelistedStatsCount(count) {
  const el1 = document.getElementById('stats-whitelisted-count');
  if (el1) el1.textContent = count;
  const el2 = document.getElementById('stats-whitelisted-count-info');
  if (el2) el2.textContent = count;
}

// Whitelist and Greylist Managers
function setupListManagers() {
  // Render current lists
  renderWhitelistPremium(currentSettings.whitelistedDomains);
  renderGreylistList(currentSettings.greylistedDomains);
  renderPopularSites();

  // Whitelist ADD
  document.getElementById('btn-add-whitelist').addEventListener('click', async () => {
    const input = document.getElementById('whitelist-input');
    const domain = sanitizeDomainInput(input.value);
    if (domain) {
      const latestSettings = await getSettings();
      currentSettings.whitelistedDomains = latestSettings.whitelistedDomains;
      currentSettings.greylistedDomains = latestSettings.greylistedDomains;
      currentSettings.isPremium = latestSettings.isPremium;

      // Find if already exists
      const exists = currentSettings.whitelistedDomains.some(item => 
        (typeof item === 'object' ? item.domain : item) === domain
      );
      
      if (!exists) {
        // Check Free Limit of 23 whitelisted sites
        if (!currentSettings.isPremium && currentSettings.whitelistedDomains.length >= 23) {
          alert("Free limit of 23 whitelisted sites reached. Please upgrade to PRO to whitelist unlimited sites!");
          return;
        }
        
        currentSettings.whitelistedDomains.push({ domain: domain, addedAt: Date.now() });
        
        // Remove from greylist if it's there
        const glIndex = currentSettings.greylistedDomains.findIndex(item => 
          (typeof item === 'object' ? item.domain : item) === domain
        );
        if (glIndex > -1) {
          currentSettings.greylistedDomains.splice(glIndex, 1);
          renderGreylistList(currentSettings.greylistedDomains);
          await saveSettings({ greylistedDomains: currentSettings.greylistedDomains });
        }
        
        await saveSettings({ whitelistedDomains: currentSettings.whitelistedDomains });
        renderWhitelistPremium(currentSettings.whitelistedDomains);
        renderPopularSites();
        updateWhitelistLimitBadge();
        updateWhitelistedStatsCount(currentSettings.whitelistedDomains.length);
        input.value = '';
      }
    }
  });

  // Greylist ADD
  document.getElementById('btn-add-greylist').addEventListener('click', async () => {
    const input = document.getElementById('greylist-input');
    const domain = sanitizeDomainInput(input.value);
    if (domain) {
      const latestSettings = await getSettings();
      currentSettings.whitelistedDomains = latestSettings.whitelistedDomains;
      currentSettings.greylistedDomains = latestSettings.greylistedDomains;

      const exists = currentSettings.greylistedDomains.some(item => 
        (typeof item === 'object' ? item.domain : item) === domain
      );
      
      if (!exists) {
        currentSettings.greylistedDomains.push({ domain: domain, addedAt: Date.now() });
        
        // Remove from whitelist if it's there
        const wlIndex = currentSettings.whitelistedDomains.findIndex(item => 
          (typeof item === 'object' ? item.domain : item) === domain
        );
        if (wlIndex > -1) {
          currentSettings.whitelistedDomains.splice(wlIndex, 1);
          renderWhitelistPremium(currentSettings.whitelistedDomains);
          renderPopularSites();
          updateWhitelistLimitBadge();
          updateWhitelistedStatsCount(currentSettings.whitelistedDomains.length);
          await saveSettings({ whitelistedDomains: currentSettings.whitelistedDomains });
        }
        
        await saveSettings({ greylistedDomains: currentSettings.greylistedDomains });
        renderGreylistList(currentSettings.greylistedDomains);
        input.value = '';
      }
    }
  });

  // Whitelist Search
  document.getElementById('whitelist-input').addEventListener('input', (e) => {
    filterWhitelistPremium(e.target.value.trim().toLowerCase());
  });

}

// Render Domains Lists helper
function renderList(ulId, domainsArray, deleteCallback) {
  const ul = document.getElementById(ulId);
  ul.innerHTML = '';
  
  if (domainsArray.length === 0) {
    const li = document.createElement('li');
    li.className = 'no-domains';
    li.style.border = 'none';
    li.style.background = 'none';
    li.style.justifyContent = 'center';
    li.textContent = 'No domains yet';
    ul.appendChild(li);
    return;
  }
  
  domainsArray.forEach(item => {
    const domain = typeof item === 'object' ? item.domain : item;
    const li = document.createElement('li');
    
    const span = document.createElement('span');
    span.className = 'domain-name';
    span.textContent = domain;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-premium';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    removeBtn.addEventListener('click', () => deleteCallback(domain));
    
    li.appendChild(span);
    li.appendChild(removeBtn);
    ul.appendChild(li);
  });
}

function renderGreylistList(domainsArray) {
  const ul = document.getElementById('greylist-ul');
  if (!ul) return;
  ul.innerHTML = '';
  
  const isTr = (currentSettings.language === 'tr');
  if (domainsArray.length === 0) {
    const li = document.createElement('li');
    li.className = 'no-domains';
    li.style.border = 'none';
    li.style.background = 'none';
    li.style.justifyContent = 'center';
    li.textContent = isTr ? 'Henüz geçici listede site yok' : 'No greylisted sites yet';
    ul.appendChild(li);
    return;
  }
  
  domainsArray.forEach(item => {
    const domain = typeof item === 'object' ? item.domain : item;
    const li = document.createElement('li');
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'domain-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'domain-name';
    nameSpan.textContent = domain;
    infoDiv.appendChild(nameSpan);
    
    const controlWrapper = document.createElement('div');
    controlWrapper.style.display = 'flex';
    controlWrapper.style.alignItems = 'center';
    
    // Select dropdown for custom aging duration
    const select = document.createElement('select');
    select.className = 'custom-select';
    select.style.padding = '4px 8px';
    select.style.fontSize = '11px';
    select.style.minWidth = 'auto';
    select.style.marginRight = '8px';
    select.style.height = 'auto';
    
    const options = [
      { text: isTr ? 'Varsayılan' : 'Default', value: '' },
      { text: isTr ? '1 Saat' : '1 Hour', value: '1h' },
      { text: isTr ? '12 Saat' : '12 Hours', value: '12h' },
      { text: isTr ? '1 Gün' : '1 Day', value: '1d' },
      { text: isTr ? '3 Gün' : '3 Days', value: '3d' },
      { text: isTr ? '7 Gün' : '7 Days', value: '7d' }
    ];
    
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.text;
      if (typeof item === 'object' && item.customAge === opt.value) {
        o.selected = true;
      }
      select.appendChild(o);
    });
    
    select.addEventListener('change', async (e) => {
      const val = e.target.value;
      const latestSettings = await getSettings();
      let gl = latestSettings.greylistedDomains;
      const idx = gl.findIndex(i => (typeof i === 'object' ? i.domain : i) === domain);
      if (idx > -1) {
        if (typeof gl[idx] === 'string') {
          gl[idx] = { domain: domain, addedAt: Date.now() };
        }
        gl[idx].customAge = val;
        await saveSettings({ greylistedDomains: gl });
      }
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-premium';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    removeBtn.addEventListener('click', () => removeGreylistDomain(domain));
    
    controlWrapper.appendChild(select);
    controlWrapper.appendChild(removeBtn);
    
    li.appendChild(infoDiv);
    li.appendChild(controlWrapper);
    ul.appendChild(li);
  });
}

// Render Whitelist Premium Design Lists helper
function renderWhitelistPremium(domainsArray) {
  const ul = document.getElementById('whitelist-ul');
  ul.innerHTML = '';
  
  if (domainsArray.length === 0) {
    const li = document.createElement('li');
    li.className = 'no-domains';
    li.style.border = 'none';
    li.style.background = 'none';
    li.style.justifyContent = 'center';
    li.textContent = 'No whitelisted sites yet';
    ul.appendChild(li);
    return;
  }
  
  // Sort: show latest added first
  const sorted = [...domainsArray].sort((a, b) => {
    const timeA = typeof a === 'object' ? (a.addedAt || 0) : 0;
    const timeB = typeof b === 'object' ? (b.addedAt || 0) : 0;
    return timeB - timeA;
  });
  
  sorted.forEach(item => {
    const domain = typeof item === 'object' ? item.domain : item;
    const addedAt = typeof item === 'object' ? item.addedAt : null;
    
    const li = document.createElement('li');
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'domain-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'domain-name';
    nameSpan.textContent = domain;
    
    const addedSpan = document.createElement('span');
    addedSpan.className = 'domain-added-at';
    addedSpan.textContent = getRelativeTimeString(addedAt);
    
    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(addedSpan);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-premium';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    removeBtn.addEventListener('click', () => removeWhitelistDomain(domain));
    
    li.appendChild(infoDiv);
    li.appendChild(removeBtn);
    ul.appendChild(li);
  });
}

// Popular Sites Grid Generator Helper
function renderPopularSites() {
  const container = document.getElementById('quick-add-categories-container');
  if (!container) return;
  container.innerHTML = '';
  
  // Categorize POPULAR_SITES
  const categories = {};
  POPULAR_SITES.forEach(site => {
    const cat = site.category || 'Other';
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(site);
  });
  
  // Render each category
  const categoryOrder = ['Tech & AI', 'Social & Chat', 'Entertainment & Gaming', 'Shopping & Finance', 'Workspace & Dev', 'News & Information'];
  
  categoryOrder.forEach(catName => {
    const sites = categories[catName];
    if (!sites || sites.length === 0) return;
    
    const catDiv = document.createElement('div');
    catDiv.className = 'quick-add-category';
    
    const title = document.createElement('h3');
    title.className = 'quick-add-category-title';
    title.textContent = catName;
    catDiv.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'quick-add-grid';
    
    sites.forEach(site => {
      const isWhitelisted = isDomainMatched(site.domain, currentSettings.whitelistedDomains);
      
      const button = document.createElement('button');
      button.className = isWhitelisted ? 'quick-add-pill active' : 'quick-add-pill';
      
      // Label wrapper containing favicon + name
      const labelWrapper = document.createElement('div');
      labelWrapper.className = 'pill-label-wrapper';
      
      const img = document.createElement('img');
      img.className = 'pill-favicon';
      img.src = `https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`;
      img.alt = `${site.name} Icon`;
      
      const span = document.createElement('span');
      span.textContent = site.name;
      
      labelWrapper.appendChild(img);
      labelWrapper.appendChild(span);
      
      const iconSpan = document.createElement('span');
      iconSpan.className = 'pill-icon';
      iconSpan.textContent = isWhitelisted ? '✔' : '+';
      
      button.appendChild(labelWrapper);
      button.appendChild(iconSpan);
      
      button.addEventListener('click', async () => {
        const latestSettings = await getSettings();
        currentSettings.whitelistedDomains = latestSettings.whitelistedDomains;
        currentSettings.greylistedDomains = latestSettings.greylistedDomains;
        currentSettings.isPremium = latestSettings.isPremium;

        let whitelist = currentSettings.whitelistedDomains;
        let greylist = currentSettings.greylistedDomains;
        
        const wlIndex = whitelist.findIndex(item => (typeof item === 'object' ? item.domain : item) === site.domain);
        
        if (wlIndex > -1) {
          // Remove from whitelist
          whitelist.splice(wlIndex, 1);
          await cleanupDomainIfTabsClosed(site.domain);
        } else {
          // Add to whitelist
          // Check Free Limit of 23 sites
          if (!currentSettings.isPremium && whitelist.length >= 23) {
            alert("Free limit of 23 whitelisted sites reached. Please upgrade to PRO to whitelist unlimited sites!");
            return;
          }
          whitelist.push({ domain: site.domain, addedAt: Date.now() });
          
          // Remove from greylist if it's there
          const glIndex = greylist.findIndex(item => (typeof item === 'object' ? item.domain : item) === site.domain);
          if (glIndex > -1) {
            greylist.splice(glIndex, 1);
            renderGreylistList(greylist);
            await saveSettings({ greylistedDomains: greylist });
          }
        }
        
        await saveSettings({ whitelistedDomains: whitelist });
        renderWhitelistPremium(whitelist);
        renderPopularSites();
        updateWhitelistLimitBadge();
        updateWhitelistedStatsCount(whitelist.length);
      });
      
      grid.appendChild(button);
    });
    
    catDiv.appendChild(grid);
    container.appendChild(catDiv);
  });
}

// Search Filter helper
function filterList(ulId, query) {
  const ul = document.getElementById(ulId);
  const items = ul.getElementsByTagName('li');
  
  for (const item of items) {
    if (item.classList.contains('no-domains')) continue;
    const domainText = item.querySelector('.domain-text').textContent;
    if (domainText.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  }
}

// Whitelist search filter helper
function filterWhitelistPremium(query) {
  const ul = document.getElementById('whitelist-ul');
  const items = ul.getElementsByTagName('li');
  
  for (const item of items) {
    if (item.classList.contains('no-domains')) continue;
    const domainText = item.querySelector('.domain-name').textContent;
    if (domainText.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  }
}

// Safe helper to clean cookies for a domain if no open tabs remain in the browser
async function cleanupDomainIfTabsClosed(domain) {
  chrome.tabs.query({}, async (tabs) => {
    const isTabOpen = tabs.some(tab => {
      const tabDomain = getDomainFromUrl(tab.url);
      return tabDomain === domain || tabDomain.endsWith('.' + domain);
    });
    
    if (!isTabOpen) {
      // ignoreWhitelist = true since they just explicitly removed it from whitelist/greylist
      await cleanCookiesForDomain(domain, true);
      
      // Update the deletion log history list on Options page and statistics
      const updatedSettings = await getSettings();
      renderDetailedDeletionLog(updatedSettings.deletionLog);
      
      const totalDeletedEl = document.getElementById('stats-total-deleted');
      if (totalDeletedEl) {
        totalDeletedEl.textContent = updatedSettings.stats.totalDeleted;
      }
      
      const cleanedTodayEl = document.getElementById('stats-cleaned-today');
      if (cleanedTodayEl) {
        cleanedTodayEl.textContent = updatedSettings.stats.cleanedToday;
      }
    }
  });
}

// Remove from Whitelist callback
async function removeWhitelistDomain(domain) {
  const latestSettings = await getSettings();
  currentSettings.whitelistedDomains = latestSettings.whitelistedDomains;

  const index = currentSettings.whitelistedDomains.findIndex(item => 
    (typeof item === 'object' ? item.domain : item) === domain
  );
  
  if (index > -1) {
    currentSettings.whitelistedDomains.splice(index, 1);
    await saveSettings({ whitelistedDomains: currentSettings.whitelistedDomains });
    renderWhitelistPremium(currentSettings.whitelistedDomains);
    renderPopularSites();
    updateWhitelistLimitBadge();
    updateWhitelistedStatsCount(currentSettings.whitelistedDomains.length);
    await cleanupDomainIfTabsClosed(domain);
  }
}

// Remove from Greylist callback
async function removeGreylistDomain(domain) {
  const latestSettings = await getSettings();
  currentSettings.greylistedDomains = latestSettings.greylistedDomains;

  const index = currentSettings.greylistedDomains.findIndex(item => 
    (typeof item === 'object' ? item.domain : item) === domain
  );
  
  if (index > -1) {
    currentSettings.greylistedDomains.splice(index, 1);
    await saveSettings({ greylistedDomains: currentSettings.greylistedDomains });
    renderGreylistList(currentSettings.greylistedDomains);
    await cleanupDomainIfTabsClosed(domain);
  }
}

// Show/Hide premium settings screen overlay
function togglePremiumOverlay(isPremium) {
  const overlay = document.getElementById('premium-lock-overlay');
  if (isPremium) {
    overlay.classList.add('hidden');
  } else {
    overlay.classList.remove('hidden');
  }
}

// Advanced Data management and statistics
function setupDataManagement() {
  // Export Settings
  const btnExport = document.getElementById('btn-export-settings');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSettings, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "cookie_guardian_settings.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // Import Settings
  const fileInput = document.getElementById('file-import-input');
  const btnImport = document.getElementById('btn-import-settings');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          // Simple validation check
          if (imported && typeof imported === 'object' && 'enabled' in imported) {
            await saveSettings(imported);
            alert("Settings imported successfully!");
            window.location.reload();
          } else {
            alert("Invalid configuration file format.");
          }
        } catch (err) {
          alert("Error parsing the file.");
        }
      };
      reader.readAsText(file);
    });
  }

  // Reset to Defaults (keeps stats/lists)
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  if (btnResetDefaults) {
    btnResetDefaults.addEventListener('click', async () => {
      if (confirm("Are you sure you want to reset all settings to defaults? Your whitelists, greylists, and stats will be preserved.")) {
        await resetSettings(false);
        window.location.reload();
      }
    });
  }

  // Reset Statistics Button
  const btnResetStats = document.getElementById('btn-reset-stats-opt');
  if (btnResetStats) {
    btnResetStats.addEventListener('click', async () => {
      if (confirm("Are you sure you want to clear all statistics?")) {
        const resetStats = {
          cleanedToday: 0,
          totalDeleted: 0,
          whitelistedCount: currentSettings.whitelistedDomains.length,
          trackersBlocked: 0,
          lastCleanedDate: currentSettings.stats.lastCleanedDate,
          dailyHistory: currentSettings.stats.dailyHistory || {}
        };
        await saveSettings({ stats: resetStats });
        const totalDeletedEl = document.getElementById('stats-total-deleted');
        if (totalDeletedEl) totalDeletedEl.textContent = '0';
        const cleanedTodayEl = document.getElementById('stats-cleaned-today');
        if (cleanedTodayEl) cleanedTodayEl.textContent = '0';
        const statsTrackersBlocked = document.getElementById('stats-trackers-blocked');
        if (statsTrackersBlocked) statsTrackersBlocked.textContent = '0';
        const statsBandwidthSaved = document.getElementById('stats-bandwidth-saved');
        if (statsBandwidthSaved) statsBandwidthSaved.textContent = '0 KB';
        alert("Statistics reset!");
      }
    });
  }

  // Unlock Premium buttons trigger (overlay)
  const btnUnlockPremium = document.getElementById('btn-unlock-premium');
  if (btnUnlockPremium) {
    btnUnlockPremium.addEventListener('click', async () => {
      currentSettings.isPremium = true;
      await saveSettings({ isPremium: true });
      togglePremiumOverlay(true);
      updateWhitelistLimitBadge();
      renderPopularSites();
      alert("Cookie Guardian PRO Activated! Premium options are now unlocked.");
    });
  }

  const btnPurchasePro = document.getElementById('btn-purchase-pro');
  if (btnPurchasePro) {
    btnPurchasePro.addEventListener('click', async () => {
      currentSettings.isPremium = true;
      await saveSettings({ isPremium: true });
      togglePremiumOverlay(true);
      updateWhitelistLimitBadge();
      renderPopularSites();
      alert("Cookie Guardian PRO Activated! Premium options are now unlocked.");
    });
  }

  const btnClosePremium = document.getElementById('btn-close-premium');
  if (btnClosePremium) {
    btnClosePremium.addEventListener('click', () => {
      togglePremiumOverlay(true);
    });
  }

  // Clear Logs Button
  const btnClearLog = document.getElementById('btn-clear-log');
  if (btnClearLog) {
    btnClearLog.addEventListener('click', async () => {
      const isTr = (currentSettings.language === 'tr');
      if (confirm(isTr ? "Çerez silme geçmişini temizlemek istediğinize emin misiniz?" : "Are you sure you want to clear your cookie deletion history log?")) {
        await saveSettings({ deletionLog: [] });
        currentSettings.deletionLog = [];
        renderDetailedDeletionLog([]);
        alert(isTr ? "Silme geçmişi temizlendi!" : "History log cleared!");
      }
    });
  }
}

function setupDynamicVisibilityToggles() {
  // Aging state toggles inputs visibility
  const agingToggle = document.getElementById('setting-enable-aging');
  agingToggle.addEventListener('change', (e) => {
    toggleSectionVisibility('row-max-age', e.target.checked);
  });

  // Schedule state toggles interval select visibility
  const scheduleToggle = document.getElementById('setting-enable-schedule');
  scheduleToggle.addEventListener('change', (e) => {
    toggleSectionVisibility('row-schedule-interval', e.target.checked);
  });

  // Greylist auto-expire toggles days input visibility
  const greylistToggle = document.getElementById('setting-auto-expire-greylist');
  greylistToggle.addEventListener('change', (e) => {
    toggleSectionVisibility('row-greylist-expire', e.target.checked);
  });
}

// Listen to storage changes to update lists dynamically (real-time sync with popup)
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local') {
    currentSettings = await getSettings();
    renderWhitelistPremium(currentSettings.whitelistedDomains);
    renderGreylistList(currentSettings.greylistedDomains);
    renderPopularSites();
    updateWhitelistLimitBadge();
    updateWhitelistedStatsCount(currentSettings.whitelistedDomains.length);
    togglePremiumOverlay(currentSettings.isPremium);
    
    // Update stats in real-time
    const statsTotalDeleted = document.getElementById('stats-total-deleted');
    if (statsTotalDeleted) statsTotalDeleted.textContent = currentSettings.stats.totalDeleted;
    const statsCleanedToday = document.getElementById('stats-cleaned-today');
    if (statsCleanedToday) statsCleanedToday.textContent = currentSettings.stats.cleanedToday;
    
    const trackersBlockedVal = currentSettings.stats.trackersBlocked || 0;
    const statsTrackersBlocked = document.getElementById('stats-trackers-blocked');
    if (statsTrackersBlocked) statsTrackersBlocked.textContent = trackersBlockedVal;
    
    const bandwidthSavedVal = trackersBlockedVal * 12;
    const statsBandwidthSaved = document.getElementById('stats-bandwidth-saved');
    if (statsBandwidthSaved) {
      if (bandwidthSavedVal >= 1024) {
        statsBandwidthSaved.textContent = (bandwidthSavedVal / 1024).toFixed(1) + ' MB';
      } else {
        statsBandwidthSaved.textContent = bandwidthSavedVal + ' KB';
      }
    }
    
    renderLast7DaysChart(currentSettings.stats.dailyHistory);
    renderDetailedDeletionLog(currentSettings.deletionLog);
  }
});
