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
    const customTargets = {
      calories: profile.targetCalories || targets.calories,
      protein: profile.targetProtein || targets.protein,
      carbs: profile.targetCarbs || targets.carbs,
      fat: profile.targetFats || targets.fat,
      tdee: targets.tdee
    };
    const activeWaterTarget = profile.targetWater || profile.waterTarget || 2500;
    const weeklyData = Storage.getWeeklyData();
    const streak = Storage.getStreak();

    // Health / Nutrition score
    consumed.foodCount = Storage.getFoods(dateKey).length;
    const score = Analytics.calculateHealthScore(consumed, customTargets, water, activeWaterTarget);
    Analytics.updateScoreRing(score);

    // Metric cards (calories, macros)
    Tracker.renderMacroCards(consumed, customTargets);

    // Hydration card
    Hydration.render(dateKey, profile);

    // Macro labels
    setEl('macro-balance-label', getMacroLabel(consumed, customTargets));

    // Goal card
    setEl('maintenance-calories', targets.tdee + ' kcal');
    setEl('target-display', customTargets.calories + ' kcal');
    setEl('water-target-display', activeWaterTarget + ' ml');

    // Meal timeline
    Tracker.renderTimeline(dateKey, Tracker.getActiveFilter(), Tracker.getSearchQuery());

    // Weekly charts
    Analytics.renderWeeklyCaloriesChart(weeklyData, customTargets.calories);
    Analytics.renderWeeklyWaterChart(weeklyData, activeWaterTarget);
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

    initTargetPanel();
  }

  function initTargetPanel() {
    const updateBtn = document.getElementById('update-goal-button');
    const analyzeBtn = document.getElementById('analyze-targets-btn');
    const saveBtn = document.getElementById('save-targets-btn');
    if (updateBtn && !updateBtn.dataset.bound) {
      updateBtn.dataset.bound = 'true';
      updateBtn.addEventListener('click', () => {
        const panel = document.getElementById('target-goal-panel');
        if (!panel) return;
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) populateTargetForm();
      });
    }

    if (analyzeBtn && !analyzeBtn.dataset.bound) {
      analyzeBtn.dataset.bound = 'true';
      analyzeBtn.addEventListener('click', analyzeTargetForm);
    }

    if (saveBtn && !saveBtn.dataset.bound) {
      saveBtn.dataset.bound = 'true';
      saveBtn.addEventListener('click', saveTargetForm);
    }
  }

  function populateTargetForm() {
    const profile = Storage.getProfile();
    const targets = computeTargets(profile);

    const setInput = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value ?? '';
    };

    setInput('target-goal-type', profile.goal || 'maintain');
    setInput('target-calories', profile.targetCalories || targets.calories);
    setInput('target-protein', profile.targetProtein || targets.protein);
    setInput('target-carbs', profile.targetCarbs || targets.carbs);
    setInput('target-fats', profile.targetFats || targets.fat);
    setInput('target-water', profile.targetWater || profile.waterTarget || 2500);
  }

  function readTargetForm() {
    const parse = id => parseFloat(document.getElementById(id)?.value) || 0;
    return {
      goal: document.getElementById('target-goal-type')?.value || 'maintain',
      calories: parse('target-calories'),
      protein: parse('target-protein'),
      carbs: parse('target-carbs'),
      fat: parse('target-fats'),
      water: parse('target-water')
    };
  }

  function analyzeTargetForm() {
    const target = readTargetForm();
    if (!target.calories || !target.water) {
      Toast.show('Enter both calorie and water targets to analyze your plan.', 'warning');
      return;
    }

    const today = Storage.todayKey();
    const consumed = Tracker.computeTotals(today);
    const water = Storage.getWater(today);
    const suggestions = [];
    const weightText = target.goal === 'lose' ? 'lean proteins, light meals, and lots of veggies' : target.goal === 'gain' ? 'extra protein and balanced carbs with healthy fats' : 'consistent portions and balanced meals';

    const caloriesDiff = target.calories - consumed.calories;
    if (caloriesDiff > 0) {
      suggestions.push({
        icon: '🍽️',
        title: 'Calorie window available',
        desc: `You can still eat ${Math.round(caloriesDiff)} kcal today. Choose ${weightText} to stay on track.`
      });
    } else if (caloriesDiff < 0) {
      suggestions.push({
        icon: '⚠️',
        title: 'Calorie limit exceeded',
        desc: `You're ${Math.abs(Math.round(caloriesDiff))} kcal over your target. Focus on low-calorie, high-fiber foods and smaller portions.`
      });
    } else {
      suggestions.push({ icon: '✅', title: 'On target', desc: 'Your calorie intake meets the daily target exactly.' }); }

    const waterDiff = target.water - water;
    if (waterDiff > 0) {
      suggestions.push({
        icon: '💧',
        title: 'Hydration plan',
        desc: `Drink ${waterDiff} ml more today. Aim for one 250ml glass every hour until your target is met.`
      });
    } else {
      suggestions.push({ icon: '✅', title: 'Hydration goal reached', desc: 'Your water intake has already met or exceeded the target for today.' }); }

    const macroChecks = [
      { key: 'protein', label: 'Protein', emoji: '💪' },
      { key: 'carbs', label: 'Carbs', emoji: '🍞' },
      { key: 'fat', label: 'Fats', emoji: '🥑' }
    ];

    macroChecks.forEach(m => {
      const current = consumed[m.key];
      const targetValue = target[m.key];
      if (!targetValue) return;
      const diff = targetValue - current;
      if (diff > 0) {
        const foodHint = m.key === 'protein' ? 'eggs, chicken, tofu, or beans' : m.key === 'carbs' ? 'whole grains and vegetables' : 'nuts, avocado, and olive oil';
        suggestions.push({
          icon: m.emoji,
          title: `${m.label} boost`,
          desc: `Add about ${Math.round(diff)}g more ${m.label.toLowerCase()}. Try ${foodHint}.`
        });
      } else {
        suggestions.push({
          icon: m.emoji,
          title: `${m.label} target reached`,
          desc: `Your ${m.label.toLowerCase()} is at or above target. Keep the balance with lean protein and vegetables.`
        });
      }
    });

    const dietPlan = buildDietPlan(target);
    suggestions.push({
      icon: '📋',
      title: 'Sample daily diet plan',
      desc: 'A simple meal plan to help meet your daily calorie goal and support your selected outcome.',
      plan: dietPlan
    });

    renderGoalSuggestions(suggestions);
  }

  function buildDietPlan(target) {
    const base = Math.max(target.calories, 800);
    const meals = [
      { name: 'Breakfast', ratio: 0.25 },
      { name: 'Lunch', ratio: 0.30 },
      { name: 'Dinner', ratio: 0.30 },
      { name: 'Snacks', ratio: 0.15 }
    ];

    const templates = {
      lose: {
        Breakfast: 'Veggie omelet or chia pudding with berries and seeds.',
        Lunch: 'Mixed greens bowl with grilled chicken or tofu, quinoa, and avocado.',
        Dinner: 'Baked fish or lentil stew with steamed vegetables.',
        Snacks: 'Greek yogurt, a handful of nuts, and crunchy vegetables with hummus.'
      },
      maintain: {
        Breakfast: 'Oatmeal with banana, nuts, and a drizzle of honey.',
        Lunch: 'Grilled chicken or chickpea bowl with brown rice and mixed vegetables.',
        Dinner: 'Salmon or paneer with sweet potato and roasted greens.',
        Snacks: 'Apple with nut butter and a small cottage cheese bowl.'
      },
      gain: {
        Breakfast: 'Oatmeal with peanut butter, banana, and scrambled eggs or tofu.',
        Lunch: 'Rice bowl with chicken, beans, avocado, and veggies.',
        Dinner: 'Steak, paneer, or lentils with potatoes and vegetables.',
        Snacks: 'Protein smoothie or yogurt with fruit and trail mix.'
      }
    };

    const planType = templates[target.goal] ? target.goal : 'maintain';
    return meals.map(meal => ({
      meal: meal.name,
      calories: Math.round(base * meal.ratio),
      items: templates[planType][meal.name]
    }));
  }

  function saveTargetForm() {
    const target = readTargetForm();
    if (!target.calories || !target.water) {
      Toast.show('Please enter calorie and water targets before saving.', 'warning');
      return;
    }
    Storage.saveProfile({
      goal: target.goal,
      targetCalories: target.calories,
      targetProtein: target.protein,
      targetCarbs: target.carbs,
      targetFats: target.fat,
      targetWater: target.water,
      waterTarget: target.water
    });
    Toast.show('Your target plan has been saved.', 'success');
    refresh();
    renderGoalSuggestions([{ icon: '✅', title: 'Targets saved', desc: 'Your new daily goal plan is now active in the dashboard.' }]);
  }

  function renderGoalSuggestions(items) {
    const container = document.getElementById('goal-suggestion-list');
    if (!container) return;
    container.innerHTML = items.map(item => `
      <div class="recommendation-card">
        <span class="rec-icon">${item.icon}</span>
        <div>
          <strong>${item.title}</strong>
          <span>${item.desc}</span>
          ${item.plan ? `<div class="diet-plan">${item.plan.map(plan => `
            <div class="diet-plan-item">
              <strong>${plan.meal} — ${plan.calories} kcal</strong>
              <span>${plan.items}</span>
            </div>
          `).join('')}</div>` : ''}
        </div>
      </div>
    `).join('');
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
