/* js/content.js */

// Common text patterns for cookie buttons (Accept/Allow)
const ACCEPT_TEXT_PATTERNS = [
  'accept', 'allow', 'agree', 'consent', 'kabul', 'izin', 'okey', 'ok',
  'got it', 'understand', 'everything', 'all cookies', 'tümünü', 'hepsini',
  'accept all', 'allow all', 'kabul et', 'tümüne izin ver', 'anladım'
];

// Selectors for elements likely to be cookie banners
const BANNER_SELECTORS = [
  '[id*="cookie" i]', '[id*="gdpr" i]', '[id*="consent" i]', '[id*="notice" i]',
  '[class*="cookie" i]', '[class*="gdpr" i]', '[class*="consent" i]', '[class*="notice" i]',
  '[class*="banner" i]', '[id*="banner" i]'
];

async function handleCookieBanners() {
  // Query settings first from local storage
  const settings = await new Promise((resolve) => {
    chrome.storage.local.get({
      enabled: true,
      autoAcceptCookies: false
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
  BANNER_SELECTORS.forEach(selector => {
    try {
      const banners = document.querySelectorAll(selector);
      banners.forEach(banner => {
        // Skip small containers or body itself
        if (banner === document.body || banner.offsetWidth < 50 || banner.offsetHeight < 20) {
          return;
        }

        // Try to find click buttons inside
        const buttons = banner.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
        let clicked = false;

        buttons.forEach(btn => {
          if (clicked) return;
          const text = (btn.textContent || btn.value || '').trim().toLowerCase();
          
          // Match accept patterns
          const matchesAccept = ACCEPT_TEXT_PATTERNS.some(pat => text === pat || text.includes(' ' + pat) || text.startsWith(pat));
          
          if (matchesAccept) {
            btn.click();
            console.log("Cookie Guardian automatically dismissed banner button:", text);
            clicked = true;
          }
        });

        // Fallback: If banner remains visible, hide it to clean up page UI
        if (!clicked && isVisible(banner)) {
          banner.style.setProperty('display', 'none', 'important');
        }
      });
    } catch (e) {
      // ignore selector errors
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
