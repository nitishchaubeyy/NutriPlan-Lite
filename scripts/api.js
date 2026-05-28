// ================================================================
// api.js — Centralized API Service Layer
// NutriPlan-Lite
//
// All backend communication is routed through this module.
// It provides:
//  - A configured fetch wrapper with timeout + error normalization
//  - Namespaced method groups: ApiService.auth.*, .food.*, .water.*, .profile.*
//  - Automatic Bearer-token injection from Session (loaded later)
// ================================================================

window.ApiService = (() => {
  // ── Config ─────────────────────────────────────────────────────
  //
  // API_BASE is resolved at runtime from window.NUTRIPLAN_API_BASE so the
  // same frontend bundle works across local dev, staging, and production
  // without a rebuild.
  //
  // To configure for a deployed environment, set this variable before the
  // scripts are loaded, for example in an inline <script> tag:
  //
  //   <script>window.NUTRIPLAN_API_BASE = "https://api.example.com/api/v1";</script>
  //
  // When the variable is absent the code falls back to localhost:4000 for
  // local development. A console warning is emitted if the page is served
  // from a non-localhost origin and the variable has not been set, so
  // deployment misconfigurations are immediately visible in DevTools.
  const API_BASE = window.NUTRIPLAN_API_BASE || 'http://localhost:4000/api/v1';

  if (!window.NUTRIPLAN_API_BASE) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      console.warn(
        '[NutriPlan] NUTRIPLAN_API_BASE is not set. API calls will target ' +
        'http://localhost:4000/api/v1, which will fail in this deployed ' +
        'environment. Set window.NUTRIPLAN_API_BASE before loading this script.'
      );
    }
  }

  const DEFAULT_TIMEOUT_MS = 8000;

  const MAX_RETRIES = 3;

  /**
   * Internal fetch with timeout, auth headers, and normalised errors.
   * Includes exponential backoff retry logic for safe GET requests.
   * Throws an { status, message, data } object on failure.
   */
  async function request(method, endpoint, body = null, extraHeaders = {}) {
    let attempt = 0;
    
    while (attempt <= MAX_RETRIES) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      try {
        // Token is retrieved lazily — Session module loads after this one
        const token = window.Session ? window.Session.getToken() : localStorage.getItem('nutriplan_token');

        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...extraHeaders
        };

        const fetchOptions = {
          method,
          headers,
          signal: controller.signal
        };

        if (body !== null) {
          fetchOptions.body = JSON.stringify(body);
        }

        const res = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

        // Try to parse JSON regardless of status for error messages
        let payload;
        try { payload = await res.json(); } catch { payload = {}; }

        if (!res.ok) {
          throw {
            status: res.status,
            message: payload.message || `HTTP ${res.status} — ${res.statusText}`,
            data: payload
          };
        }

        clearTimeout(timeoutId);
        return payload;

      } catch (err) {
        clearTimeout(timeoutId);
        
        // Determine if this is a network/timeout error (0) or server error (500+)
        const isTransient = !err.status || err.status === 0 || err.status >= 500;
        const isAbort = err && err.name === 'AbortError';
        const canRetry = method === 'GET' && (isTransient || isAbort) && attempt < MAX_RETRIES;
        
        if (canRetry) {
          attempt++;
          // Exponential backoff: 2^attempt seconds + jitter
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(`[API] Transient failure on ${method} ${endpoint}. Retrying (Attempt ${attempt}/${MAX_RETRIES}) in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Re-throw structured errors as-is; wrap network/timeout errors
        if (err && err.status) throw err;
        if (isAbort) {
          throw { status: 0, message: 'Request timed out. Backend may be offline.', data: {} };
        }
        throw { status: 0, message: err.message || 'Network error. Backend may be offline.', data: {} };
      }
    }
  }

  // ── Convenience HTTP methods ────────────────────────────────────
  const get    = (ep, headers)    => request('GET',    ep, null,  headers);
  const post   = (ep, body, h)    => request('POST',   ep, body,  h);
  const put    = (ep, body, h)    => request('PUT',    ep, body,  h);
  const del    = (ep, body, h)    => request('DELETE', ep, body,  h);

  // ── Auth endpoints ──────────────────────────────────────────────
  const auth = {
    /**
     * POST /auth/login
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{token: string, user: object}>}
     */
    login(email, password) {
      return post('/auth/login', { email, password });
    },

    /**
     * POST /auth/register
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{token: string, user: object}>}
     */
    register(email, password) {
      return post('/auth/register', { email, password });
    },

    /**
     * GET /auth/profile  (requires token)
     * @returns {Promise<{status: string, data: {profile: object}}>}
     */
    profile() {
      return get('/auth/profile');
    }
  };

  // ── Profile endpoints ───────────────────────────────────────────
  const profile = {
    /**
     * GET /auth/profile  (alias for auth.profile)
     */
    get() {
      return get('/auth/profile');
    },

    /**
     * PUT /auth/profile
     * @param {object} updates  Backend-shaped profile fields
     */
    update(updates) {
      return put('/auth/profile', updates);
    }
  };

  // ── Food log endpoints ──────────────────────────────────────────
  const food = {
    /**
     * GET /food-logs
     * @param {string} [date]  Optional YYYY-MM-DD filter
     */
    get(date) {
      const qs = date ? `?date=${date}` : '';
      return get(`/food-logs${qs}`);
    },

    /**
     * POST /food-logs
     * @param {object} entry  Backend-shaped food log entry
     */
    create(entry) {
      return post('/food-logs', entry);
    },

    /**
     * PUT /food-logs/:id
     * @param {string} id
     * @param {object} entry  Backend-shaped food log entry
     */
    update(id, entry) {
      return put(`/food-logs/${id}`, entry);
    },

    /**
     * DELETE /food-logs/:id
     * @param {string} id
     */
    delete(id) {
      return del(`/food-logs/${id}`);
    }
  };

  // ── Water log endpoints ─────────────────────────────────────────
  const water = {
    /**
     * GET /water-logs
     * @param {string} [date]  Optional YYYY-MM-DD filter
     */
    get(date) {
      const qs = date ? `?date=${date}` : '';
      return get(`/water-logs${qs}`);
    },

    /**
     * POST /water-logs
     * @param {number} amount_ml
     * @param {string} log_date  YYYY-MM-DD
     */
    create(amount_ml, log_date) {
      return post('/water-logs', { amount_ml, log_date });
    },

    /**
     * DELETE /water-logs/reset?date=YYYY-MM-DD
     * Removes all water log entries for a given date.
     * @param {string} date  YYYY-MM-DD
     */
    reset(date) {
      return del(`/water-logs/reset?date=${date}`);
    }
  };

  // ── Health check ────────────────────────────────────────────────
  /**
   * Lightweight ping to check if the backend is reachable.
   * Resolves true / false without throwing.
   */
  async function ping() {
    try {
      await get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // ── Public API ──────────────────────────────────────────────────
  return { auth, profile, food, water, ping, get, post, put, del };

})();
