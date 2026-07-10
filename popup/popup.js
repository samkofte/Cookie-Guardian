/* popup/popup.js */
import { getSettings, saveSettings, checkDailyStatsReset } from '../js/settings.js';
import { getDomainFromUrl, getCookiesForDomain, cleanCookiesForDomain, isDomainMatched } from '../js/cookieManager.js';
import { applyTranslations } from '../js/i18n.js';

let currentTabDomain = '';
let currentCookiesList = [];
let currentSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
  await initPopup();
  setupEventListeners();
  setupCookieEditor();
});

// Load settings and current tab state
async function initPopup() {
  // 1. Get current settings
  currentSettings = await getSettings();
  applyTranslations(document, currentSettings.language || 'en');
  
  // 2. Set Master Toggle
  const masterToggle = document.getElementById('master-toggle');
  masterToggle.checked = currentSettings.enabled;
  updateStatusCard(currentSettings.enabled);
  
  // 3. Load daily stats and lifetime stats
  const stats = await checkDailyStatsReset();
  document.getElementById('cleaned-today-count').textContent = stats.cleanedToday;
  document.getElementById('total-deleted-count').textContent = stats.totalDeleted;
  document.getElementById('whitelisted-count').textContent = currentSettings.whitelistedDomains.length;
  
  // 4. Handle active tab
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0] && tabs[0].url) {
      const domain = getDomainFromUrl(tabs[0].url);
      if (domain) {
        currentTabDomain = domain;
        document.getElementById('current-domain').textContent = domain;
        
        // Load cookies for current tab
        await refreshCookieList();
        
        // Update Whitelist / Greylist button visual active states
        updateListButtonsState(currentSettings.whitelistedDomains, currentSettings.greylistedDomains);
      } else {
        showNoActiveTab();
      }
    } else {
      showNoActiveTab();
    }
  });
  
  // 5. Update Premium UI
  updatePremiumUI(currentSettings.isPremium, currentSettings.whitelistedDomains.length);
}

function showNoActiveTab() {
  const isTr = (currentSettings.language === 'tr');
  document.getElementById('current-domain').textContent = isTr ? 'Aktif Sekme Yok' : 'No Active Website';
  document.getElementById('current-cookie-count').textContent = isTr ? '0 çerez' : '0 cookies';
  document.getElementById('btn-whitelist').disabled = true;
  document.getElementById('btn-greylist').disabled = true;
  document.getElementById('btn-clean').disabled = true;
}

// Refresh cookie details for current domain
async function refreshCookieList() {
  if (!currentTabDomain) return;
  
  const isTr = (currentSettings.language === 'tr');
  currentCookiesList = await getCookiesForDomain(currentTabDomain);
  
  const cookieLabel = isTr ? 'çerez bulundu' : `cookie${currentCookiesList.length === 1 ? '' : 's'}`;
  document.getElementById('current-cookie-count').textContent = `${currentCookiesList.length} ${cookieLabel}`;
  
  // Reset search input
  const searchInput = document.getElementById('editor-search-input');
  if (searchInput) searchInput.value = '';
  
  // Populate collapsible list
  const listUl = document.getElementById('cookie-list-ul');
  listUl.innerHTML = '';
  
  if (currentCookiesList.length === 0) {
    const li = document.createElement('li');
    li.textContent = isTr ? 'Bu sitede çerez bulunamadı' : 'No cookies found on this domain';
    li.style.fontSize = '11px';
    li.style.color = 'var(--text-muted)';
    li.style.padding = '8px';
    li.style.textAlign = 'center';
    listUl.appendChild(li);
  } else {
    currentCookiesList.forEach(cookie => {
      const li = document.createElement('li');
      li.className = 'cookie-card';
      li.style.display = 'flex';
      li.style.flexDirection = 'column';
      li.style.background = 'rgba(255, 255, 255, 0.02)';
      li.style.border = '1px solid var(--border-color)';
      li.style.borderRadius = '6px';
      li.style.padding = '6px 8px';
      li.style.marginBottom = '2px';
      
      // Header (Collapsed state)
      const header = document.createElement('div');
      header.className = 'cookie-card-header';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.cursor = 'pointer';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'cookie-card-name';
      nameSpan.textContent = cookie.name;
      nameSpan.title = cookie.name;
      nameSpan.style.fontWeight = '600';
      nameSpan.style.fontSize = '11px';
      nameSpan.style.whiteSpace = 'nowrap';
      nameSpan.style.overflow = 'hidden';
      nameSpan.style.textOverflow = 'ellipsis';
      nameSpan.style.maxWidth = '160px';
      nameSpan.style.color = 'var(--text-main)';
      
      const valSpan = document.createElement('span');
      valSpan.className = 'cookie-card-val-preview';
      valSpan.textContent = cookie.value;
      valSpan.title = cookie.value;
      valSpan.style.fontSize = '10px';
      valSpan.style.color = 'var(--color-primary)';
      valSpan.style.whiteSpace = 'nowrap';
      valSpan.style.overflow = 'hidden';
      valSpan.style.textOverflow = 'ellipsis';
      valSpan.style.maxWidth = '100px';
      
      header.appendChild(nameSpan);
      header.appendChild(valSpan);
      
      // Body (Expanded state - Form Editor)
      const body = document.createElement('div');
      body.className = 'cookie-card-body';
      body.style.display = 'none';
      body.style.flexDirection = 'column';
      body.style.gap = '6px';
      body.style.marginTop = '8px';
      body.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
      body.style.paddingTop = '6px';
      
      // Value Textarea
      const valWrapper = document.createElement('div');
      valWrapper.style.display = 'flex';
      valWrapper.style.flexDirection = 'column';
      valWrapper.style.gap = '2px';
      const valLabel = document.createElement('span');
      valLabel.textContent = 'Value';
      valLabel.style.fontSize = '9px';
      valLabel.style.color = 'var(--text-muted)';
      const valArea = document.createElement('textarea');
      valArea.className = 'edit-cookie-value';
      valArea.value = cookie.value;
      valArea.style.width = '100%';
      valArea.style.height = '40px';
      valArea.style.padding = '4px';
      valArea.style.border = '1px solid var(--border-color)';
      valArea.style.background = 'var(--bg-main)';
      valArea.style.color = 'var(--text-main)';
      valArea.style.fontSize = '10px';
      valArea.style.borderRadius = '4px';
      valArea.style.resize = 'vertical';
      valWrapper.appendChild(valLabel);
      valWrapper.appendChild(valArea);
      
      // Path and SameSite Row
      const row1 = document.createElement('div');
      row1.style.display = 'grid';
      row1.style.gridTemplateColumns = '1fr 1fr';
      row1.style.gap = '6px';
      
      const pathWrapper = document.createElement('div');
      pathWrapper.style.display = 'flex';
      pathWrapper.style.flexDirection = 'column';
      pathWrapper.style.gap = '2px';
      const pathLabel = document.createElement('span');
      pathLabel.textContent = 'Path';
      pathLabel.style.fontSize = '9px';
      pathLabel.style.color = 'var(--text-muted)';
      const pathInput = document.createElement('input');
      pathInput.type = 'text';
      pathInput.className = 'edit-cookie-path';
      pathInput.value = cookie.path;
      pathInput.style.padding = '4px';
      pathInput.style.border = '1px solid var(--border-color)';
      pathInput.style.background = 'var(--bg-main)';
      pathInput.style.color = 'var(--text-main)';
      pathInput.style.fontSize = '10px';
      pathInput.style.borderRadius = '4px';
      pathWrapper.appendChild(pathLabel);
      pathWrapper.appendChild(pathInput);
      
      const sameSiteWrapper = document.createElement('div');
      sameSiteWrapper.style.display = 'flex';
      sameSiteWrapper.style.flexDirection = 'column';
      sameSiteWrapper.style.gap = '2px';
      const sameSiteLabel = document.createElement('span');
      sameSiteLabel.textContent = 'SameSite';
      sameSiteLabel.style.fontSize = '9px';
      sameSiteLabel.style.color = 'var(--text-muted)';
      const sameSiteSelect = document.createElement('select');
      sameSiteSelect.className = 'edit-cookie-samesite';
      sameSiteSelect.style.padding = '4px';
      sameSiteSelect.style.border = '1px solid var(--border-color)';
      sameSiteSelect.style.background = 'var(--bg-main)';
      sameSiteSelect.style.color = 'var(--text-main)';
      sameSiteSelect.style.fontSize = '10px';
      sameSiteSelect.style.borderRadius = '4px';
      ['unspecified', 'no_restriction', 'lax', 'strict'].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt === 'no_restriction' ? 'None' : opt.charAt(0).toUpperCase() + opt.slice(1);
        if (cookie.sameSite === opt) option.selected = true;
        sameSiteSelect.appendChild(option);
      });
      sameSiteWrapper.appendChild(sameSiteLabel);
      sameSiteWrapper.appendChild(sameSiteSelect);
      
      row1.appendChild(pathWrapper);
      row1.appendChild(sameSiteWrapper);
      
      // Checkboxes Row
      const checkboxesRow = document.createElement('div');
      checkboxesRow.style.display = 'flex';
      checkboxesRow.style.gap = '10px';
      checkboxesRow.style.fontSize = '9px';
      checkboxesRow.style.color = 'var(--text-muted)';
      
      const labelSecure = document.createElement('label');
      labelSecure.style.display = 'flex';
      labelSecure.style.alignItems = 'center';
      labelSecure.style.gap = '2px';
      const checkSecure = document.createElement('input');
      checkSecure.type = 'checkbox';
      checkSecure.className = 'edit-cookie-secure';
      checkSecure.checked = cookie.secure;
      labelSecure.appendChild(checkSecure);
      labelSecure.appendChild(document.createTextNode(' Secure'));
      
      const labelHttpOnly = document.createElement('label');
      labelHttpOnly.style.display = 'flex';
      labelHttpOnly.style.alignItems = 'center';
      labelHttpOnly.style.gap = '2px';
      const checkHttpOnly = document.createElement('input');
      checkHttpOnly.type = 'checkbox';
      checkHttpOnly.className = 'edit-cookie-httponly';
      checkHttpOnly.checked = cookie.httpOnly;
      labelHttpOnly.appendChild(checkHttpOnly);
      labelHttpOnly.appendChild(document.createTextNode(' HttpOnly'));
      
      const labelSession = document.createElement('label');
      labelSession.style.display = 'flex';
      labelSession.style.alignItems = 'center';
      labelSession.style.gap = '2px';
      const checkSession = document.createElement('input');
      checkSession.type = 'checkbox';
      checkSession.className = 'edit-cookie-session';
      checkSession.checked = cookie.session;
      labelSession.appendChild(checkSession);
      labelSession.appendChild(document.createTextNode(' Session'));
      
      checkboxesRow.appendChild(labelSecure);
      checkboxesRow.appendChild(labelHttpOnly);
      checkboxesRow.appendChild(labelSession);
      
      // Expiration Row
      const expiryWrapper = document.createElement('div');
      expiryWrapper.className = 'edit-cookie-expiry-wrapper';
      expiryWrapper.style.display = cookie.session ? 'none' : 'flex';
      expiryWrapper.style.flexDirection = 'column';
      expiryWrapper.style.gap = '2px';
      const expiryLabel = document.createElement('span');
      expiryLabel.textContent = 'Expiration';
      expiryLabel.style.fontSize = '9px';
      expiryLabel.style.color = 'var(--text-muted)';
      const expiryInput = document.createElement('input');
      expiryInput.type = 'datetime-local';
      expiryInput.className = 'edit-cookie-expiration';
      if (cookie.expirationDate) {
        const dateObj = new Date(cookie.expirationDate * 1000);
        const pad = num => String(num).padStart(2, '0');
        const localDateTimeStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
        expiryInput.value = localDateTimeStr;
      }
      expiryWrapper.appendChild(expiryLabel);
      expiryWrapper.appendChild(expiryInput);
      
      checkSession.addEventListener('change', (e) => {
        expiryWrapper.style.display = e.target.checked ? 'none' : 'flex';
      });
      
      // Actions Row
      const actionsRow = document.createElement('div');
      actionsRow.style.display = 'flex';
      actionsRow.style.justifyContent = 'flex-end';
      actionsRow.style.gap = '6px';
      actionsRow.style.marginTop = '4px';
      
      const saveBtn = document.createElement('button');
      saveBtn.className = 'upgrade-btn';
      saveBtn.textContent = isTr ? 'Kaydet' : 'Save';
      saveBtn.style.padding = '4px 10px';
      saveBtn.style.fontSize = '10px';
      saveBtn.style.fontWeight = 'bold';
      saveBtn.style.borderRadius = '4px';
      saveBtn.style.height = 'auto';
      
      const delBtn = document.createElement('button');
      delBtn.className = 'cookie-dropdown-btn';
      delBtn.textContent = isTr ? 'Sil' : 'Delete';
      delBtn.style.padding = '4px 10px';
      delBtn.style.fontSize = '10px';
      delBtn.style.borderRadius = '4px';
      delBtn.style.height = 'auto';
      delBtn.style.color = 'var(--color-danger)';
      delBtn.style.borderColor = 'rgba(239, 68, 68, 0.2)';
      
      actionsRow.appendChild(saveBtn);
      actionsRow.appendChild(delBtn);
      
      // Event: Save Cookie Changes
      saveBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const secure = checkSecure.checked;
        const cookieDetails = {
          url: 'http' + (secure ? 's' : '') + '://' + (currentTabDomain.startsWith('.') ? currentTabDomain.substring(1) : currentTabDomain) + pathInput.value,
          name: cookie.name,
          value: valArea.value,
          domain: cookie.domain,
          path: pathInput.value,
          secure: secure,
          httpOnly: checkHttpOnly.checked,
          sameSite: sameSiteSelect.value
        };
        if (!checkSession.checked && expiryInput.value) {
          cookieDetails.expirationDate = Math.round(new Date(expiryInput.value).getTime() / 1000);
        }
        await chrome.cookies.set(cookieDetails);
        await refreshCookieList();
      });
      
      // Event: Delete Cookie
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const secure = cookie.secure;
        const url = 'http' + (secure ? 's' : '') + '://' + (currentTabDomain.startsWith('.') ? currentTabDomain.substring(1) : currentTabDomain) + cookie.path;
        await chrome.cookies.remove({
          url: url,
          name: cookie.name
        });
        await refreshCookieList();
      });
      
      body.appendChild(valWrapper);
      body.appendChild(row1);
      body.appendChild(checkboxesRow);
      body.appendChild(expiryWrapper);
      body.appendChild(actionsRow);
      
      li.appendChild(header);
      li.appendChild(body);
      
      // Expand/Collapse click
      header.addEventListener('click', () => {
        const isCollapsed = body.style.display === 'none';
        
        document.querySelectorAll('.cookie-card-body').forEach(b => b.style.display = 'none');
        document.querySelectorAll('.cookie-card').forEach(c => c.style.background = 'rgba(255, 255, 255, 0.02)');
        
        if (isCollapsed) {
          body.style.display = 'flex';
          li.style.background = 'rgba(255, 255, 255, 0.05)';
        }
      });
      
      listUl.appendChild(li);
    });
  }
}

// Setup Whitelisted & Greylisted button active styles
function updateListButtonsState(whitelist, greylist) {
  const wlBtn = document.getElementById('btn-whitelist');
  const glBtn = document.getElementById('btn-greylist');
  
  const isWhitelisted = isDomainMatched(currentTabDomain, whitelist);
  const isGreylisted = isDomainMatched(currentTabDomain, greylist);
  
  if (isWhitelisted) {
    wlBtn.classList.add('active');
    wlBtn.style.backgroundColor = 'var(--color-success)';
    wlBtn.style.borderColor = 'var(--color-success)';
    wlBtn.style.color = 'var(--bg-main)';
  } else {
    wlBtn.classList.remove('active');
    wlBtn.style.backgroundColor = '';
    wlBtn.style.borderColor = '';
    wlBtn.style.color = '';
  }
  
  if (isGreylisted) {
    glBtn.classList.add('active');
    glBtn.style.backgroundColor = 'var(--color-greylist)';
    glBtn.style.borderColor = 'var(--color-greylist)';
    glBtn.style.color = 'var(--text-main)';
  } else {
    glBtn.classList.remove('active');
    glBtn.style.backgroundColor = '';
    glBtn.style.borderColor = '';
    glBtn.style.color = '';
  }
}

// Setup premium branding
function updatePremiumUI(isPremium, whitelistedCount) {
  const upgradeBtn = document.getElementById('btn-upgrade');
  const upgradeText = document.getElementById('upgrade-btn-text');
  
  if (isPremium) {
    upgradeBtn.style.background = 'linear-gradient(135deg, #10b981, #0fbfa3)';
    upgradeText.textContent = 'PRO Active';
  } else {
    upgradeBtn.style.background = '';
    upgradeText.textContent = `${whitelistedCount}/23 Upgrade`;
  }
}

// Update Protected banner based on Toggle
function updateStatusCard(enabled) {
  const card = document.getElementById('status-card');
  const title = document.getElementById('status-text');
  const desc = document.getElementById('status-desc');
  
  const isTr = (currentSettings.language === 'tr');
  
  if (enabled) {
    card.className = 'status-card active';
    title.textContent = isTr ? 'Koruma Altında' : 'Protected';
    desc.textContent = isTr ? 'Cookie Guardian aktif' : 'Cookie Guardian is active';
  } else {
    card.className = 'status-card disabled';
    title.textContent = isTr ? 'Korunmuyor' : 'Unprotected';
    desc.textContent = isTr ? 'Cookie Guardian pasif' : 'Cookie Guardian is inactive';
  }
}

// Bind button clicks
function setupEventListeners() {
  // Master switch
  document.getElementById('master-toggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await saveSettings({ enabled });
    updateStatusCard(enabled);
  });
  
  // Settings Gear
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Whitelist Button
  document.getElementById('btn-whitelist').addEventListener('click', async () => {
    if (!currentTabDomain) return;
    const settings = await getSettings();
    let whitelist = settings.whitelistedDomains;
    let greylist = settings.greylistedDomains;
    
    const index = whitelist.findIndex(item => (typeof item === 'object' ? item.domain : item) === currentTabDomain);
    if (index > -1) {
      whitelist.splice(index, 1);
    } else {
      // Check Free Limit of 23 sites
      if (!settings.isPremium && whitelist.length >= 23) {
        alert("Free limit of 23 whitelisted sites reached. Please upgrade to PRO to whitelist unlimited sites!");
        return;
      }
      whitelist.push({ domain: currentTabDomain, addedAt: Date.now() });
      // Remove from greylist if adding to whitelist
      const glIndex = greylist.findIndex(item => (typeof item === 'object' ? item.domain : item) === currentTabDomain);
      if (glIndex > -1) greylist.splice(glIndex, 1);
    }
    
    await saveSettings({ whitelistedDomains: whitelist, greylistedDomains: greylist });
    updateListButtonsState(whitelist, greylist);
    document.getElementById('whitelisted-count').textContent = whitelist.length;
    updatePremiumUI(settings.isPremium, whitelist.length);
  });
  
  // Greylist Button
  document.getElementById('btn-greylist').addEventListener('click', async () => {
    if (!currentTabDomain) return;
    const settings = await getSettings();
    let whitelist = settings.whitelistedDomains;
    let greylist = settings.greylistedDomains;
    
    const index = greylist.findIndex(item => (typeof item === 'object' ? item.domain : item) === currentTabDomain);
    if (index > -1) {
      greylist.splice(index, 1);
    } else {
      greylist.push({ domain: currentTabDomain, addedAt: Date.now() });
      // Remove from whitelist if adding to greylist
      const wlIndex = whitelist.findIndex(item => (typeof item === 'object' ? item.domain : item) === currentTabDomain);
      if (wlIndex > -1) whitelist.splice(wlIndex, 1);
    }
    
    await saveSettings({ whitelistedDomains: whitelist, greylistedDomains: greylist });
    updateListButtonsState(whitelist, greylist);
    document.getElementById('whitelisted-count').textContent = whitelist.length;
    updatePremiumUI(settings.isPremium, whitelist.length);
  });
  
  // Manual Clean Button for site
  document.getElementById('btn-clean').addEventListener('click', async () => {
    if (!currentTabDomain) return;
    const cleaned = await cleanCookiesForDomain(currentTabDomain, true); // Manual clean overrides whitelist
    await refreshCookieList();
    
    // Refresh stats
    const settings = await getSettings();
    document.getElementById('cleaned-today-count').textContent = settings.stats.cleanedToday;
    document.getElementById('total-deleted-count').textContent = settings.stats.totalDeleted;
  });
  
  // Dropdown triggering
  const dropdownTrigger = document.getElementById('cookie-dropdown-trigger');
  dropdownTrigger.addEventListener('click', () => {
    const listContainer = document.getElementById('cookie-list-container');
    const isClosed = listContainer.style.display === 'none';
    if (isClosed) {
      listContainer.style.display = 'block';
      dropdownTrigger.classList.add('open');
    } else {
      listContainer.style.display = 'none';
      dropdownTrigger.classList.remove('open');
    }
  });
  
  // Reset Stats
  document.getElementById('btn-clear-stats').addEventListener('click', async () => {
    const settings = await getSettings();
    const resetStats = {
      cleanedToday: 0,
      totalDeleted: 0,
      whitelistedCount: settings.stats.whitelistedCount,
      lastCleanedDate: settings.stats.lastCleanedDate
    };
    await saveSettings({ stats: resetStats });
    document.getElementById('cleaned-today-count').textContent = '0';
    document.getElementById('total-deleted-count').textContent = '0';
  });
  
  // Upgrade Button (PRO simulation)
  document.getElementById('btn-upgrade').addEventListener('click', async () => {
    const settings = await getSettings();
    const nextPremiumState = !settings.isPremium;
    await saveSettings({ isPremium: nextPremiumState });
    updatePremiumUI(nextPremiumState, settings.whitelistedDomains.length);
    alert(nextPremiumState ? "Cookie Guardian PRO Activated! All Premium Settings unlocked." : "Premium Subscription cancelled.");
  });

  // Restore Button
  document.getElementById('btn-restore').addEventListener('click', async () => {
    const settings = await getSettings();
    if (!settings.isPremium) {
      await saveSettings({ isPremium: true });
      updatePremiumUI(true, settings.whitelistedDomains.length);
      alert("Pro subscription successfully restored!");
    } else {
      alert("Pro features are already active.");
    }
  });
}

// Setup Cookie Editor (Add / Import / Export / Search / Delete All)
function setupCookieEditor() {
  const panelAdd = document.getElementById('editor-panel-add');
  const panelImport = document.getElementById('editor-panel-import');
  const panelExport = document.getElementById('editor-panel-export');
  
  function hideAllPanels() {
    panelAdd.style.display = 'none';
    panelImport.style.display = 'none';
    panelExport.style.display = 'none';
  }
  
  // Add Panel Show
  document.getElementById('btn-editor-add').addEventListener('click', () => {
    const isVisible = panelAdd.style.display === 'block';
    hideAllPanels();
    if (!isVisible) {
      panelAdd.style.display = 'block';
      document.getElementById('add-cookie-name').value = '';
      document.getElementById('add-cookie-value').value = '';
      document.getElementById('add-cookie-path').value = '/';
      document.getElementById('add-cookie-secure').checked = false;
      document.getElementById('add-cookie-httponly').checked = false;
      document.getElementById('add-cookie-session').checked = true;
      document.getElementById('add-cookie-expiry-row').style.display = 'none';
    }
  });
  
  // Expiry toggle based on Session checkbox
  document.getElementById('add-cookie-session').addEventListener('change', (e) => {
    document.getElementById('add-cookie-expiry-row').style.display = e.target.checked ? 'none' : 'block';
  });
  
  // Save Add Cookie
  document.getElementById('btn-add-save').addEventListener('click', async () => {
    const name = document.getElementById('add-cookie-name').value.trim();
    const value = document.getElementById('add-cookie-value').value;
    const path = document.getElementById('add-cookie-path').value.trim();
    const secure = document.getElementById('add-cookie-secure').checked;
    const httpOnly = document.getElementById('add-cookie-httponly').checked;
    const session = document.getElementById('add-cookie-session').checked;
    
    if (!name) {
      alert("Name is required");
      return;
    }
    
    const cookieDetails = {
      url: 'http' + (secure ? 's' : '') + '://' + (currentTabDomain.startsWith('.') ? currentTabDomain.substring(1) : currentTabDomain) + path,
      name: name,
      value: value,
      domain: currentTabDomain,
      path: path,
      secure: secure,
      httpOnly: httpOnly
    };
    
    if (!session) {
      const expVal = document.getElementById('add-cookie-expiration').value;
      if (expVal) {
        cookieDetails.expirationDate = Math.round(new Date(expVal).getTime() / 1000);
      }
    }
    
    await chrome.cookies.set(cookieDetails);
    hideAllPanels();
    await refreshCookieList();
  });
  
  document.getElementById('btn-add-cancel').addEventListener('click', hideAllPanels);
  
  // Import Panel Show
  document.getElementById('btn-editor-import').addEventListener('click', () => {
    const isVisible = panelImport.style.display === 'block';
    hideAllPanels();
    if (!isVisible) {
      panelImport.style.display = 'block';
      document.getElementById('import-cookie-json').value = '';
    }
  });
  
  // Save Import Cookies
  document.getElementById('btn-import-save').addEventListener('click', async () => {
    const jsonStr = document.getElementById('import-cookie-json').value.trim();
    if (!jsonStr) return;
    
    try {
      const cookies = JSON.parse(jsonStr);
      const toImport = Array.isArray(cookies) ? cookies : [cookies];
      
      for (const c of toImport) {
        if (!c.name) continue;
        const path = c.path || '/';
        const secure = !!c.secure;
        const cookieDetails = {
          url: 'http' + (secure ? 's' : '') + '://' + (currentTabDomain.startsWith('.') ? currentTabDomain.substring(1) : currentTabDomain) + path,
          name: c.name,
          value: c.value || '',
          domain: currentTabDomain,
          path: path,
          secure: secure,
          httpOnly: !!c.httpOnly
        };
        if (c.expirationDate) {
          cookieDetails.expirationDate = c.expirationDate;
        }
        await chrome.cookies.set(cookieDetails);
      }
      
      hideAllPanels();
      await refreshCookieList();
      alert("Cookies imported successfully!");
    } catch (err) {
      alert("Error parsing JSON: " + err.message);
    }
  });
  
  document.getElementById('btn-import-cancel').addEventListener('click', hideAllPanels);
  
  // Export Panel Show
  document.getElementById('btn-editor-export').addEventListener('click', () => {
    const isVisible = panelExport.style.display === 'block';
    hideAllPanels();
    if (!isVisible) {
      panelExport.style.display = 'block';
      document.getElementById('export-cookie-json').value = JSON.stringify(currentCookiesList, null, 2);
    }
  });
  
  // Copy Export Cookies
  document.getElementById('btn-export-copy').addEventListener('click', () => {
    const textarea = document.getElementById('export-cookie-json');
    textarea.select();
    document.execCommand('copy');
    alert("Cookies copied to clipboard!");
  });
  
  document.getElementById('btn-export-close').addEventListener('click', hideAllPanels);
  
  // Search filtering
  document.getElementById('editor-search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.cookie-card');
    cards.forEach(card => {
      const name = card.querySelector('.cookie-card-name').textContent.toLowerCase();
      if (name.includes(query)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
  
  // Delete All Cookies
  document.getElementById('btn-editor-delete-all').addEventListener('click', async () => {
    if (currentCookiesList.length === 0) return;
    const isTr = (currentSettings.language === 'tr');
    if (confirm(isTr ? "Bu sitedeki tüm çerezleri silmek istediğinize emin misiniz?" : "Are you sure you want to delete all cookies for this domain?")) {
      for (const cookie of currentCookiesList) {
        const secure = cookie.secure;
        const url = 'http' + (secure ? 's' : '') + '://' + (currentTabDomain.startsWith('.') ? currentTabDomain.substring(1) : currentTabDomain) + cookie.path;
        await chrome.cookies.remove({
          url: url,
          name: cookie.name
        });
      }
      await refreshCookieList();
    }
  });
}
