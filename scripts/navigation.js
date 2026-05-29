// ================================================================
// navigation.js — SPA router for NutriPlan-Lite
// ================================================================

window.Navigation = {
  routes: {
    'landing': 'pages/landing.html',
    'dashboard': 'pages/dashboard.html',
    'grocery': 'pages/grocery.html',
    'ai-helper': 'pages/ai-helper.html',
    'faq': 'pages/faq.html',
    'privacy': 'pages/privacy.html'
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

    if (!drawer) return;

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

    // Bind all hamburger buttons (landing header + dashboard header)
    document.querySelectorAll('.mobile-menu-btn').forEach(btn => {
      btn.addEventListener('click', openMenu);
    });
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

    container.innerHTML = ''; // Safely clear content

    if (token && email) {
      const span = document.createElement('span');
      span.className = 'auth-user-email mobile-user-email';
      span.title = email;
      span.textContent = email;

      const btn = document.createElement('button');
      btn.id = 'mobile-auth-signout-btn';
      btn.className = 'secondary-button mobile-signout-btn';
      btn.type = 'button';
      btn.textContent = 'Sign Out';
      btn.addEventListener('click', () => {
        window.Auth.logout();
      });

      container.appendChild(span);
      container.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.id = 'mobile-auth-signin-trigger';
      btn.className = 'primary-button mobile-signin-btn';
      btn.type = 'button';
      btn.textContent = 'Sign In';
      btn.addEventListener('click', () => {
        window.Auth.openModal();
      });

      container.appendChild(btn);
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

      // If it's the Grocery page, trigger Grocery initialization
      if (hash === 'grocery' && window.Grocery) {
        window.Grocery.init();
      }

    } catch (err) {
      console.error('Failed to load page:', err);
      appContent.innerHTML = '<div class="empty-state">Failed to load content. Please try again.</div>';
    }
  },

  updateActiveNavLinks(hash) {
    document.body.className = `page-${hash}`;
    if (hash !== 'landing') {
      window.__landingAnimationsInitialized = false;
    }
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
