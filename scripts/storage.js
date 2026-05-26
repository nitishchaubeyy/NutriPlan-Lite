// ================================================================
// storage.js — Persistent localStorage database layer
// NutriPlan-Lite
//
// Architecture:
//   - Primary state: localStorage (always available, instant)
//   - Backend sync:  ApiService.* (when authenticated via Session)
//   - Fallback:      If backend unreachable → localStorage only
//
// All mutation functions (addFood, updateFood, …) update local
// state synchronously FIRST, then fire a non-blocking background
// API call so the UI never stalls waiting for the network.
// ================================================================

const DB_KEY = 'nutriplan_v2';

const DEFAULT_PROFILE = {
  isSetup: false,
  name: 'User',
  age: 25,
  weight: 70,
  height: 175,
  gender: 'male',
  activity: 1.55,
  goal: 'maintain',
  macroSplit: 'balanced',
  customProtein: 25,
  customCarbs: 45,
  customFat: 30,
  waterTarget: 2500,
  dietaryPreference: 'balanced',
  allergies: '',
  memactConnectionId: '',
  memactConnectionState: '',
  memactContextSource: 'manual',
  memactContextUpdatedAt: ''
};

// ── Core DB helpers ────────────────────────────────────────────────

let dbCache = null;

async function initDB() {
  if (dbCache) return dbCache; // already loaded

  try {
    const data = await window.IDB.get('db');
    if (data) {
      dbCache = data;
    } else {
      // Check localStorage for migration
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        dbCache = JSON.parse(raw);
        console.log('[Storage] Migrating from localStorage to IndexedDB');
        await window.IDB.put('db', dbCache);
        // Clean up legacy storage once migrated successfully
        localStorage.removeItem(DB_KEY);
      } else {
        dbCache = createEmptyDB();
        await window.IDB.put('db', dbCache);
      }
    }
  } catch (err) {
    console.error('[Storage] IndexedDB init failed, falling back to empty db', err);
    dbCache = createEmptyDB();
  }

  // Ensure defaults are populated
  if (!dbCache.profile)  dbCache.profile  = { ...DEFAULT_PROFILE };
  if (!dbCache.logs)     dbCache.logs     = {};
  if (!dbCache.settings) dbCache.settings = { notifications: true };
  if (!dbCache.sync_queue) dbCache.sync_queue = [];
  dbCache.profile = { ...DEFAULT_PROFILE, ...dbCache.profile };

  return dbCache;
}

function loadDB() {
  if (!dbCache) {
    console.warn('[Storage] loadDB called before initDB! Returning fallback.');
    return createEmptyDB();
  }
  return dbCache;
}

function createEmptyDB() {
  return {
    profile: { ...DEFAULT_PROFILE },
    logs: {},
    settings: { notifications: true },
    sync_queue: []
  };
}

function clearDB() {
  dbCache = createEmptyDB();
  window.IDB.put('db', dbCache).catch(e => console.error('[Storage] clearDB failed:', e));
}

function saveDB(db) {
  try {
    dbCache = db; // ensure cache matches (though it usually is the same ref)
    window.IDB.put('db', db).catch(e => console.error('[Storage] Async IDB write failed:', e));
  } catch (e) {
    console.error('Storage write failed:', e);
  }
}

// ── Auth guard helper ──────────────────────────────────────────────

function isOnline() {
  return !!(window.Session && window.Session.isAuthenticated());
}

// ── Profile ────────────────────────────────────────────────────────

function getProfile() {
  return loadDB().profile;
}

function saveProfile(updates) {
  const db = loadDB();
  db.profile = { ...db.profile, ...updates };
  saveDB(db);

  // Background sync — non-blocking
  if (isOnline()) {
    ApiService.profile.update(mapFrontendToBackendProfile(db.profile))
      .catch(err => {
        console.warn('[Storage] Profile sync failed, queuing action.', err.message);
        if (window.SyncQueue) window.SyncQueue.enqueue('profile', 'update', [mapFrontendToBackendProfile(db.profile)]);
      });
  }

  return db.profile;
}

// ── Day log helpers ────────────────────────────────────────────────

function todayKey() {
  return getLocalDateString(new Date());
}

function getLocalDateString(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
}

function getDayLog(dateKey) {
  const db = loadDB();
  if (!db.logs[dateKey]) {
    db.logs[dateKey] = { foods: [], water: 0 };
  }
  return db.logs[dateKey];
}

function saveDayLog(dateKey, dayLog) {
  const db = loadDB();
  db.logs[dateKey] = dayLog;
  saveDB(db);
}

// ── Food entries ───────────────────────────────────────────────────

function getFoods(dateKey) {
  return getDayLog(dateKey).foods || [];
}

function addFood(dateKey, entry) {
  const db = loadDB();
  if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };

  const food = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  db.logs[dateKey].foods.push(food);
  saveDB(db);

  // Background sync
  if (isOnline()) {
    ApiService.food.create(mapFrontendToBackendFood(food, dateKey))
      .catch(err => {
        console.warn('[Storage] addFood sync failed, queuing action.', err.message);
        if (window.SyncQueue) window.SyncQueue.enqueue('food', 'create', [mapFrontendToBackendFood(food, dateKey)]);
      });
  }

  return food;
}

function updateFood(dateKey, id, updates) {
  const db = loadDB();
  if (!db.logs[dateKey]) return;
  const idx = db.logs[dateKey].foods.findIndex(f => f.id === id);
  if (idx === -1) return;

  db.logs[dateKey].foods[idx] = { ...db.logs[dateKey].foods[idx], ...updates };
  saveDB(db);

  // Background sync
  if (isOnline()) {
    const updated = db.logs[dateKey].foods[idx];
    ApiService.food.update(id, mapFrontendToBackendFood(updated, dateKey))
      .catch(err => {
        console.warn('[Storage] updateFood sync failed, queuing action.', err.message);
        if (window.SyncQueue) window.SyncQueue.enqueue('food', 'update', [id, mapFrontendToBackendFood(updated, dateKey)]);
      });
  }
}

function deleteFood(dateKey, id) {
  const db = loadDB();
  if (!db.logs[dateKey]) return;
  db.logs[dateKey].foods = db.logs[dateKey].foods.filter(f => f.id !== id);
  saveDB(db);

  // Background sync
  if (isOnline()) {
    ApiService.food.delete(id)
      .catch(err => {
        console.warn('[Storage] deleteFood sync failed, queuing action.', err.message);
        if (window.SyncQueue) window.SyncQueue.enqueue('food', 'delete', [id]);
      });
  }
}

// ── Hydration ──────────────────────────────────────────────────────

function getWater(dateKey) {
  return getDayLog(dateKey).water || 0;
}

function addWater(dateKey, ml) {
  const db = loadDB();
  if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };
  db.logs[dateKey].water = (db.logs[dateKey].water || 0) + ml;
  saveDB(db);

  // Background sync
  if (isOnline()) {
    ApiService.water.create(ml, dateKey)
      .catch(err => {
        console.warn('[Storage] addWater sync failed, queuing action.', err.message);
        if (window.SyncQueue) window.SyncQueue.enqueue('water', 'create', [ml, dateKey]);
      });
  }

  return db.logs[dateKey].water;
}

function setWater(dateKey, ml) {
  const db = loadDB();
  if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };
  db.logs[dateKey].water = ml;
  saveDB(db);

  // Background sync — reset then optionally re-create
  if (isOnline()) {
    (async () => {
      try {
        await ApiService.water.reset(dateKey);
        if (ml > 0) {
          await ApiService.water.create(ml, dateKey);
        }
      } catch (err) {
        console.warn('[Storage] setWater sync failed, queuing actions.', err.message);
        if (window.SyncQueue) {
          window.SyncQueue.enqueue('water', 'reset', [dateKey]);
          if (ml > 0) {
            window.SyncQueue.enqueue('water', 'create', [ml, dateKey]);
          }
        }
      }
    })();
  }
}

// ── Weekly data for analytics ──────────────────────────────────────

function getWeeklyData() {
  const db = loadDB();
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getLocalDateString(d);
    const log = db.logs[key] || { foods: [], water: 0 };
    const calories = log.foods.reduce((s, f) => s + (f.calories || 0), 0);
    const protein  = log.foods.reduce((s, f) => s + (f.protein  || 0), 0);
    const carbs    = log.foods.reduce((s, f) => s + (f.carbs    || 0), 0);
    const fat      = log.foods.reduce((s, f) => s + (f.fat      || 0), 0);
    result.push({
      date:     key,
      label:    d.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: Math.round(calories),
      protein:  Math.round(protein  * 10) / 10,
      carbs:    Math.round(carbs    * 10) / 10,
      fat:      Math.round(fat      * 10) / 10,
      water:    log.water || 0
    });
  }
  return result;
}

// ── Settings ───────────────────────────────────────────────────────

function getSettings() {
  return loadDB().settings;
}

function saveSettings(updates) {
  const db = loadDB();
  db.settings = { ...db.settings, ...updates };
  saveDB(db);
}

function clearMemactConnection() {
  const db = loadDB();
  db.profile = {
    ...db.profile,
    memactConnectionId: '',
    memactConnectionState: '',
    memactContextSource: 'manual',
    memactContextUpdatedAt: ''
  };
  saveDB(db);
  return db.profile;
}

// ── Streak calculation ────────────────────────────────────────────

function getStreak() {
  const db = loadDB();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getLocalDateString(d);
    const log = db.logs[key];
    if (log && log.foods && log.foods.length > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Field mapping helpers ──────────────────────────────────────────

function mapFrontendToBackendProfile(fe) {
  return {
    age:            fe.age      !== undefined ? parseInt(fe.age,       10) : undefined,
    weight:         fe.weight   !== undefined ? parseFloat(fe.weight)      : undefined,
    height:         fe.height   !== undefined ? parseFloat(fe.height)      : undefined,
    gender:         fe.gender,
    activity_level: fe.activity !== undefined ? parseFloat(fe.activity)    : undefined,
    fitness_goal:   fe.goal,
    macro_split:    fe.macroSplit,
    custom_protein: fe.customProtein !== undefined ? parseFloat(fe.customProtein) : undefined,
    custom_carbs:   fe.customCarbs   !== undefined ? parseFloat(fe.customCarbs)   : undefined,
    custom_fat:     fe.customFat     !== undefined ? parseFloat(fe.customFat)     : undefined,
    water_target:   fe.waterTarget   !== undefined ? parseInt(fe.waterTarget, 10) : undefined
  };
}

function mapBackendToFrontendProfile(be) {
  if (!be) return null;
  return {
    isSetup:       true,
    name:          'User',
    age:           be.age            !== null ? parseInt(be.age,       10) : 25,
    weight:        be.weight         !== null ? parseFloat(be.weight)      : 70,
    height:        be.height         !== null ? parseFloat(be.height)      : 175,
    gender:        be.gender         || 'male',
    activity:      be.activity_level !== null ? parseFloat(be.activity_level) : 1.55,
    goal:          be.fitness_goal   || 'maintain',
    macroSplit:    be.macro_split    || 'balanced',
    customProtein: be.custom_protein !== null ? parseFloat(be.custom_protein) : 25,
    customCarbs:   be.custom_carbs   !== null ? parseFloat(be.custom_carbs)   : 45,
    customFat:     be.custom_fat     !== null ? parseFloat(be.custom_fat)     : 30,
    waterTarget:   be.water_target   !== null ? parseInt(be.water_target, 10) : 2500
  };
}

function mapFrontendToBackendFood(fe, dateKey) {
  return {
    id:             fe.id,
    food_name:      fe.name,
    quantity_grams: fe.quantity,
    calories:       fe.calories,
    protein:        fe.protein  || 0,
    carbs:          fe.carbs    || 0,
    fat:            fe.fat      || 0,
    meal_type:      fe.meal     || 'breakfast',
    log_date:       dateKey
  };
}

function mapBackendToFrontendFood(be) {
  return {
    id:        be.id,
    timestamp: be.created_at || new Date().toISOString(),
    name:      be.food_name,
    meal:      be.meal_type,
    quantity:  parseFloat(be.quantity_grams),
    calories:  parseInt(be.calories,  10),
    protein:   parseFloat(be.protein  || 0),
    carbs:     parseFloat(be.carbs    || 0),
    fat:       parseFloat(be.fat      || 0)
  };
}

function formatDate(dateVal) {
  if (!dateVal) return todayKey();
  const str = String(dateVal);
  return str.includes('T') ? str.split('T')[0] : str;
}

// ── Demo mode banner ───────────────────────────────────────────────

function _showDemoModeBanner() {
  const existing = document.getElementById('demo-mode-banner');
  if (existing) return; // already shown
  const banner = document.createElement('div');
  banner.id = 'demo-mode-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'right:0',
    'z-index:9999',
    'background:rgba(30,30,40,0.96)',
    'color:#f59e0b',
    'font-size:0.82rem',
    'font-weight:600',
    'padding:8px 16px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'gap:8px',
    'border-top:1px solid rgba(245,158,11,0.3)',
    'backdrop-filter:blur(8px)',
    '-webkit-backdrop-filter:blur(8px)',
    'letter-spacing:0.02em'
  ].join(';');
  banner.innerHTML = `<span>⚠️</span><span>Demo Mode Active — data saved locally only. <a href="#" id="demo-signin-link" style="color:#f59e0b;text-decoration:underline;cursor:pointer;">Sign in</a> to sync with the cloud.</span>`;
  document.body.appendChild(banner);

  // Wire the inline sign-in link
  const link = document.getElementById('demo-signin-link');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.Auth && window.Auth.openModal) window.Auth.openModal();
    });
  }
}

function _hideDemoModeBanner() {
  const banner = document.getElementById('demo-mode-banner');
  if (banner) banner.remove();
}

// ── Full backend sync ──────────────────────────────────────────────

/**
 * Fetch the full dataset from the Express backend and rebuild
 * the local DB cache, preserving the existing log structure.
 *
 * If the backend is unavailable, logs a warning and shows the
 * "Demo Mode Active" banner — the app continues using localStorage.
 *
 * @param {string} [dateFilter]  Optional YYYY-MM-DD to restrict scope (future use)
 */
async function sync(dateFilter) {
  if (!isOnline()) {
    _showDemoModeBanner();
    return;
  }

  try {
    const db = loadDB();

    // 1. Sync Profile
    const profileRes = await ApiService.profile.get();
    if (profileRes && profileRes.status === 'success' && profileRes.data && profileRes.data.profile) {
      db.profile = mapBackendToFrontendProfile(profileRes.data.profile);
    }

    // 2. Sync Food Logs
    const foodsRes = await ApiService.food.get(dateFilter);
    const foodLogs = (foodsRes && foodsRes.data && foodsRes.data.foodLogs) || [];

    // 3. Sync Water Logs
    const waterRes = await ApiService.water.get(dateFilter);
    const waterLogs = (waterRes && waterRes.data && waterRes.data.waterLogs) || [];

    // Rebuild logs from server — clear only for full sync, preserve for date-scoped
    if (!dateFilter) {
      db.logs = {};
    } else {
      // Only wipe the targeted date so other days are untouched
      if (db.logs[dateFilter]) {
        db.logs[dateFilter] = { foods: [], water: 0 };
      }
    }

    foodLogs.forEach(beFood => {
      const key = formatDate(beFood.log_date);
      if (!db.logs[key]) db.logs[key] = { foods: [], water: 0 };
      db.logs[key].foods.push(mapBackendToFrontendFood(beFood));
    });

    waterLogs.forEach(beWater => {
      const key = formatDate(beWater.log_date);
      if (!db.logs[key]) db.logs[key] = { foods: [], water: 0 };
      db.logs[key].water += parseInt(beWater.amount_ml || 0, 10);
    });

    saveDB(db);
    _hideDemoModeBanner();
    console.log('[Storage] Synced with backend.', dateFilter ? `Date: ${dateFilter}` : 'Full sync.');
  } catch (e) {
    // Backend offline or error — remain in demo mode
    console.warn('[Storage] Sync failed, staying in demo mode:', e.message || e);
    _showDemoModeBanner();
  }
}

// ── Global export ──────────────────────────────────────────────────

window.Storage = {
  initDB,
  getProfile, saveProfile,
  getFoods, addFood, updateFood, deleteFood,
  getWater, addWater, setWater,
  getDayLog, saveDayLog,
  getWeeklyData,
  getSettings, saveSettings,
  clearMemactConnection,
  getStreak,
  todayKey, getLocalDateString,
  sync, clearDB
};
