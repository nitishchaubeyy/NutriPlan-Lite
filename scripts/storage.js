// ================================================================
// storage.js — Persistent localStorage database layer
// NutriPlan-Lite
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
  waterTarget: 2500
};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return createEmptyDB();
    const db = JSON.parse(raw);
    if (!db.profile) db.profile = { ...DEFAULT_PROFILE };
    if (!db.logs) db.logs = {};
    if (!db.settings) db.settings = { theme: 'dark', notifications: true };
    return db;
  } catch {
    return createEmptyDB();
  }
}

function createEmptyDB() {
  return {
    profile: { ...DEFAULT_PROFILE },
    logs: {},
    settings: { theme: 'dark', notifications: true }
  };
}

function saveDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Storage write failed:', e);
  }
}

// ── Profile ──────────────────────────────────────────────────────

function getProfile() {
  return loadDB().profile;
}

function saveProfile(updates) {
  const db = loadDB();
  db.profile = { ...db.profile, ...updates };
  saveDB(db);

  if (window.Auth && window.Auth.isAuthenticated()) {
    window.Auth.apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(mapFrontendToBackendProfile(db.profile))
    }).catch(err => console.error("Profile sync failed:", err));
  }

  return db.profile;
}

// ── Day log helpers ───────────────────────────────────────────────

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

// ── Food entries ──────────────────────────────────────────────────

function getFoods(dateKey) {
  return getDayLog(dateKey).foods || [];
}

function addFood(dateKey, entry) {
  const db = loadDB();
  if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };
  
  const food = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  
  db.logs[dateKey].foods.push(food);
  saveDB(db);

  if (window.Auth && window.Auth.isAuthenticated()) {
    window.Auth.apiRequest('/food-logs', {
      method: 'POST',
      body: JSON.stringify(mapFrontendToBackendFood(food, dateKey))
    }).catch(err => console.error("Food log add failed:", err));
  }

  return food;
}

function updateFood(dateKey, id, updates) {
  const db = loadDB();
  if (!db.logs[dateKey]) return;
  const idx = db.logs[dateKey].foods.findIndex(f => f.id === id);
  if (idx !== -1) {
    db.logs[dateKey].foods[idx] = { ...db.logs[dateKey].foods[idx], ...updates };
    saveDB(db);

    if (window.Auth && window.Auth.isAuthenticated()) {
      const updatedFood = db.logs[dateKey].foods[idx];
      window.Auth.apiRequest(`/food-logs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mapFrontendToBackendFood(updatedFood, dateKey))
      }).catch(err => console.error("Food log update failed:", err));
    }
  }
}

function deleteFood(dateKey, id) {
  const db = loadDB();
  if (!db.logs[dateKey]) return;
  db.logs[dateKey].foods = db.logs[dateKey].foods.filter(f => f.id !== id);
  saveDB(db);

  if (window.Auth && window.Auth.isAuthenticated()) {
    window.Auth.apiRequest(`/food-logs/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error("Food log delete failed:", err));
  }
}

// ── Hydration ─────────────────────────────────────────────────────

function getWater(dateKey) {
  return getDayLog(dateKey).water || 0;
}

function addWater(dateKey, ml) {
  const db = loadDB();
  if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };
  db.logs[dateKey].water = (db.logs[dateKey].water || 0) + ml;
  saveDB(db);

  if (window.Auth && window.Auth.isAuthenticated()) {
    window.Auth.apiRequest('/water-logs', {
      method: 'POST',
      body: JSON.stringify({
        amount_ml: ml,
        log_date: dateKey
      })
    }).catch(err => console.error("Water log add failed:", err));
  }

  return db.logs[dateKey].water;
}

function setWater(dateKey, ml) {
  const db = loadDB();
  if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };
  db.logs[dateKey].water = ml;
  saveDB(db);

  if (window.Auth && window.Auth.isAuthenticated()) {
    if (ml === 0) {
      window.Auth.apiRequest(`/water-logs/reset?date=${dateKey}`, {
        method: 'DELETE'
      }).catch(err => console.error("Water log reset failed:", err));
    } else {
      (async () => {
        try {
          await window.Auth.apiRequest(`/water-logs/reset?date=${dateKey}`, { method: 'DELETE' });
          if (ml > 0) {
            await window.Auth.apiRequest('/water-logs', {
              method: 'POST',
              body: JSON.stringify({ amount_ml: ml, log_date: dateKey })
            });
          }
        } catch (err) {
          console.error("Water log update failed:", err);
        }
      })();
    }
  }
}

// ── Weekly data for analytics ─────────────────────────────────────

function getWeeklyData() {
  const db = loadDB();
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getLocalDateString(d);
    const log = db.logs[key] || { foods: [], water: 0 };
    const calories = log.foods.reduce((s, f) => s + (f.calories || 0), 0);
    const protein = log.foods.reduce((s, f) => s + (f.protein || 0), 0);
    const carbs = log.foods.reduce((s, f) => s + (f.carbs || 0), 0);
    const fat = log.foods.reduce((s, f) => s + (f.fat || 0), 0);
    result.push({
      date: key,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      water: log.water || 0
    });
  }
  return result;
}

// ── Settings ──────────────────────────────────────────────────────

function getSettings() {
  return loadDB().settings;
}

function saveSettings(updates) {
  const db = loadDB();
  db.settings = { ...db.settings, ...updates };
  saveDB(db);
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

// ── Mapping and Sync helpers ──────────────────────────────────────

function mapFrontendToBackendProfile(fe) {
  return {
    age: fe.age !== undefined ? parseInt(fe.age, 10) : undefined,
    weight: fe.weight !== undefined ? parseFloat(fe.weight) : undefined,
    height: fe.height !== undefined ? parseFloat(fe.height) : undefined,
    gender: fe.gender,
    activity_level: fe.activity !== undefined ? parseFloat(fe.activity) : undefined,
    fitness_goal: fe.goal,
    macro_split: fe.macroSplit,
    custom_protein: fe.customProtein !== undefined ? parseFloat(fe.customProtein) : undefined,
    custom_carbs: fe.customCarbs !== undefined ? parseFloat(fe.customCarbs) : undefined,
    custom_fat: fe.customFat !== undefined ? parseFloat(fe.customFat) : undefined,
    water_target: fe.waterTarget !== undefined ? parseInt(fe.waterTarget, 10) : undefined
  };
}

function mapBackendToFrontendProfile(be) {
  if (!be) return null;
  return {
    isSetup: true,
    name: 'User',
    age: be.age !== null ? parseInt(be.age, 10) : 25,
    weight: be.weight !== null ? parseFloat(be.weight) : 70,
    height: be.height !== null ? parseFloat(be.height) : 175,
    gender: be.gender || 'male',
    activity: be.activity_level !== null ? parseFloat(be.activity_level) : 1.55,
    goal: be.fitness_goal || 'maintain',
    macroSplit: be.macro_split || 'balanced',
    customProtein: be.custom_protein !== null ? parseFloat(be.custom_protein) : 25,
    customCarbs: be.custom_carbs !== null ? parseFloat(be.custom_carbs) : 45,
    customFat: be.custom_fat !== null ? parseFloat(be.custom_fat) : 30,
    waterTarget: be.water_target !== null ? parseInt(be.water_target, 10) : 2500
  };
}

function mapFrontendToBackendFood(fe, dateKey) {
  return {
    id: fe.id,
    food_name: fe.name,
    quantity_grams: fe.quantity,
    calories: fe.calories,
    protein: fe.protein || 0,
    carbs: fe.carbs || 0,
    fat: fe.fat || 0,
    meal_type: fe.meal || 'breakfast',
    log_date: dateKey
  };
}

function mapBackendToFrontendFood(be) {
  return {
    id: be.id,
    timestamp: be.created_at || new Date().toISOString(),
    name: be.food_name,
    meal: be.meal_type,
    quantity: parseFloat(be.quantity_grams),
    calories: parseInt(be.calories, 10),
    protein: parseFloat(be.protein || 0),
    carbs: parseFloat(be.carbs || 0),
    fat: parseFloat(be.fat || 0)
  };
}

function formatDate(dateVal) {
  if (!dateVal) return todayKey();
  const str = String(dateVal);
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  return str;
}

async function sync() {
  if (!window.Auth || !window.Auth.isAuthenticated()) return;
  try {
    const db = loadDB();

    // 1. Sync Profile
    const profileRes = await window.Auth.apiRequest('/auth/profile');
    if (profileRes && profileRes.status === 'success' && profileRes.data && profileRes.data.profile) {
      db.profile = mapBackendToFrontendProfile(profileRes.data.profile);
    }

    // 2. Sync All Food Logs
    const foodsRes = await window.Auth.apiRequest('/food-logs');
    const foodLogs = (foodsRes && foodsRes.data && foodsRes.data.foodLogs) || [];

    // 3. Sync All Water Logs
    const waterRes = await window.Auth.apiRequest('/water-logs');
    const waterLogs = (waterRes && waterRes.data && waterRes.data.waterLogs) || [];

    // Clear old logs so we only have what's on the server
    db.logs = {};

    // Rebuild logs
    foodLogs.forEach(beFood => {
      const dateKey = formatDate(beFood.log_date);
      if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };
      db.logs[dateKey].foods.push(mapBackendToFrontendFood(beFood));
    });

    waterLogs.forEach(beWater => {
      const dateKey = formatDate(beWater.log_date);
      if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };
      db.logs[dateKey].water += parseInt(beWater.amount_ml || 0, 10);
    });

    saveDB(db);
    console.log("Database synced with backend server successfully.");
  } catch (e) {
    console.error("Database sync failed:", e);
  }
}

// Export as global
window.Storage = {
  getProfile, saveProfile,
  getFoods, addFood, updateFood, deleteFood,
  getWater, addWater, setWater,
  getDayLog, saveDayLog,
  getWeeklyData,
  getSettings, saveSettings,
  getStreak,
  todayKey, getLocalDateString
};
