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
  return food;
}

function updateFood(dateKey, id, updates) {
  const db = loadDB();
  if (!db.logs[dateKey]) return;
  const idx = db.logs[dateKey].foods.findIndex(f => f.id === id);
  if (idx !== -1) {
    db.logs[dateKey].foods[idx] = { ...db.logs[dateKey].foods[idx], ...updates };
    saveDB(db);
  }
}

function deleteFood(dateKey, id) {
  const db = loadDB();
  if (!db.logs[dateKey]) return;
  db.logs[dateKey].foods = db.logs[dateKey].foods.filter(f => f.id !== id);
  saveDB(db);
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
  return db.logs[dateKey].water;
}

function setWater(dateKey, ml) {
  const db = loadDB();
  if (!db.logs[dateKey]) db.logs[dateKey] = { foods: [], water: 0 };
  db.logs[dateKey].water = ml;
  saveDB(db);
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
