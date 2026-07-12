/* js/content.js */

// Common text patterns for cookie buttons (Accept/Allow)
const ACCEPT_TEXT_PATTERNS = [
  'accept', 'allow', 'agree', 'consent', 'kabul', 'izin', 'okey', 'ok',
  'got it', 'understand', 'everything', 'all cookies', 'tümünü', 'hepsini',
  'accept all', 'allow all', 'kabul et', 'tümüne izin ver', 'anladım',
  'kabul ediyorum', 'kabul ediyoruz', 'tümünü kabul et', 'tümünü kabul ediyorum',
  'tüm çerezleri kabul et', 'çerezleri kabul et', 'accept cookies', 'allow cookies',
  'agree and proceed', 'agree & proceed', 'accept & close', 'accept and close'
];

// Elements that might act as cookie banners or popups
const BANNER_SELECTORS = [
  '[id*="cookie" i]', '[id*="gdpr" i]', '[id*="consent" i]', '[id*="notice" i]',
  '[class*="cookie" i]', '[class*="gdpr" i]', '[class*="consent" i]', '[class*="notice" i]',
  '[class*="banner" i]', '[id*="banner" i]', '[class*="onetrust" i]', '[id*="onetrust" i]',
  '[class*="modal" i]', '[id*="modal" i]', '[class*="popup" i]', '[id*="popup" i]'
];

async function handleCookieBanners() {
  // Query settings first from local storage
  const settings = await new Promise((resolve) => {
    chrome.storage.local.get({
      enabled: true,
      autoAcceptCookies: true // True by default
    }, (res) => resolve(res));
  });

  if (!settings.enabled || !settings.autoAcceptCookies) return;

  // Run banner solver
  const observer = new MutationObserver(() => {
    dismissBanners();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  dismissBanners();
}

function dismissBanners() {
  // 1. Broad scan: Check all buttons on the page for cookie acceptance keywords
  try {
    const allButtons = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
    allButtons.forEach(btn => {
      const text = (btn.textContent || btn.value || '').trim().toLowerCase();
      if (!text) return;
      
      // If the button has an exact match or clear match for cookie acceptance
      const matchesAccept = ACCEPT_TEXT_PATTERNS.some(pat => {
        return text === pat || text === `[${pat}]` || text.includes('accept all') || text.includes('kabul et') || text.includes('kabul ediyorum');
      });
      
      if (matchesAccept) {
        // Double check context to avoid false positives (check if parent has cookie/privacy text)
        let parent = btn.parentElement;
        let isCookieContext = false;
        let depth = 0;
        while (parent && depth < 5) {
          const parentText = (parent.textContent || '').toLowerCase();
          const parentClassId = ((parent.className || '') + ' ' + (parent.id || '')).toLowerCase();
          if (
            parentText.includes('cookie') || parentText.includes('çerez') || 
            parentText.includes('gdpr') || parentText.includes('consent') || 
            parentText.includes('gizlilik') || parentText.includes('privacy') ||
            parentClassId.includes('cookie') || parentClassId.includes('gdpr') ||
            parentClassId.includes('consent') || parentClassId.includes('banner')
          ) {
            isCookieContext = true;
            break;
          }
          parent = parent.parentElement;
          depth++;
        }
        
        if (isCookieContext) {
          btn.click();
          console.log("Cookie Guardian broad scan clicked button:", text);
        }
      }
    });
  } catch (e) {
    console.error("Error in broad button scan:", e);
  }

  // 2. Targeted scan: Check elements matching selectors and hide them if not clicked
  BANNER_SELECTORS.forEach(selector => {
    try {
      const banners = document.querySelectorAll(selector);
      banners.forEach(banner => {
        if (banner === document.body || banner.offsetWidth < 50 || banner.offsetHeight < 20) {
          return;
        }

        // Try to click buttons inside matching banner containers
        const buttons = banner.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
        let clicked = false;

        buttons.forEach(btn => {
          if (clicked) return;
          const text = (btn.textContent || btn.value || '').trim().toLowerCase();
          if (!text) return;
          
          const matchesAccept = ACCEPT_TEXT_PATTERNS.some(pat => text === pat || text.includes(pat));
          
          if (matchesAccept) {
            btn.click();
            console.log("Cookie Guardian clicked banner button:", text);
            clicked = true;
          }
        });

        // If banner is still visible after scan, hide it to clean up the page view
        if (isVisible(banner)) {
          // Check if it looks like a modal banner (z-index, fixed position, etc.)
          const style = window.getComputedStyle(banner);
          if (style.position === 'fixed' || style.position === 'absolute' || parseInt(style.zIndex, 10) > 100) {
            banner.style.setProperty('display', 'none', 'important');
            console.log("Cookie Guardian hid banner element:", selector);
          }
        }
      });
    } catch (e) {
      // ignore
    }
  });
}

function isVisible(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

// Start processing when page document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handleCookieBanners);
} else {
  handleCookieBanners();
}
