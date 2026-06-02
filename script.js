// ====================================================================
// NutriPlan Lite - Premium JavaScript Controller & Integrations
// ====================================================================

// Global Application Configuration & State
let config = {
    supabaseUrl: localStorage.getItem('np_supabase_url') || '',
    supabaseKey: localStorage.getItem('np_supabase_key') || '',
    geminiKey: localStorage.getItem('np_gemini_key') || ''
};

let supabaseClient = null;
let currentUser = null;
let currentSelectedDate = '';
let foodDatabase = {};

const notificationMeta = {
    success: { title: 'Success', icon: '✓' },
    error: { title: 'Error', icon: '!' },
    warning: { title: 'Heads up', icon: '?' },
    info: { title: 'Notice', icon: 'i' }
};

function inferNotificationType(message) {
    const text = String(message).toLowerCase();
    if (/(success|saved|updated|sent|logged|synchronized)/.test(text)) return 'success';
    if (/(error|failed|failure|unable|missing|required|invalid|corrupted)/.test(text)) return 'error';
    if (/(please|verify|must|check|configure)/.test(text)) return 'warning';
    return 'info';
}

function removeNotification(toast) {
    if (!toast || toast.classList.contains('is-leaving')) return;
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

function showNotification(message, type = 'info', duration = 4500) {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.log(message);
        return;
    }

    const safeType = notificationMeta[type] ? type : 'info';
    const meta = notificationMeta[safeType];
    const toast = document.createElement('div');
    toast.className = `app-toast app-toast-${safeType}`;
    toast.setAttribute('role', safeType === 'error' ? 'alert' : 'status');

    toast.innerHTML = `
        <div class="toast-icon">${meta.icon}</div>
        <div>
            <p class="toast-title">${meta.title}</p>
            <p class="toast-message"></p>
        </div>
        <button type="button" class="toast-close" aria-label="Dismiss notification">
            ×
        </button>
    `;

    toast.querySelector('.toast-message').innerText = message;
    toast.querySelector('.toast-close').addEventListener('click', () => removeNotification(toast));
    container.appendChild(toast);

    window.setTimeout(() => removeNotification(toast), duration);
}

function notify(message, type, duration) {
    showNotification(message, type || inferNotificationType(message), duration);
}

window.alert = (message) => notify(message);

// Local Fallback State (when Supabase is not configured)
let localState = {
    profile: {
        age: 25,
        weight: 70,
        height: 175,
        gender: 'male',
        activity: '1.2',
        fitnessGoal: 'maintain',
        macroSplit: 'balanced',
        customProtein: 25,
        customCarbs: 45,
        customFat: 30,
        waterTarget: 2500
    },
    history: {} // Schema: { "YYYY-MM-DD": { loggedEntries: [], waterConsumed: 0 } }
};

// Active state for the currently loaded date
let dayState = {
    loggedEntries: [],
    waterConsumed: 0,
    targets: {
        calories: 2000,
        macros: { protein: 125, carbs: 225, fat: 67 }
    },
    consumedTotals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
    }
};

// Initialize Application
window.addEventListener('DOMContentLoaded', async () => {
    initDate();
    await loadFoodDatabase();
    initSupabase();
    loadConfigUI();
    
    // Setup event listeners for clicking outside autocomplete suggestions
    document.addEventListener('click', (e) => {
        const inputEl = document.getElementById('food-input');
        const listEl = document.getElementById('autocomplete-list');
        if (listEl && e.target !== inputEl && e.target !== listEl && !listEl.contains(e.target)) {
            hideSuggestions();
        }
    });

    // Check custom macros toggle onload
    toggleCustomMacros();
});

// Setup Initial Date to Today
function initDate() {
    const today = getLocalDateString(new Date());
    currentSelectedDate = today;
    const picker = document.getElementById('calendar-picker');
    if (picker) {
        picker.value = today;
        picker.max = today; // Prevent logging in future (optional)
    }
}

// Format date to local YYYY-MM-DD
function getLocalDateString(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

// Load Food Database from foodDB.json
async function loadFoodDatabase() {
    try {
        const response = await fetch('foodDB.json');
        if (response.ok) {
            foodDatabase = await response.json();
            console.log('Loaded food database successfully.');
        } else {
            throw new Error('Fallback database used');
        }
    } catch (e) {
        console.warn("Could not load foodDB.json, using local fallback DB", e);
        // Minimum local fallback database
        foodDatabase = {
            'apple': { cal: 52, carbs: 14, protein: 0.3, fat: 0.2 },
            'banana': { cal: 89, carbs: 23, protein: 1.1, fat: 0.3 },
            'orange': { cal: 47, carbs: 12, protein: 0.9, fat: 0.1 },
            'rice': { cal: 130, carbs: 28, protein: 2.7, fat: 0.3 },
            'egg': { cal: 155, carbs: 1.1, protein: 13, fat: 11 },
            'chicken breast': { cal: 165, carbs: 0, protein: 31, fat: 3.6 },
            'oats': { cal: 389, carbs: 66, protein: 16.9, fat: 6.9 },
            'milk': { cal: 42, carbs: 5, protein: 3.4, fat: 1 },
            'paneer': { cal: 265, carbs: 1.2, protein: 18, fat: 20 },
            'tofu': { cal: 76, carbs: 1.9, protein: 8, fat: 4.8 }
        };
    }
}

// Initialize Supabase Client
function initSupabase() {
    const demoBadge = document.getElementById('demo-badge');
    const loginBtn = document.getElementById('login-trigger-btn');
    const userInfo = document.getElementById('user-info');

    if (config.supabaseUrl && config.supabaseKey) {
        try {
            if (!window.supabase || !window.supabase.createClient) {
                throw new Error("Supabase SDK is not loaded.");
            }

            supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
            if (demoBadge) demoBadge.classList.add('hidden');
            
            // Listen for authentication changes
            supabaseClient.auth.onAuthStateChange((event, session) => {
                if (session) {
                    currentUser = session.user;
                    const emailEl = document.getElementById('user-email');
                    if (emailEl) emailEl.innerText = currentUser.email;
                    if (userInfo) userInfo.classList.remove('hidden');
                    if (loginBtn) loginBtn.classList.add('hidden');
                    loadUserData();
                } else {
                    currentUser = null;
                    if (userInfo) userInfo.classList.add('hidden');
                    if (loginBtn) loginBtn.classList.remove('hidden');
                    loadLocalFallbackData();
                }
            });

            // Render immediately instead of relying only on the auth listener.
            supabaseClient.auth.getSession()
                .then(({ data, error }) => {
                    if (error) throw error;

                    const session = data?.session;
                    if (session) {
                        currentUser = session.user;
                        const emailEl = document.getElementById('user-email');
                        if (emailEl) emailEl.innerText = currentUser.email;
                        if (userInfo) userInfo.classList.remove('hidden');
                        if (loginBtn) loginBtn.classList.add('hidden');
                        loadUserData();
                    } else {
                        currentUser = null;
                        if (userInfo) userInfo.classList.add('hidden');
                        if (loginBtn) loginBtn.classList.remove('hidden');
                        loadLocalFallbackData();
                    }
                })
                .catch((err) => {
                    console.error("Supabase session check failed:", err);
                    setupLocalDemoMode(demoBadge, loginBtn, userInfo);
                });
        } catch (err) {
            console.error("Supabase connection failed:", err);
            setupLocalDemoMode(demoBadge, loginBtn, userInfo);
        }
    } else {
        setupLocalDemoMode(demoBadge, loginBtn, userInfo);
    }
}

// Helper to activate Local Fallback UI
function setupLocalDemoMode(demoBadge, loginBtn, userInfo) {
    supabaseClient = null;
    currentUser = null;
    if (demoBadge) demoBadge.classList.remove('hidden');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (userInfo) userInfo.classList.add('hidden');
    loadLocalFallbackData();
}

// Load configurations into config modal inputs
function loadConfigUI() {
    document.getElementById('supabase-url-input').value = config.supabaseUrl;
    document.getElementById('supabase-key-input').value = config.supabaseKey;
    document.getElementById('gemini-key-input').value = config.geminiKey;
}

// Open Config settings modal
function openConfigModal() {
    document.getElementById('config-modal').classList.remove('hidden');
}

// Close Config settings modal
function closeConfigModal() {
    document.getElementById('config-modal').classList.add('hidden');
}

// Save database & AI settings
function saveConfiguration() {
    const url = document.getElementById('supabase-url-input').value.trim();
    const key = document.getElementById('supabase-key-input').value.trim();
    const gemini = document.getElementById('gemini-key-input').value.trim();

    localStorage.setItem('np_supabase_url', url);
    localStorage.setItem('np_supabase_key', key);
    localStorage.setItem('np_gemini_key', gemini);

    notify("Configuration saved. The application will reload to apply changes.", "success", 1800);
    window.setTimeout(() => window.location.reload(), 900);
}

// ====================================================================
// AUTHENTICATION & OVERLAYS
// ====================================================================

let activeAuthTab = 'login';

function openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
    switchAuthTab('login');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function switchAuthTab(tab) {
    activeAuthTab = tab;
    const loginTab = document.getElementById('auth-tab-login');
    const signupTab = document.getElementById('auth-tab-signup');
    const submitBtn = document.getElementById('auth-submit-btn');
    const forgotLink = document.getElementById('forgot-password-link');

    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        submitBtn.innerText = "Sign In";
        forgotLink.classList.remove('hidden');
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        submitBtn.innerText = "Register Account";
        forgotLink.classList.add('hidden');
    }
}

async function submitAuthForm() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();

    if (!email || !password) {
        alert("Please fill in email and password fields.");
        return;
    }

    if (!supabaseClient) {
        alert("Please configure Supabase connection first.");
        return;
    }

    try {
        if (activeAuthTab === 'login') {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            closeAuthModal();
        } else {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            alert("Sign up successful! Please check your email for confirmation link.");
            closeAuthModal();
        }
    } catch (err) {
        alert("Authentication Error: " + err.message);
    }
}

async function handleLogout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
        window.location.reload();
    }
}

function handleForgotPassword() {
    const email = document.getElementById('auth-email').value.trim();
    if (!email) {
        alert("Please enter your email address to reset password.");
        return;
    }
    if (supabaseClient) {
        supabaseClient.auth.resetPasswordForEmail(email)
            .then(({ error }) => {
                if (error) throw error;
                alert("Password reset email sent!");
            })
            .catch(err => alert(err.message));
    }
}

// ====================================================================
// CORE DATA LOADERS & CALCULATIONS
// ====================================================================

// Fetch user data from Supabase DB
async function loadUserData() {
    if (!supabaseClient || !currentUser) return;

    try {
        // 1. Fetch Profile
        let { data: profile, error: pError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (pError) throw pError;

        // Fallback or Trigger safeguard: Insert default profile row if not present
        if (!profile) {
            const defaultProfile = {
                user_id: currentUser.id,
                age: 25,
                weight: 70,
                height: 175,
                gender: 'male',
                activity_level: 1.2,
                fitness_goal: 'maintain',
                macro_split: 'balanced',
                water_target: 2500
            };
            const { data: newProfile, error: insError } = await supabaseClient
                .from('profiles')
                .insert([defaultProfile])
                .select()
                .single();
            
            if (insError) throw insError;
            profile = newProfile;
        }

        // Set inputs
        document.getElementById('age').value = profile.age;
        document.getElementById('weight').value = profile.weight;
        document.getElementById('height').value = profile.height;
        document.getElementById('gender').value = profile.gender;
        document.getElementById('activity').value = profile.activity_level.toString();
        document.getElementById('fitness-goal').value = profile.fitness_goal;
        document.getElementById('macro-split').value = profile.macro_split;
        document.getElementById('custom-protein-pct').value = profile.custom_protein || 25;
        document.getElementById('custom-carbs-pct').value = profile.custom_carbs || 45;
        document.getElementById('custom-fat-pct').value = profile.custom_fat || 30;
        document.getElementById('water-target-input').value = profile.water_target;

        toggleCustomMacros();

        // 2. Fetch logged data for the current date
        const dateQuery = currentSelectedDate;
        
        let { data: foodLogs, error: fError } = await supabaseClient
            .from('food_logs')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('log_date', dateQuery);
        
        if (fError) throw fError;

        let { data: waterLogs, error: wError } = await supabaseClient
            .from('water_logs')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('log_date', dateQuery);

        if (wError) throw wError;

        // Calculate water sums
        const totalWater = waterLogs.reduce((sum, item) => sum + item.amount_ml, 0);

        // Load into State
        dayState.loggedEntries = foodLogs.map(item => ({
            id: item.id,
            name: item.food_name,
            qty: parseFloat(item.quantity_grams),
            cal: item.calories,
            protein: parseFloat(item.protein),
            carbs: parseFloat(item.carbs),
            fat: parseFloat(item.fat),
            mealType: item.meal_type
        }));
        dayState.waterConsumed = totalWater;

        calculateTargetNutrition(profile);
        recalculateTotals();
        refreshUI();

    } catch (err) {
        console.error("Error loading user data:", err);
    }
}

// Load data in Local Fallback mode
function loadLocalFallbackData() {
    const saved = localStorage.getItem('nutriPlanLocalState');
    if (saved) {
        try {
            localState = JSON.parse(saved);
        } catch (e) {
            console.error("Local data corrupted, resetting");
        }
    }

    // Safeguard profile and history structures
    if (!localState) {
        localState = {};
    }
    if (!localState.profile) {
        localState.profile = {
            age: 25,
            weight: 70,
            height: 175,
            gender: 'male',
            activity: '1.2',
            fitnessGoal: 'maintain',
            macroSplit: 'balanced',
            customProtein: 25,
            customCarbs: 45,
            customFat: 30,
            waterTarget: 2500
        };
    }
    if (!localState.history) {
        localState.history = {};
    }

    // Populate inputs from localState
    document.getElementById('age').value = localState.profile.age || 25;
    document.getElementById('weight').value = localState.profile.weight || 70;
    document.getElementById('height').value = localState.profile.height || 175;
    document.getElementById('gender').value = localState.profile.gender || 'male';
    document.getElementById('activity').value = localState.profile.activity || '1.2';
    document.getElementById('fitness-goal').value = localState.profile.fitnessGoal || 'maintain';
    document.getElementById('macro-split').value = localState.profile.macroSplit || 'balanced';
    document.getElementById('custom-protein-pct').value = localState.profile.customProtein || 25;
    document.getElementById('custom-carbs-pct').value = localState.profile.customCarbs || 45;
    document.getElementById('custom-fat-pct').value = localState.profile.customFat || 30;
    document.getElementById('water-target-input').value = localState.profile.waterTarget || 2500;

    toggleCustomMacros();

    // Retrieve selected day details
    const dayData = localState.history[currentSelectedDate] || { loggedEntries: [], waterConsumed: 0 };
    dayState.loggedEntries = dayData.loggedEntries || [];
    dayState.waterConsumed = dayData.waterConsumed || 0;

    calculateTargetNutrition(localState.profile);
    recalculateTotals();
    refreshUI();
}

// Calculate target Calorie & Macros split
function calculateTargetNutrition(profile) {
    const age = parseFloat(profile.age || profile.age_level);
    const weight = parseFloat(profile.weight);
    const height = parseFloat(profile.height);
    const gender = profile.gender;
    // Activity level maps differently depending on key formats
    const activity = parseFloat(profile.activity_level || profile.activity || 1.2);
    const goal = profile.fitness_goal || profile.fitnessGoal || 'maintain';
    const splitType = profile.macro_split || profile.macroSplit || 'balanced';

    if (age && weight && height) {
        // Mifflin-St Jeor Equation
        let bmr = 0;
        if (gender === 'female') {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        }

        // TDEE
        let tdee = Math.round(bmr * activity);

        // Adjust based on goal
        if (goal === 'lose') {
            dayState.targets.calories = Math.max(1200, tdee - 500); // 1200 kcal floor safety limit
        } else if (goal === 'gain') {
            dayState.targets.calories = tdee + 300;
        } else {
            dayState.targets.calories = tdee;
        }

        // Select splits: Protein (4 kcal/g), Carbs (4 kcal/g), Fats (9 kcal/g)
        let cp = 25, cc = 45, cf = 30;
        if (splitType === 'lowcarb') {
            cp = 40; cc = 15; cf = 45;
        } else if (splitType === 'highprotein') {
            cp = 40; cc = 35; cf = 25;
        } else if (splitType === 'custom') {
            cp = parseFloat(profile.custom_protein || profile.customProtein || 25);
            cc = parseFloat(profile.custom_carbs || profile.customCarbs || 45);
            cf = parseFloat(profile.custom_fat || profile.customFat || 30);
            
            // Total sanitization check (must equal 100%)
            if (cp + cc + cf !== 100) {
                // Adjust balanced default
                cp = 25; cc = 45; cf = 30;
            }
        }

        dayState.targets.macros.protein = Math.round((dayState.targets.calories * (cp / 100)) / 4);
        dayState.targets.macros.carbs = Math.round((dayState.targets.calories * (cc / 100)) / 4);
        dayState.targets.macros.fat = Math.round((dayState.targets.calories * (cf / 100)) / 9);
        dayState.targets.waterTarget = parseInt(profile.water_target || profile.waterTarget || 2500);
    }
}

// Update settings values from DOM input to DB/Storage
async function updateProfileSettings() {
    const age = parseInt(document.getElementById('age').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const gender = document.getElementById('gender').value;
    const activity = parseFloat(document.getElementById('activity').value);
    const fitnessGoal = document.getElementById('fitness-goal').value;
    const macroSplit = document.getElementById('macro-split').value;
    const customProtein = parseInt(document.getElementById('custom-protein-pct').value);
    const customCarbs = parseInt(document.getElementById('custom-carbs-pct').value);
    const customFat = parseInt(document.getElementById('custom-fat-pct').value);
    const waterTarget = parseInt(document.getElementById('water-target-input').value);

    // Validation limits
    if (!age || age < 1 || age > 120) return alert("Please enter a valid age.");
    if (!weight || weight < 10 || weight > 300) return alert("Please enter a valid weight (10kg - 300kg).");
    if (!height || height < 50 || height > 280) return alert("Please enter a valid height (50cm - 280cm).");
    if (macroSplit === 'custom' && (customProtein + customCarbs + customFat !== 100)) {
        return alert("Custom macro percentages must add up to exactly 100%. (Currently: " + (customProtein + customCarbs + customFat) + "%)");
    }

    if (currentUser && supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('profiles')
                .update({
                    age,
                    weight,
                    height,
                    gender,
                    activity_level: activity,
                    fitness_goal: fitnessGoal,
                    macro_split: macroSplit,
                    custom_protein: customProtein,
                    custom_carbs: customCarbs,
                    custom_fat: customFat,
                    water_target: waterTarget,
                    updated_at: new Date()
                })
                .eq('user_id', currentUser.id);

            if (error) throw error;
            alert("Goal details successfully synchronized to online database!");
            await loadUserData();
        } catch (err) {
            alert("Database Error: " + err.message);
        }
    } else {
        // Update Local Fallback state
        localState.profile = {
            age, weight, height, gender,
            activity: activity.toString(),
            fitnessGoal, macroSplit,
            customProtein, customCarbs, customFat,
            waterTarget
        };
        saveLocalState();
        loadLocalFallbackData();
        alert("Goals updated locally!");
    }
}

// Local Fallback Storage Saver
function saveLocalState() {
    // Sync current dayState logs back to localState history
    if (!localState) {
        localState = {};
    }
    if (!localState.history) {
        localState.history = {};
    }
    localState.history[currentSelectedDate] = {
        loggedEntries: dayState.loggedEntries,
        waterConsumed: dayState.waterConsumed
    };
    localStorage.setItem('nutriPlanLocalState', JSON.stringify(localState));
}

// Toggle Custom macros panel visibility
function toggleCustomMacros() {
    const macroVal = document.getElementById('macro-split').value;
    const customPanel = document.getElementById('custom-macros-row');
    if (macroVal === 'custom') {
        customPanel.classList.remove('hidden');
    } else {
        customPanel.classList.add('hidden');
    }
}

// Toggle sidebar section collapse
function toggleSection(sectionId) {
    const el = document.getElementById(sectionId);
    const arrow = document.getElementById(sectionId === 'profile-settings' ? 'profile-arrow' : '');
    
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
        el.classList.add('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
}

// Recalculate logged macros and calories summation
function recalculateTotals() {
    dayState.consumedTotals.calories = 0;
    dayState.consumedTotals.protein = 0;
    dayState.consumedTotals.carbs = 0;
    dayState.consumedTotals.fat = 0;

    dayState.loggedEntries.forEach(entry => {
        const normalized = normalizeEntry(entry);
        dayState.consumedTotals.calories += normalized.calories;
        dayState.consumedTotals.protein += normalized.protein;
        dayState.consumedTotals.carbs += normalized.carbs;
        dayState.consumedTotals.fat += normalized.fats;
    });

    // Rounding decimals
    dayState.consumedTotals.protein = Math.round(dayState.consumedTotals.protein * 10) / 10;
    dayState.consumedTotals.carbs = Math.round(dayState.consumedTotals.carbs * 10) / 10;
    dayState.consumedTotals.fat = Math.round(dayState.consumedTotals.fat * 10) / 10;
}

// ====================================================================
// FOOD LOGGING LOGIC
// ====================================================================

let activeLoggingMealType = 'breakfast';
let editingEntryId = null;

function openAddFoodModal(mealType = 'breakfast') {
    activeLoggingMealType = mealType || 'breakfast';
    document.getElementById('food-meal-type').value = activeLoggingMealType;
    document.getElementById('add-food-modal').classList.remove('hidden');
    document.body.classList.add('drawer-open');
    document.getElementById('food-input').focus();
}

function closeAddFoodModal() {
    document.getElementById('add-food-modal').classList.add('hidden');
    document.body.classList.remove('drawer-open');
    editingEntryId = null;
    // Clear fields
    document.getElementById('food-input').value = '';
    document.getElementById('qty-input').value = '';
    document.getElementById('manual-cal').value = '';
    document.getElementById('manual-protein').value = '';
    document.getElementById('manual-carbs').value = '';
    document.getElementById('manual-fat').value = '';
    
    const toggle = document.getElementById('toggle-manual-nutrients');
    if (toggle.checked) {
        toggle.checked = false;
        toggleManualNutritionFields();
    }
}

function normalizeEntry(entry) {
    return {
        id: entry.id,
        category: entry.category || entry.mealType || 'snack',
        foodName: entry.foodName || entry.name || 'Food item',
        quantity: parseFloat(entry.quantity || entry.qty || 100),
        calories: Math.round(parseFloat(entry.calories ?? entry.cal ?? 0)),
        protein: Math.round((parseFloat(entry.protein || 0)) * 10) / 10,
        carbs: Math.round((parseFloat(entry.carbs || 0)) * 10) / 10,
        fats: Math.round((parseFloat(entry.fats ?? entry.fat ?? 0)) * 10) / 10,
        createdAt: entry.createdAt || entry.created_at || entry.id || new Date().toISOString()
    };
}

function toStoredEntry(entry) {
    return {
        id: entry.id,
        category: entry.category,
        foodName: entry.foodName,
        quantity: entry.quantity,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        createdAt: entry.createdAt,
        mealType: entry.category,
        name: entry.foodName,
        qty: entry.quantity,
        cal: entry.calories,
        fat: entry.fats
    };
}

function toggleManualNutritionFields() {
    const isChecked = document.getElementById('toggle-manual-nutrients').checked;
    const manualFields = document.getElementById('manual-nutrient-fields');
    if (isChecked) {
        manualFields.classList.remove('hidden');
    } else {
        manualFields.classList.add('hidden');
    }
}

// Autocomplete suggestions
function showSuggestions() {
    const inputEl = document.getElementById('food-input');
    const listEl = document.getElementById('autocomplete-list');
    const query = inputEl.value.toLowerCase().trim();

    if (!query) {
        hideSuggestions();
        return;
    }

    const matches = Object.keys(foodDatabase).filter(key => key.includes(query)).slice(0, 5);

    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    listEl.innerHTML = '';
    matches.forEach(match => {
        const item = foodDatabase[match];
        const div = document.createElement('div');
        div.className = "suggestion-item";
        div.innerHTML = `
            <strong>${match}</strong>
            <span>C:${item.carbs}g P:${item.protein}g F:${item.fat}g | ${item.cal} kcal/100g</span>
        `;
        div.addEventListener('click', () => {
            inputEl.value = match;
            hideSuggestions();
            document.getElementById('qty-input').focus();
        });
        listEl.appendChild(div);
    });

    listEl.classList.remove('hidden');
}

function hideSuggestions() {
    const listEl = document.getElementById('autocomplete-list');
    if (listEl) listEl.classList.add('hidden');
}

// Log food entry (manual or autocomplete)
async function addEntry() {
    const foodInput = document.getElementById('food-input');
    const qtyInput = document.getElementById('qty-input');
    const mealSelect = document.getElementById('food-meal-type');
    
    const name = foodInput.value.trim();
    const qty = parseFloat(qtyInput.value) || 100;
    const mealType = mealSelect.value;

    if (!name) return alert("Please enter a food item.");

    let entryCal = 0, entryCarbs = 0, entryProtein = 0, entryFat = 0;

    const manualToggle = document.getElementById('toggle-manual-nutrients').checked;
    if (manualToggle) {
        // Manual input values
        entryCal = Math.round(parseFloat(document.getElementById('manual-cal').value) || 0);
        entryProtein = Math.round((parseFloat(document.getElementById('manual-protein').value) || 0) * 10) / 10;
        entryCarbs = Math.round((parseFloat(document.getElementById('manual-carbs').value) || 0) * 10) / 10;
        entryFat = Math.round((parseFloat(document.getElementById('manual-fat').value) || 0) * 10) / 10;
    } else {
        // Database lookup
        let baseInfo = foodDatabase[name.toLowerCase()];
        if (!baseInfo) {
            // General generic item fallback
            baseInfo = { cal: 120, carbs: 12, protein: 8, fat: 4 };
        }
        const factor = qty / 100;
        entryCal = Math.round(baseInfo.cal * factor);
        entryCarbs = Math.round(baseInfo.carbs * factor * 10) / 10;
        entryProtein = Math.round(baseInfo.protein * factor * 10) / 10;
        entryFat = Math.round(baseInfo.fat * factor * 10) / 10;
    }

    if (editingEntryId) {
        await saveEditedEntry(editingEntryId, {
            name,
            qty,
            mealType,
            cal: entryCal,
            protein: entryProtein,
            carbs: entryCarbs,
            fat: entryFat
        });
        closeAddFoodModal();
        return;
    }

    if (currentUser && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('food_logs')
                .insert([{
                    user_id: currentUser.id,
                    log_date: currentSelectedDate,
                    meal_type: mealType,
                    food_name: name,
                    quantity_grams: qty,
                    calories: entryCal,
                    protein: entryProtein,
                    carbs: entryCarbs,
                    fat: entryFat
                }])
                .select();

            if (error) throw error;
            await loadUserData();
        } catch (err) {
            alert("Database Error: " + err.message);
        }
    } else {
        // Local mode log addition
        const newLocalEntry = {
            id: Date.now().toString(),
            category: mealType,
            foodName: name,
            quantity: qty,
            calories: entryCal,
            protein: entryProtein,
            carbs: entryCarbs,
            fats: entryFat,
            createdAt: new Date().toISOString(),
            name,
            qty,
            cal: entryCal,
            fat: entryFat,
            mealType
        };
        dayState.loggedEntries.push(newLocalEntry);
        saveLocalState();
        loadLocalFallbackData();
    }

    closeAddFoodModal();
}

// Edit Logged Entry Quantity
async function editEntry(id) {
    const entry = dayState.loggedEntries.find(e => e.id === id);
    if (!entry) return;

    const normalized = normalizeEntry(entry);
    editingEntryId = id;
    openAddFoodModal(normalized.category);

    document.getElementById('food-input').value = normalized.foodName;
    document.getElementById('qty-input').value = normalized.quantity;
    document.getElementById('manual-cal').value = normalized.calories;
    document.getElementById('manual-protein').value = normalized.protein;
    document.getElementById('manual-carbs').value = normalized.carbs;
    document.getElementById('manual-fat').value = normalized.fats;
    
    const toggle = document.getElementById('toggle-manual-nutrients');
    toggle.checked = true;
    toggleManualNutritionFields();
}

async function saveEditedEntry(id, updatedEntry) {
    const newQty = parseFloat(updatedEntry.qty);
    if (isNaN(newQty) || newQty <= 0) {
        return alert("Please enter a valid positive number.");
    }
    
    // Lookup base factors
    const entryCal = updatedEntry.cal;
    const entryCarbs = updatedEntry.carbs;
    const entryProtein = updatedEntry.protein;
    const entryFat = updatedEntry.fat;

    if (currentUser && supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('food_logs')
                .update({
                    meal_type: updatedEntry.mealType,
                    food_name: updatedEntry.name,
                    quantity_grams: newQty,
                    calories: entryCal,
                    protein: entryProtein,
                    carbs: entryCarbs,
                    fat: entryFat
                })
                .eq('id', id);

            if (error) throw error;
            await loadUserData();
        } catch (err) {
            alert("Database Update Error: " + err.message);
        }
    } else {
        const entry = dayState.loggedEntries.find(e => e.id === id);
        if (!entry) return;
        entry.category = updatedEntry.mealType;
        entry.foodName = updatedEntry.name;
        entry.quantity = newQty;
        entry.calories = entryCal;
        entry.fats = entryFat;
        entry.mealType = updatedEntry.mealType;
        entry.name = updatedEntry.name;
        entry.qty = newQty;
        entry.cal = entryCal;
        entry.carbs = entryCarbs;
        entry.protein = entryProtein;
        entry.fat = entryFat;
        saveLocalState();
        loadLocalFallbackData();
    }
}

// Delete Logged Entry
async function deleteEntry(id) {
    if (!confirm("Are you sure you want to delete this food entry?")) return;

    if (currentUser && supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('food_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadUserData();
        } catch (err) {
            alert("Database Delete Error: " + err.message);
        }
    } else {
        dayState.loggedEntries = dayState.loggedEntries.filter(e => e.id !== id);
        saveLocalState();
        loadLocalFallbackData();
    }
}

// ====================================================================
// WATER HYDRATION TRACKING LOGIC
// ====================================================================

async function addWater(amount) {
    if (currentUser && supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('water_logs')
                .insert([{
                    user_id: currentUser.id,
                    log_date: currentSelectedDate,
                    amount_ml: amount
                }]);
            
            if (error) throw error;
            await loadUserData();
        } catch (err) {
            alert("Database Error: " + err.message);
        }
    } else {
        dayState.waterConsumed += amount;
        saveLocalState();
        loadLocalFallbackData();
    }
}

async function resetWater() {
    if (!confirm("Reset water hydration for today?")) return;

    if (currentUser && supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('water_logs')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('log_date', currentSelectedDate);
            
            if (error) throw error;
            await loadUserData();
        } catch (err) {
            alert("Database Error: " + err.message);
        }
    } else {
        dayState.waterConsumed = 0;
        saveLocalState();
        loadLocalFallbackData();
    }
}

// ====================================================================
// CALENDAR & NAVIGATION CONTROL
// ====================================================================

function setDateFromCalendar(val) {
    currentSelectedDate = val;
    if (currentUser && supabaseClient) {
        loadUserData();
    } else {
        loadLocalFallbackData();
    }
}

function changeDate(daysOffset) {
    const picker = document.getElementById('calendar-picker');
    const currentDateObj = new Date(currentSelectedDate + 'T00:00:00');
    currentDateObj.setDate(currentDateObj.getDate() + daysOffset);
    
    // Prevent selecting future date than today
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (currentDateObj > today) return;

    const formatted = getLocalDateString(currentDateObj);
    currentSelectedDate = formatted;
    picker.value = formatted;
    
    if (currentUser && supabaseClient) {
        loadUserData();
    } else {
        loadLocalFallbackData();
    }
}

// ====================================================================
// REAL-TIME RENDERING & UI UPDATES
// ====================================================================

function refreshUI() {
    // Update AI insights each UI refresh
    generateAIInsights();
    // Calorie remaining & stats calculation
    const targetCal = dayState.targets.calories;
    const consumedCal = dayState.consumedTotals.calories;
    const remainingCal = Math.max(0, targetCal - consumedCal);
    const caloriePercentage = targetCal > 0 ? Math.min(100, (consumedCal / targetCal) * 100) : 0;

    document.getElementById('calories-remaining').innerText = remainingCal;
    document.getElementById('calories-progress-txt').innerText = `${consumedCal} / ${targetCal} kcal`;
    const caloriesSummary = document.getElementById('calories-summary');
    if (caloriesSummary) caloriesSummary.innerText = `${consumedCal} / ${targetCal} kcal`;
    const caloriesBar = document.getElementById('calories-bar');
    if (caloriesBar) caloriesBar.style.width = `${caloriePercentage}%`;
    const calorieRing = document.getElementById('calorie-ring');
    if (calorieRing) calorieRing.style.setProperty('--progress', `${caloriePercentage}%`);

    // Dynamic message show
    const msgEl = document.getElementById('target-message');
    if (msgEl) {
        if (consumedCal >= targetCal && targetCal > 0) {
            msgEl.classList.remove('hidden');
        } else {
            msgEl.classList.add('hidden');
        }
    }

    // Refresh progress bars for macronutrients
    renderMacroProgress('protein', dayState.consumedTotals.protein, dayState.targets.macros.protein);
    renderMacroProgress('carbs', dayState.consumedTotals.carbs, dayState.targets.macros.carbs);
    renderMacroProgress('fats', dayState.consumedTotals.fat, dayState.targets.macros.fat);

    // Refresh Hydration
    const targetWater = dayState.targets.waterTarget;
    document.getElementById('water-target').innerText = targetWater;
    document.getElementById('water-consumed').innerText = dayState.waterConsumed;
    const waterPercentage = Math.min(100, (dayState.waterConsumed / targetWater) * 100);
    document.getElementById('water-fill').style.height = `${waterPercentage}%`;

    // Generate AI insights and recommendations
    generateAIInsights();

    renderNutritionTimeline();
}

// Update Macro elements
function renderMacroProgress(idPrefix, consumed, target) {
    document.getElementById(`${idPrefix}-consumed`).innerText = Math.round(consumed);
    document.getElementById(`${idPrefix}-target`).innerText = Math.round(target);
    const percentage = Math.min(100, (consumed / target) * 100);
    document.getElementById(`${idPrefix}-bar`).style.width = `${percentage}%`;
}

function renderNutritionTimeline() {
    const container = document.getElementById('nutrition-timeline');
    const countEl = document.getElementById('entry-count');
    if (!container) return;

    const mealConfig = [
        { key: 'breakfast', label: 'Breakfast' },
        { key: 'lunch', label: 'Lunch' },
        { key: 'dinner', label: 'Dinner' },
        { key: 'snack', label: 'Snacks' }
    ];
    const entries = dayState.loggedEntries.map(normalizeEntry);
    if (countEl) {
        countEl.innerText = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
    }

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>No food logged yet</strong>
                <span>Add your first meal to start tracking today's nutrition.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    mealConfig.forEach(meal => {
        const mealEntries = entries
            .filter(entry => entry.category === meal.key)
            .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

        if (mealEntries.length === 0) return;

        const totalCalories = mealEntries.reduce((sum, entry) => sum + entry.calories, 0);
        const group = document.createElement('section');
        group.className = 'meal-group';
        group.innerHTML = `
            <div class="meal-heading">
                <strong>${meal.label}</strong>
                <span>${totalCalories} kcal</span>
            </div>
        `;

        mealEntries.forEach(entry => {
            const row = document.createElement('article');
            row.className = 'food-row';
            row.innerHTML = `
                <div>
                    <span class="food-name"></span>
                    <div class="food-meta">
                        <span>${entry.quantity}g</span>
                        <span>P:${entry.protein}g</span>
                        <span>C:${entry.carbs}g</span>
                        <span>F:${entry.fats}g</span>
                    </div>
                </div>
                <div>
                    <div class="food-kcal">${entry.calories} kcal</div>
                    <div class="row-actions">
                        <button type="button" onclick="editEntry('${entry.id}')">Edit</button>
                        <button type="button" onclick="deleteEntry('${entry.id}')">Delete</button>
                    </div>
                </div>
            `;
            row.querySelector('.food-name').innerText = entry.foodName;
            group.appendChild(row);
        });

        container.appendChild(group);
    });
}

// ====================================================================
// GEMINI AI INTEGRATION (Quick Log & Coach Chatbot)
// ====================================================================

// REST call wrapper to generate content from Gemini API
async function generateGeminiContent(prompt) {
    if (!config.geminiKey) {
        throw new Error("Gemini API key is not configured. Click the settings gear in the top right to configure it.");
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API failure details:", errText);
        throw new Error("Failed to communicate with Gemini AI. Verify your API key is correct.");
    }

    const resJson = await response.json();
    try {
        return resJson.candidates[0].content.parts[0].text;
    } catch (e) {
        throw new Error("Unable to parse reply from Gemini AI response structure.");
    }
}

// Parse free-text input and append logs
async function processAIQuickLog() {
    const inputEl = document.getElementById('ai-input');
    const btnEl = document.getElementById('ai-log-btn');
    const spinner = document.getElementById('ai-log-spinner');
    
    const text = inputEl.value.trim();
    if (!text) return alert("Please type what you ate.");

    if (!config.geminiKey) {
        return alert("Gemini API key is missing. Click the settings cog in the top-right and add your Gemini API Key.");
    }

    // Block buttons during API call
    btnEl.disabled = true;
    spinner.classList.remove('hidden');

    const prompt = `You are a precise food parser for a calorie tracking application.
Parse the following user food log input. Detail each food item found, estimate its weight in grams based on standard serving sizes, and provide calories and macronutrients (protein, carbs, fat in grams).
Also suggest a meal_type (must be one of: 'breakfast', 'lunch', 'dinner', 'snack') based on the context. If no time/meal context is provided, default to 'snack'.

Strictly return a valid JSON array matching the schema below. Do NOT write markdown, code blocks (such as \`\`\`json), or any explanations. Return only the raw JSON.

Schema:
[
  {
    "food_name": "string",
    "quantity_grams": number,
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "meal_type": "breakfast" | "lunch" | "dinner" | "snack"
  }
]

User Input: "${text}"`;

    try {
        const aiResponseText = await generateGeminiContent(prompt);
        // Sanitize the response of code blocks if the model failed to follow instructions
        let sanitizedText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsedItems = JSON.parse(sanitizedText);
        
        if (!Array.isArray(parsedItems)) {
            throw new Error("AI response was not a list of items");
        }

        // Log each parsed item
        for (let item of parsedItems) {
            const name = item.food_name || 'Generic Food';
            const qty = parseFloat(item.quantity_grams) || 100;
            const cal = Math.round(item.calories) || 100;
            const protein = Math.round((item.protein || 0) * 10) / 10;
            const carbs = Math.round((item.carbs || 0) * 10) / 10;
            const fat = Math.round((item.fat || 0) * 10) / 10;
            const mealType = item.meal_type || 'snack';

            if (currentUser && supabaseClient) {
                const { error } = await supabaseClient
                    .from('food_logs')
                    .insert([{
                        user_id: currentUser.id,
                        log_date: currentSelectedDate,
                        meal_type: mealType,
                        food_name: name,
                        quantity_grams: qty,
                        calories: cal,
                        protein,
                        carbs,
                        fat
                    }]);
                if (error) throw error;
            } else {
                dayState.loggedEntries.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name,
                    qty,
                    cal,
                    protein,
                    carbs,
                    fat,
                    mealType
                });
            }
        }

        // Save and reload
        if (currentUser && supabaseClient) {
            await loadUserData();
        } else {
            saveLocalState();
            loadLocalFallbackData();
        }

        inputEl.value = '';
        alert(`Successfully parsed and logged ${parsedItems.length} food items!`);

    } catch (err) {
        alert("AI Parsing Failed: " + err.message);
        console.error("AI log parse error:", err);
    } finally {
        btnEl.disabled = false;
        spinner.classList.add('hidden');
    }
}

// Chat with Coach Aria
async function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');
    const message = chatInput.value.trim();

    if (!message) return;

    if (!config.geminiKey) {
        alert("Gemini API key is required. Go to settings in the top right to configure it.");
        return;
    }

    // Append User Message to chat window
    appendChatMessage('user', 'U', message);
    chatInput.value = '';

    // Create temporary typing indicator
    const typingId = appendChatMessage('aria-typing', 'A', 'Thinking...');
    chatBox.scrollTop = chatBox.scrollHeight;

    // Build context
    const profileText = `Age: ${document.getElementById('age').value}, Weight: ${document.getElementById('weight').value}kg, Height: ${document.getElementById('height').value}cm, Gender: ${document.getElementById('gender').value}, Goal: ${document.getElementById('fitness-goal').value}.`;
    const targetsText = `Calorie target: ${dayState.targets.calories}kcal. Protein target: ${dayState.targets.macros.protein}g. Carbs: ${dayState.targets.macros.carbs}g. Fats: ${dayState.targets.macros.fat}g.`;
    const logsText = `User has logged ${dayState.consumedTotals.calories}kcal today so far. Logs list: ${JSON.stringify(dayState.loggedEntries)}.`;

    const prompt = `You are Aria, a friendly and highly knowledgeable AI Nutrition Coach integrated into the "NutriPlan Lite" app.
Your goals: Help the user plan meals, give advice on macronutrients, suggest recipes, and answer nutritional queries in a brief, direct, and motivating way.
Keep responses concise, friendly, and limited to 2-3 sentences. Don't use bullet points unless specifically asked.

Context of User today:
User demographics: ${profileText}
Daily Targets: ${targetsText}
Today's Consumption: ${logsText}

User Query: "${message}"`;

    try {
        const reply = await generateGeminiContent(prompt);
        
        // Remove typing indicator and append coach reply
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        appendChatMessage('aria', 'A', reply);
    } catch (err) {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();
        appendChatMessage('aria', 'A', "Error: " + err.message);
    } finally {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// Chat display DOM builder helper
function generateAIInsights() {
    // Build a concise prompt for AI to generate daily insights
    const profile = `Age: ${document.getElementById('age').value}, Weight: ${document.getElementById('weight').value}kg, Height: ${document.getElementById('height').value}cm, Gender: ${document.getElementById('gender').value}, Goal: ${document.getElementById('fitness-goal').value}.`;
    const targets = `Calorie target: ${dayState.targets.calories}kcal, Protein: ${dayState.targets.macros.protein}g, Carbs: ${dayState.targets.macros.carbs}g, Fat: ${dayState.targets.macros.fat}g, Water: ${dayState.targets.waterTarget}ml.`;
    const consumption = `Consumed today: ${dayState.consumedTotals.calories}kcal, Protein ${dayState.consumedTotals.protein}g, Carbs ${dayState.consumedTotals.carbs}g, Fat ${dayState.consumedTotals.fat}g, Water ${dayState.waterConsumed}ml.`;
    const prompt = `You are Aria, an AI nutrition coach. Provide 2-3 short insight cards (max 1 sentence each) for the user based on their profile, targets, and today's consumption. Use a friendly tone. Return JSON array of objects: [{"title":"...","message":"..."}]. Do not include any extra text.`;

    // Combine with context
    const fullPrompt = `${prompt}\nProfile: ${profile}\nTargets: ${targets}\nConsumption: ${consumption}`;

    // Async inner function to fetch and render
    (async () => {
        if (!config.geminiKey) {
            // fallback placeholder insights
            renderInsights([{title:'Stay Hydrated',message:'You have consumed '+dayState.waterConsumed+'ml water today.'}]);
            return;
        }
        try {
            const reply = await generateGeminiContent(fullPrompt);
            // Clean possible code fences
            let jsonText = reply.replace(/```json/g, '').replace(/```/g, '').trim();
            let insights = [];
            try {
                insights = JSON.parse(jsonText);
            } catch (e) {
                // fallback: split lines
                const lines = jsonText.split(/\n/).filter(l=>l.trim());
                insights = lines.map(l=>({title:'Insight',message:l.trim()}));
            }
            renderInsights(insights);
        } catch (err) {
            console.error('AI Insights error:', err);
            renderInsights([{title:'Error',message:err.message}]);
        }
    })();
}

function renderInsights(insights) {
    const container = document.getElementById('ai-insights');
    if (!container) return;
    container.innerHTML = '';
    insights.forEach(ins => {
        const card = document.createElement('div');
        card.className = 'insight-card';
        const strong = document.createElement('strong');
        strong.innerText = ins.title || '';
        const span = document.createElement('span');
        span.innerText = ins.message || '';
        card.appendChild(strong);
        card.appendChild(span);
        container.appendChild(card);
    });
}

function appendChatMessage(sender, initial, text) {
    const chatBox = document.getElementById('chat-box');
    const messageId = 'msg-' + Date.now() + Math.random().toString(36).substr(2, 5);
    
    const wrapper = document.createElement('div');
    wrapper.id = messageId;
    wrapper.className = "chat-message";
    
    const isUser = sender === 'user';
    
    wrapper.innerHTML = `
        <span class="avatar">${initial}</span>
        <p></p>
    `;
    wrapper.querySelector('p').innerText = text;
    
    // Reverse alignment for user messages
    if (isUser) {
        wrapper.classList.add('user');
    }

    chatBox.appendChild(wrapper);
    return messageId;
}

// OFFLINE DATA EXPORT & IMPORT LOGIC (#132)

// Using event delegation because elements are inside <template> and rendered dynamically
document.addEventListener('click', (e) => {
    if (e.target.id === 'exportBtn') {
        const backupData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            backupData[key] = localStorage.getItem(key);
        }
        
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `nutriplan-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (typeof notify === 'function') {
            notify("Backup downloaded successfully!", "success", 3000);
        } else {
            alert("✅ Backup downloaded successfully!");
        }
    }

    if (e.target.id === 'restoreBtn') {
        const importInput = document.getElementById('importFile');
        if (importInput) importInput.click();
    }
});

document.addEventListener('change', (e) => {
    if (e.target.id === 'importFile') {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsedData = JSON.parse(evt.target.result);
                
                if (typeof parsedData !== "object" || parsedData === null) {
                    throw new Error("Invalid JSON format");
                }

                Object.keys(parsedData).forEach(key => {
                    localStorage.setItem(key, parsedData[key]);
                });

                if (typeof notify === 'function') {
                    notify("Data restored successfully! Reloading...", "success", 2000);
                } else {
                    alert("♻️ Data restored successfully! The page will now reload.");
                }
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error("Restore Error:", error);
                if (typeof notify === 'function') {
                    notify("Invalid backup file. Please upload a valid NutriPlan JSON.", "error", 4000);
                } else {
                    alert("❌ Invalid backup file. Please upload a valid NutriPlan JSON backup.");
                }
            }
            
            e.target.value = ''; 
        };
        reader.readAsText(file);
    }
});