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
