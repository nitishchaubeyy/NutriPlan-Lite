// ================================================================
// app.js — App entry point, toast notifications, global wiring
// NutriPlan-Lite
// ================================================================

// ── Toast notification system ─────────────────────────────────────
window.Toast = (() => {
  function show(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `app-toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-msg"></span>
      <button class="toast-close" type="button" aria-label="Dismiss">×</button>`;
    toast.querySelector('.toast-msg').textContent = message;
    toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));
    container.appendChild(toast);
    setTimeout(() => dismiss(toast), duration);
    return toast;
  }

  function dismiss(toast) {
    if (!toast || toast.classList.contains('toast-leaving')) return;
    toast.classList.add('toast-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  return { show };
})();

// ── Global App controller ─────────────────────────────────────────
window.App = (() => {

  function refresh() {
    Dashboard.refresh();
  }

  async function init() {
    if (window.Storage && window.Storage.initDB) {
      await window.Storage.initDB();
    }
    // Perform full sync from backend if the user is authenticated
    const authenticated = window.Session
      ? window.Session.isAuthenticated()
      : (window.Auth && window.Auth.isAuthenticated());

    if (authenticated && window.Storage && window.Storage.sync) {
      await window.Storage.sync();
    } else if (!authenticated) {
      // Not authenticated — show demo mode banner immediately
      // (Storage.sync handles this when called with no token)
      if (window.Storage && window.Storage.sync) {
        await window.Storage.sync(); // will show banner
      }
    }

    // Initialise all modules
    await Tracker.init();
    Hydration.init();
    AI.init();
    Dashboard.initProfilePanel();
    if (window.WeeklyReport) window.WeeklyReport.init();
    if (window.Onboarding) window.Onboarding.init();

    // Initial UI render
    refresh();

    // Bottom nav / mobile navigation
    document.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', e => {
        const target = link.dataset.nav;
        const section = document.getElementById(target);
        if (section) {
          e.preventDefault();
          section.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

  }

  return { init, refresh };
})();

// ── Boot ──────────────────────────────────────────────────────────
window.addEventListener('pageLoaded', async (e) => {
  const page = e.detail.page;

  // Always render auth header widgets
  if (window.Auth) window.Auth.renderAuthWidgets();

  if (page === 'dashboard') {
    if (window.Storage && window.Storage.initDB) {
      await window.Storage.initDB();
    }
    // Sync from backend on dashboard load
    if (window.Storage && window.Storage.sync) {
      await window.Storage.sync();
    }

    await Tracker.init();
    Hydration.init();
    Dashboard.initProfilePanel();
    if (window.WeeklyReport) window.WeeklyReport.init();
    if (window.Onboarding) window.Onboarding.init();

    App.refresh();
  } else if (page === 'ai-helper') {
    if (window.AI) AI.initMainChat();
  } else if (page === 'grocery') {
    if (window.Grocery) window.Grocery.init();
  } else if (page === 'reminders') {
    if (window.Reminders) window.Reminders.init();
  }

  // Global theme toggle (always available in headers)
  const themeBtns = document.querySelectorAll('.theme-btn, #theme-toggle');
  themeBtns.forEach(themeBtn => {
    if (!themeBtn.dataset.initialized) {
      themeBtn.dataset.initialized = 'true';
      themeBtn.addEventListener('click', () => {
        const newTheme = window.ThemeService.toggleTheme();
        document.querySelectorAll('.theme-btn, #theme-toggle').forEach(btn => {
          btn.textContent = newTheme === 'light' ? '🌙' : '☀️';
        });
      });
      themeBtn.textContent = window.ThemeService.getTheme() === 'light' ? '🌙' : '☀️';
    }
  });
});

// ── PWA & Service Worker Registration ──────────────────────────────
let deferredPrompt;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.error('ServiceWorker registration failed: ', err);
      });
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show the custom install panel in the dashboard
  const installPanel = document.getElementById('pwa-install-panel');
  if (installPanel) {
    installPanel.classList.remove('hidden');
  }
});

// Handle custom install button click (use Event Delegation since it's in a template)
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'btn-install-pwa') {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    deferredPrompt = null;
    
    const installPanel = document.getElementById('pwa-install-panel');
    if (installPanel) installPanel.classList.add('hidden');
  }
});

window.addEventListener('appinstalled', () => {
  console.log('NutriPlan Lite was installed securely.');
  const installPanel = document.getElementById('pwa-install-panel');
  if (installPanel) installPanel.classList.add('hidden');
});