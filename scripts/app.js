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

    // Dark/light theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      const settings = Storage.getSettings();
      if (settings.theme === 'light') document.body.classList.add('light-mode');
      themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        Storage.saveSettings({ theme: isLight ? 'light' : 'dark' });
        themeBtn.textContent = isLight ? '🌙' : '☀️';
      });
      themeBtn.textContent = settings.theme === 'light' ? '🌙' : '☀️';
    }
  }

  return { init, refresh };
})();

// ── Boot ──────────────────────────────────────────────────────────
window.addEventListener('pageLoaded', async (e) => {
  const page = e.detail.page;

  // Always render auth header widgets
  if (window.Auth) window.Auth.renderAuthWidgets();

  if (page === 'dashboard') {
    // Sync from backend on dashboard load
    if (window.Storage && window.Storage.sync) {
      await window.Storage.sync();
    }

    await Tracker.init();
    Hydration.init();
    Dashboard.initProfilePanel();
    if (window.WeeklyReport) window.WeeklyReport.init();

    if (!window.Storage.getProfile().isSetup) {
      const modal = document.getElementById('onboarding-modal');
      if (modal) modal.classList.remove('hidden');
    }

    App.refresh();
  } else if (page === 'ai-helper') {
    if (window.AI) AI.initMainChat();
  }

  // Global theme toggle (always available in headers)
  const themeBtns = document.querySelectorAll('.theme-btn, #theme-toggle');
  themeBtns.forEach(themeBtn => {
    if (!themeBtn.dataset.initialized) {
      themeBtn.dataset.initialized = 'true';
      const settings = Storage.getSettings();
      if (settings.theme === 'light') document.body.classList.add('light-mode');
      themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        Storage.saveSettings({ theme: isLight ? 'light' : 'dark' });
        document.querySelectorAll('.theme-btn, #theme-toggle').forEach(btn => {
          btn.textContent = isLight ? '🌙' : '☀️';
        });
      });
      themeBtn.textContent = settings.theme === 'light' ? '🌙' : '☀️';
    }
  });
});
