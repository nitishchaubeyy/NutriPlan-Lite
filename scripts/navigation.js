// ================================================================
// navigation.js — SPA router for NutriPlan-Lite
// ================================================================

window.Navigation = {
  routes: {
    'landing': 'pages/landing.html',
    'dashboard': 'pages/dashboard.html',
    'ai-helper': 'pages/ai-helper.html'
  },
  
  currentPage: null,

  async init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    // Use click delegation for nav links to support both standard and dynamic links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-nav]');
      if (link) {
        e.preventDefault();
        const target = link.getAttribute('data-nav');
        window.location.hash = target;
      }
    });

    // Determine initial route
    await this.handleRoute();

    // Setup mobile menu drawer
    this.setupMobileMenu();
  },

  setupMobileMenu() {
    const drawer = document.getElementById('mobile-menu-drawer');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const closeBtn = document.getElementById('close-mobile-menu-x');
    const closeBackdrop = document.getElementById('close-mobile-menu-backdrop');

    if (!drawer || !menuBtn) return;

    const openMenu = () => {
      drawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      // Sync auth status inside the mobile menu
      this.renderMobileAuth();
    };

    const closeMenu = () => {
      drawer.classList.add('hidden');
      document.body.style.overflow = '';
    };

    menuBtn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (closeBackdrop) closeBackdrop.addEventListener('click', closeMenu);

    // Also close menu when any link is clicked
    drawer.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) {
        closeMenu();
      }
    });
  },

  renderMobileAuth() {
    const container = document.getElementById('mobile-menu-auth-status');
    if (!container || !window.Auth) return;

    const token = window.Auth.getToken();
    const user = window.Auth.getCurrentUser();
    const email = user ? user.email : null;

    if (token && email) {
      container.innerHTML = `
        <span class="auth-user-email mobile-user-email" title="${email}">${email}</span>
        <button id="mobile-auth-signout-btn" class="secondary-button mobile-signout-btn" type="button">Sign Out</button>
      `;
      container.querySelector('#mobile-auth-signout-btn')
        ?.addEventListener('click', () => {
          window.Auth.logout();
        });
    } else {
      container.innerHTML = `
        <button id="mobile-auth-signin-trigger" class="primary-button mobile-signin-btn" type="button">Sign In</button>
      `;
      container.querySelector('#mobile-auth-signin-trigger')
        ?.addEventListener('click', () => {
          window.Auth.openModal();
        });
    }
  },

  async handleRoute() {
    let hash = window.location.hash.replace('#', '');
    if (!hash || !this.routes[hash]) {
      hash = 'landing';
      window.location.hash = hash;
      return; // hashchange will trigger again
    }

    if (this.currentPage === hash) return;

    this.currentPage = hash;
    this.updateActiveNavLinks(hash);

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    // Show loading state if desired
    appContent.innerHTML = '<div class="page-loader">Loading...</div>';

    try {
      const template = document.getElementById(`template-${hash}`);
      if (!template) throw new Error('Template not found for ' + hash);
      
      appContent.innerHTML = '';
      appContent.appendChild(template.content.cloneNode(true));

      // Dispatch event to re-initialize modules for the new page
      window.dispatchEvent(new CustomEvent('pageLoaded', { detail: { page: hash } }));
      
      // If it's the dashboard, trigger an app refresh
      if (hash === 'dashboard' && window.App) {
        window.App.refresh();
      }

      // If it's the AI Helper, trigger AI initialization
      if (hash === 'ai-helper' && window.AI) {
        window.AI.initMainChat();
      }

    } catch (err) {
      console.error('Failed to load page:', err);
      appContent.innerHTML = '<div class="empty-state">Failed to load content. Please try again.</div>';
    }
  },

  updateActiveNavLinks(hash) {
    document.body.className = `page-${hash}`;
    const navLinks = document.querySelectorAll('a[data-nav]');
    navLinks.forEach(link => {
      if (link.getAttribute('data-nav') === hash) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Navigation.init();
});
