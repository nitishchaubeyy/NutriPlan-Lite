// ================================================================
// api.js — Centralized API Service Layer (Vite & Dual-Mode Optimized)
// NutriPlan-Lite
// ================================================================

// ── Compile-Time Environment Injections & Fallbacks ─────────────
export const AppConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('local_supabase_url') || '',
  geminiKey: import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('local_gemini_key') || '',

  // Agar API credentials missing hain toh app seamlessly Local-First mode me chalegi
  get isLocalMode() {
    return !this.supabaseUrl || !this.geminiKey;
  }
};

const API_BASE = 'http://localhost:4000/api/v1';
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 3;

/**
 * Internal fetch with timeout, auth headers, and normalised errors.
 * Includes exponential backoff retry logic for safe GET requests.
 *
 * Authentication: the JWT is stored in an HttpOnly cookie set by the
 * backend on login and register. The browser attaches it automatically
 * when credentials: 'include' is set, so no explicit Authorization header
 * is needed. The token is never readable by JavaScript, protecting it
 * from XSS-based theft.
 *
 * Throws an { status, message, data } object on failure.
 */
async function request(method, endpoint, body = null, extraHeaders = {}) {
  // Dual-mode guard clause: intercept calls early if in Local Demo Mode
  if (AppConfig.isLocalMode && !endpoint.includes('/health')) {
    console.info(`[API] Intercepted ${method} ${endpoint} - Operating in Local Demo Mode.`);
    throw { status: 401, message: 'Local Mode Active. Backend calls disabled.', data: {} };
  }

  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders
      };

      const fetchOptions = {
        method,
        headers,
        // Send the HttpOnly auth cookie on every request. The browser
        // attaches it automatically; no JS token reading is required.
        credentials: 'include',
        signal: controller.signal
      };

      if (body !== null) {
        fetchOptions.body = JSON.stringify(body);
      }

      const res = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

      let payload;
      try { payload = await res.json(); } catch { payload = {}; }

      if (!res.ok) {
        throw {
          status: res.status,
          message: payload.message || `HTTP ${res.status} - ${res.statusText}`,
          data: payload
        };
      }

      clearTimeout(timeoutId);
      return payload;

    } catch (err) {
      clearTimeout(timeoutId);

      const isTransient = !err.status || err.status === 0 || err.status >= 500;
      const isAbort = err && err.name === 'AbortError';
      const canRetry = method === 'GET' && (isTransient || isAbort) && attempt < MAX_RETRIES;

      if (canRetry) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[API] Transient failure on ${method} ${endpoint}. Retrying (${attempt}/${MAX_RETRIES}) in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (err && err.status) throw err;
      if (isAbort) {
        throw { status: 0, message: 'Request timed out. Backend may be offline.', data: {} };
      }
      throw { status: 0, message: err.message || 'Network error. Backend may be offline.', data: {} };
    }
  }
}

// ── Convenience HTTP methods ────────────────────────────────────
export const get    = (ep, headers)    => request('GET',    ep, null,  headers);
export const post   = (ep, body, h)    => request('POST',   ep, body,  h);
export const put    = (ep, body, h)    => request('PUT',    ep, body,  h);
export const del    = (ep, body, h)    => request('DELETE', ep, body,  h);

// ── Auth endpoints ──────────────────────────────────────────────
export const auth = {
  login(email, password) {
    return post('/auth/login', { email, password });
  },
  register(email, password) {
    return post('/auth/register', { email, password });
  },
  /**
   * POST /auth/logout (requires token)
   * Increments token_version on the backend so all existing JWTs for this
   * user are immediately invalidated, even those held by other sessions.
   * @returns {Promise<{status: string, message: string}>}
   */
  logout() {
    return post('/auth/logout', {});
  },
  profile() {
    return get('/auth/profile');
  }
};

// ── Profile endpoints ───────────────────────────────────────────
export const profile = {
  get() {
    return get('/auth/profile');
  },
  update(updates) {
    return put('/auth/profile', updates);
  }
};

// ── Food log endpoints ──────────────────────────────────────────
export const food = {
  get(date) {
    const qs = date ? `?date=${date}` : '';
    return get(`/food-logs${qs}`);
  },
  create(entry) {
    return post('/food-logs', entry);
  },
  update(id, entry) {
    return put(`/food-logs/${id}`, entry);
  },
  delete(id) {
    return del(`/food-logs/${id}`);
  }
};

// ── Water log endpoints ─────────────────────────────────────────
export const water = {
  get(date) {
    const qs = date ? `?date=${date}` : '';
    return get(`/water-logs${qs}`);
  },
  create(amount_ml, log_date) {
    return post('/water-logs', { amount_ml, log_date });
  },
  reset(date) {
    return del(`/water-logs/reset?date=${date}`);
  }
};

// ── Health check ────────────────────────────────────────────────
export async function ping() {
  try {
    await get('/health');
    return true;
  } catch {
    return false;
  }
}

// Retro-compatibility wrapper for any legacy non-module script files
window.ApiService = { auth, profile, food, water, ping, get, post, put, del };
