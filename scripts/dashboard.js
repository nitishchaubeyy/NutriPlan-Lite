// ================================================================
// dashboard.js — Dashboard orchestration, targets, full UI refresh
// NutriPlan-Lite
// ================================================================

window.Dashboard = (() => {

  // ── Compute calorie/macro targets from profile ─────────────────
  function computeTargets(profile) {
    const age = parseFloat(profile.age) || 25;
    const weight = parseFloat(profile.weight) || 70;
    const height = parseFloat(profile.height) || 175;
    const gender = profile.gender || 'male';
    const activity = parseFloat(profile.activity) || 1.55;
    const goal = profile.goal || profile.fitnessGoal || 'maintain';
    const split = profile.macroSplit || 'balanced';

    // Mifflin-St Jeor BMR
    let bmr = gender === 'female'
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

    let tdee = Math.round(bmr * activity);

    let targetCal;
    if (goal === 'lose') targetCal = Math.max(1200, tdee - 450);
    else if (goal === 'gain') targetCal = tdee + 350;
    else targetCal = tdee;

    // Macro ratios
    let pPct = 25, cPct = 45, fPct = 30;
    if (split === 'lowcarb') { pPct = 40; cPct = 15; fPct = 45; }
    else if (split === 'highprotein') { pPct = 40; cPct = 35; fPct = 25; }
    else if (split === 'custom') {
      pPct = parseFloat(profile.customProtein) || 25;
      cPct = parseFloat(profile.customCarbs) || 45;
      fPct = parseFloat(profile.customFat) || 30;
      if (Math.round(pPct + cPct + fPct) !== 100) { pPct = 25; cPct = 45; fPct = 30; }
    }

    return {
      calories: targetCal,
      protein: Math.round((targetCal * pPct / 100) / 4),
      carbs: Math.round((targetCal * cPct / 100) / 4),
      fat: Math.round((targetCal * fPct / 100) / 9),
      tdee
    };
  }

  // ── Full dashboard refresh ─────────────────────────────────────
  function refresh() {
    const dateKey = Tracker.currentDate;
    const profile = Storage.getProfile();
    const targets = computeTargets(profile);
    const consumed = Tracker.computeTotals(dateKey);
    const water = Storage.getWater(dateKey);
    const waterTarget = profile.waterTarget || 2500;
    const weeklyData = Storage.getWeeklyData();
    const streak = Storage.getStreak();

    // Health / Nutrition score
    consumed.foodCount = Storage.getFoods(dateKey).length;
    const score = Analytics.calculateHealthScore(consumed, targets, water, waterTarget);
    Analytics.updateScoreRing(score);

    // Metric cards (calories, macros)
    Tracker.renderMacroCards(consumed, targets);

    // Hydration card
    Hydration.render(dateKey, profile);

    // Macro labels
    setEl('macro-balance-label', getMacroLabel(consumed, targets));

    // Goal card
    setEl('maintenance-calories', targets.tdee + ' kcal');
    setEl('target-display', targets.calories + ' kcal');
    setEl('water-target-display', (profile.waterTarget || 2500) + ' ml');

    // Meal timeline
    Tracker.renderTimeline(dateKey, Tracker.getActiveFilter(), Tracker.getSearchQuery());

    // Weekly charts
    Analytics.renderWeeklyCaloriesChart(weeklyData, targets.calories);
    Analytics.renderWeeklyWaterChart(weeklyData, waterTarget);
    Analytics.renderMacroDonut(consumed.protein, consumed.carbs, consumed.fat);

    // Recommendations (Removed)
    // Analytics.renderRecommendations(consumed, targets, water, waterTarget, profile.goal);

    // Activity feed (Removed)
    // Analytics.renderActivityFeed(Storage.getFoods(dateKey));

    // AI insights panel
    AI.generateInsights();

    // Streak badge
    setEl('streak-count', streak);

    // Date label
    Tracker.updateDateLabel();
  }

  function getMacroLabel(consumed, targets) {
    const pPct = targets.protein > 0 ? consumed.protein / targets.protein : 0;
    if (pPct >= 0.9) return 'Balanced ✓';
    if (pPct >= 0.6) return 'In Progress';
    return 'Needs Protein';
  }

  // ── Profile settings panel ─────────────────────────────────────
  function initProfilePanel() {
    const profile = Storage.getProfile();
    const fieldMap = {
      age: 'age', weight: 'weight', height: 'height',
      gender: 'gender', activity: 'activity', goal: 'goal',
      macroSplit: 'macroSplit', customProtein: 'customProtein',
      customCarbs: 'customCarbs', customFat: 'customFat',
      waterTarget: 'waterTarget'
    };
    Object.entries(fieldMap).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el && profile[key] !== undefined) el.value = profile[key];
    });

    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = 'true';
      saveBtn.addEventListener('click', () => {
        const newProfile = {};
        Object.entries(fieldMap).forEach(([key, id]) => {
          const el = document.getElementById(id);
          if (!el) return;
          const raw = el.value;
          newProfile[key] = (el.tagName === 'SELECT' || isNaN(raw) || raw === '') ? raw : parseFloat(raw);
        });
        newProfile.isSetup = true;
        Storage.saveProfile(newProfile);
        Toast.show('Profile saved! Targets updated.', 'success');
        
        // Hide onboarding modal if it was open
        const modal = document.getElementById('onboarding-modal');
        if (modal) modal.classList.add('hidden');
        
        refresh();
      });
    }

    const macroSplitEl = document.getElementById('macroSplit');
    if (macroSplitEl) {
      macroSplitEl.addEventListener('change', toggleCustomMacros);
      toggleCustomMacros();
    }
  }

  function toggleCustomMacros() {
    const el = document.getElementById('macroSplit');
    const panel = document.getElementById('custom-macros-panel');
    if (!el || !panel) return;
    panel.classList.toggle('hidden', el.value !== 'custom');
  }

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { computeTargets, refresh, initProfilePanel };
})();
