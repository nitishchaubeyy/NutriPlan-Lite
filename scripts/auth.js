// ================================================================
// auth.js — Authentication module for NutriPlan-Lite
// Handles login, register, token state, and auth drawer widgets
// ================================================================

window.Auth = (() => {
  const API_BASE = 'http://localhost:4000/api/v1';
  let activeTab = 'login';

  function getToken() {
    return localStorage.getItem('nutriplan_token');
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function getCurrentUser() {
    return {
      email: localStorage.getItem('nutriplan_user_email')
    };
  }

  async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${res.status}`);
    }

    return res.json();
  }

  function openModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
    switchTab('login');
  }

  function closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
  }

  function switchTab(tab) {
    activeTab = tab;
    const loginBtn = document.getElementById('auth-tab-login');
    const registerBtn = document.getElementById('auth-tab-register');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!loginBtn || !registerBtn || !submitBtn) return;

    if (tab === 'login') {
      loginBtn.classList.add('active');
      registerBtn.classList.remove('active');
      loginBtn.setAttribute('aria-selected', 'true');
      registerBtn.setAttribute('aria-selected', 'false');
      submitBtn.textContent = 'Sign In';
    } else {
      registerBtn.classList.add('active');
      loginBtn.classList.remove('active');
      registerBtn.setAttribute('aria-selected', 'true');
      loginBtn.setAttribute('aria-selected', 'false');
      submitBtn.textContent = 'Register';
    }
  }

  async function login(email, password) {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      const token = data.token;
      if (!token) throw new Error("No token returned from server.");
      
      localStorage.setItem('nutriplan_token', token);
      localStorage.setItem('nutriplan_user_email', email);
      
      Toast.show('Successfully signed in!', 'success');
      closeModal();
      renderAuthWidgets();
      
      // Perform full sync from server
      await Storage.sync();
      
      // Refresh the page/app
      if (window.App) window.App.refresh();
    } catch (err) {
      console.error(err);
      Toast.show(`Sign In Failed: ${err.message}`, 'error');
    }
  }

  async function register(email, password) {
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      const token = data.token;
      if (!token) throw new Error("No token returned from server.");
      
      localStorage.setItem('nutriplan_token', token);
      localStorage.setItem('nutriplan_user_email', email);
      
      Toast.show('Successfully registered & signed in!', 'success');
      closeModal();
      renderAuthWidgets();
      
      // Perform full sync
      await Storage.sync();
      
      // Refresh the page/app
      if (window.App) window.App.refresh();
    } catch (err) {
      console.error(err);
      Toast.show(`Registration Failed: ${err.message}`, 'error');
    }
  }

  function logout() {
    localStorage.removeItem('nutriplan_token');
    localStorage.removeItem('nutriplan_user_email');
    
    // Reset local database completely to fall back to Local Demo mode
    localStorage.removeItem('nutriplan_v2');
    
    Toast.show('Signed out. Local Demo mode active.', 'info');
    renderAuthWidgets();
    
    // Refresh the page
    if (window.App) window.App.refresh();
    window.location.reload();
  }

  function renderAuthWidgets() {
    const containers = [
      document.getElementById('auth-status-container'),
      document.getElementById('landing-auth-status-container')
    ];

    const token = getToken();
    const email = localStorage.getItem('nutriplan_user_email');

    containers.forEach(container => {
      if (!container) return;
      
      if (token && email) {
        container.innerHTML = `
          <span class="auth-user-email" title="${email}">${email}</span>
          <button id="auth-signout-btn" class="secondary-button" style="min-height:36px; padding: 0 0.8rem; font-weight:800; cursor:pointer;" type="button">Sign Out</button>
        `;
        const signoutBtn = container.querySelector('#auth-signout-btn');
        if (signoutBtn) {
          signoutBtn.addEventListener('click', () => logout());
        }
      } else {
        container.innerHTML = `
          <button id="auth-signin-trigger" class="secondary-button" style="min-height:36px; padding: 0 0.8rem; font-weight:800; cursor:pointer;" type="button">Sign In</button>
        `;
        const signinBtn = container.querySelector('#auth-signin-trigger');
        if (signinBtn) {
          signinBtn.addEventListener('click', () => openModal());
        }
      }
    });
  }

  function init() {
    const closeBackdrop = document.getElementById('close-auth-backdrop');
    const closeX = document.getElementById('close-auth-x');
    const loginBtn = document.getElementById('auth-tab-login');
    const registerBtn = document.getElementById('auth-tab-register');
    const form = document.getElementById('auth-form');

    if (closeBackdrop) closeBackdrop.addEventListener('click', closeModal);
    if (closeX) closeX.addEventListener('click', closeModal);
    if (loginBtn) loginBtn.addEventListener('click', () => switchTab('login'));
    if (registerBtn) registerBtn.addEventListener('click', () => switchTab('register'));

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value.trim();
        
        if (activeTab === 'login') {
          await login(email, password);
        } else {
          await register(email, password);
        }
      });
    }

    renderAuthWidgets();
  }

  return {
    init,
    getToken,
    isAuthenticated,
    getCurrentUser,
    apiRequest,
    logout,
    openModal,
    closeModal,
    renderAuthWidgets
  };
})();

// Initialize Auth module when DOM content is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.Auth.init();
});
