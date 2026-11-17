/**
 * ============================================================================
 * HARIT DHAROHAR V2 — PROGRESSIVE WEB APP (PWA) INSTALLER ENGINE
 * Handles Native Browser Install Prompt, iOS Guidance, and Offline Detection
 * ============================================================================
 */

let deferredPrompt = null;

export function initPWAInstaller() {
  const installButtons = document.querySelectorAll('.btn-install-pwa');
  const iosModal = document.getElementById('ios-install-modal');
  const offlineBanner = document.getElementById('offline-banner');

  // 1. Check if running in standalone PWA mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;

  if (isStandalone) {
    console.log('[PWA] Harit Dharohar is currently running in Standalone App Mode.');
    installButtons.forEach(btn => {
      btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>App Installed</span>';
      btn.style.opacity = '0.7';
      btn.disabled = true;
    });
  }

  // 2. Capture Chrome / Chromium beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt event captured. Ready to trigger native install.');

    installButtons.forEach(btn => {
      btn.classList.remove('hidden');
      btn.onclick = () => triggerInstallFlow();
    });
  });

  // 3. Listen for successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Harit Dharohar installed successfully!');
    deferredPrompt = null;
    installButtons.forEach(btn => {
      btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Installed</span>';
      btn.disabled = true;
    });
    if (window.showToast) {
      window.showToast('Harit Dharohar PWA installed on your device!');
    }
  });

  // 4. Online / Offline Network State Listeners
  function updateOnlineStatus() {
    if (navigator.onLine) {
      if (offlineBanner) offlineBanner.classList.remove('active');
      const dot = document.querySelector('.pulse-dot');
      if (dot) dot.classList.remove('offline');
      const statusText = document.getElementById('topbar-device-text');
      if (statusText) statusText.textContent = 'Node Online';
    } else {
      if (offlineBanner) offlineBanner.classList.add('active');
      const dot = document.querySelector('.pulse-dot');
      if (dot) dot.classList.add('offline');
      const statusText = document.getElementById('topbar-device-text');
      if (statusText) statusText.textContent = 'Offline (Cached)';
      if (window.showToast) {
        window.showToast('Offline Mode Active: Telemetry loaded from local cache.');
      }
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // 5. Trigger Installation Flow
  async function triggerInstallFlow() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Install prompt outcome: ${outcome}`);
      deferredPrompt = null;
    } else {
      // Check if iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        if (iosModal) iosModal.classList.add('active');
      } else {
        alert('To install Harit Dharohar V2:\n• On Chrome: Click the Install icon in the address bar (top right)\n• On Mobile: Open browser menu (⋮) and tap "Install app" or "Add to Home Screen".');
      }
    }
  }

  // 6. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('[ServiceWorker] Registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.warn('[ServiceWorker] Registration failed:', error);
        });
    });
  }
}
