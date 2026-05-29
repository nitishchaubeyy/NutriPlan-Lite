// ================================================================
// session.js — JWT Session Manager
// NutriPlan-Lite
//
// Responsibilities:
//   - Track user profile in localStorage
//   - Read auth state from the nutriplan_session_exp cookie (set by the
//     backend on login; not HttpOnly so JS can read the expiry timestamp
//     without ever accessing the JWT itself)
//   - Guest (demo) mode detection
//   - Logout: clear local state (the backend clears the HttpOnly cookie)
//   - Token refresh stub (ready for future implementation)
//
// Token storage: the JWT is stored exclusively in the HttpOnly
// nutriplan_token cookie set by the backend on login and register. That
// cookie is inaccessible to JavaScript by design, protecting it from XSS
// theft. The frontend never stores the raw token in localStorage.
// ================================================================

window.Session = (() => {
  // ── Storage keys ───────────────────────────────────────────────
  const EMAIL_KEY   = 'nutriplan_user_email';
  const PROFILE_KEY = 'nutriplan_user_profile';

  // Cookie name that carries the token expiry (epoch seconds).
  // This cookie is NOT HttpOnly so the frontend can read it to determine
  // login state without accessing the JWT itself.
  const SESSION_EXP_COOKIE = 'nutriplan_session_exp';

  // ── Cookie helpers ───────────────────────────────────────────────

  /**
   * Read a cookie value by name from document.cookie.
   * Returns null if the cookie is not present.
   */
  function _getCookie(name) {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(name + '='));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  }

  // ── Token management ────────────────────────────────────────────

  /**
   * The JWT lives in an HttpOnly cookie managed exclusively by the backend.
   * This function always returns null because JavaScript cannot read HttpOnly
   * cookies, which is precisely the XSS protection we want.
   *
   * ApiService sends credentials: 'include' on every fetch so the browser
   * attaches the HttpOnly cookie automatically without JS intervention.
   *
   * @returns {null}
   */
  function getToken() {
    return null;
  }

  /**
   * No-op: the backend controls the HttpOnly token cookie.
   * Retained for interface compatibility only.
   */
  function setToken() {
    // Token storage is handled server-side via Set-Cookie.
  }

  // ── Authentication state ────────────────────────────────────────

  /**
   * True when the nutriplan_session_exp cookie is present and has not expired.
   *
   * The backend sets this readable (non-HttpOnly) cookie alongside the
   * HttpOnly token cookie on login and register. Its value is the token's
   * exp claim as a Unix epoch second. The frontend uses it to determine login
   * state without ever accessing the JWT itself.
   *
   * If the cookie is absent or expired, any cached local state is cleared
   * so the app falls back to guest/demo mode immediately.
   */
  function isAuthenticated() {
    const expStr = _getCookie(SESSION_EXP_COOKIE);
    if (!expStr) return false;

    const exp = parseInt(expStr, 10);
    if (!Number.isFinite(exp)) return false;

    if (Math.floor(Date.now() / 1000) >= exp) {
      // Session has expired: wipe local storage so the UI resets cleanly.
      _clearLocalStorage();
      return false;
    }

    return true;
  }

  /** Returns the decoded email from storage (not from JWT payload). */
  function getEmail() {
    return localStorage.getItem(EMAIL_KEY) || null;
  }

  // ── User profile cache ──────────────────────────────────────────

  /**
   * Cache a server-side profile snapshot locally.
   * @param {object} profile  Raw backend profile shape
   */
  function setProfile(profile) {
    if (profile) {
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      } catch {
        // Quota exceeded — non-fatal
      }
    }
  }

  /**
   * Retrieve the cached server profile snapshot.
   * Returns null in guest/demo mode.
   */
  function getCachedProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // ── Session persistence ─────────────────────────────────────────

  /**
   * Persist credentials after a successful login or register.
   *
   * The JWT is managed by the backend via the HttpOnly cookie set in the
   * login/register response. Only the email (non-sensitive, used for UI
   * display) is stored locally here.
   *
   * @param {string} _token  Unused: token lives in the HttpOnly cookie.
   * @param {string} email
   */
  function save(_token, email) {
    if (email) localStorage.setItem(EMAIL_KEY, email);
  }

  /**
   * Restore session from storage at app boot.
   * Returns the current session object (token may be null for guest mode).
   */
  function restore() {
    return {
      token: getToken(),
      email: getEmail(),
      isAuthenticated: isAuthenticated()
    };
  }

  // ── Logout / Guest mode ─────────────────────────────────────────

  /**
   * Clear localStorage-backed session state.
   * The HttpOnly token cookie and the session_exp cookie are cleared by the
   * backend's logout endpoint (via Set-Cookie with Max-Age=0). This function
   * handles only the JS-accessible local state.
   */
  function _clearLocalStorage() {
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(PROFILE_KEY);
    // Remove the legacy token key in case it was set by an older app version.
    localStorage.removeItem('nutriplan_token');
  }

  /**
   * Clear all session state and return to demo mode.
   * Does NOT wipe the nutriplan_v2 database key — handled by Auth.logout().
   */
  function clear() {
    _clearLocalStorage();
  }

  /**
   * True when the user has no JWT — running in local demo mode.
   */
  function isGuestMode() {
    return !isAuthenticated();
  }

  // ── Token refresh (stub — extend for refresh-token flow) ────────

  /**
   * Attempt to refresh the JWT using a refresh token endpoint.
   * Currently a no-op stub; wire up when backend supports it.
   * @returns {Promise<boolean>}  true if refreshed, false otherwise
   */
  async function tryRefresh() {
    // TODO: implement when backend exposes POST /auth/refresh
    return false;
  }

  // ── Public API ──────────────────────────────────────────────────
  return {
    getToken,
    setToken,
    isAuthenticated,
    getEmail,
    setProfile,
    getCachedProfile,
    save,
    restore,
    clear,
    isGuestMode,
    tryRefresh
  };
})();
