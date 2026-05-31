// ================================================================
// tracker.js — Food tracking, meal timeline, macros
// NutriPlan-Lite
// ================================================================

window.Tracker = (() => {
  let currentDate = null; // initialized lazily in init()
  let editingId = null;
  let foodDB = {};
  let initialized = false;

  // ── Load food database ──────────────────────────────────────────
  async function loadFoodDB() {
    try {
      const response = await fetch('./foodDB.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      foodDB = await response.json();
    } catch (error) {
      console.error("Failed to load food database:", error);
      console.info("Using local fallback food database.");
      // Fallback state
      foodDB = {
        'apple': { cal: 52, carbs: 14, protein: 0.3, fat: 0.2 },
        'banana': { cal: 89, carbs: 23, protein: 1.1, fat: 0.3 },
        'egg': { cal: 155, carbs: 1.1, protein: 13, fat: 11 },
        'chicken breast': { cal: 165, carbs: 0, protein: 31, fat: 3.6 },
        'rice': { cal: 130, carbs: 28, protein: 2.7, fat: 0.3 },
        'oats': { cal: 389, carbs: 66, protein: 16.9, fat: 6.9 },
        'milk': { cal: 42, carbs: 5, protein: 3.4, fat: 1 },
        'paneer': { cal: 265, carbs: 1.2, protein: 18, fat: 20 }
      };
    }
  }

  // ── Compute totals for a date ───────────────────────────────────
  function computeTotals(dateKey) {
    const foods = Storage.getFoods(dateKey);
    return foods.reduce((acc, f) => {
      acc.calories += f.calories || 0;
      acc.protein += f.protein || 0;
      acc.carbs += f.carbs || 0;
      acc.fat += f.fat || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, foodCount: foods.length });
  }

  // ── Open / close food drawer ────────────────────────────────────
  function openDrawer(mealType = 'breakfast') {
    editingId = null;
    const drawer = document.getElementById('food-drawer');
    const catEl = document.getElementById('food-category');
    if (drawer) drawer.classList.remove('hidden');
    if (catEl) catEl.value = mealType;
    resetDrawerForm();
    document.getElementById('food-name')?.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    const drawer = document.getElementById('food-drawer');
    if (drawer) drawer.classList.add('hidden');
    editingId = null;
    resetDrawerForm();
    document.body.style.overflow = '';
  }

  function resetDrawerForm() {
    ['food-name', 'food-quantity', 'food-calories', 'food-protein', 'food-carbs', 'food-fats', 'food-id'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const qty = document.getElementById('food-quantity');
    if (qty) qty.value = 100;
    hideAutocomplete();
  }

  // ── Autocomplete ────────────────────────────────────────────────
  function showAutocomplete(query) {
    const list = document.getElementById('food-suggestions');
    if (!list) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) { hideAutocomplete(); return; }
    const matches = Object.keys(foodDB).filter(k => k.includes(q)).slice(0, 6);
    if (matches.length === 0) { hideAutocomplete(); return; }
    list.innerHTML = matches.map(m => {
      const item = foodDB[m];
      return `<div class="suggestion-item" data-food="${m}">
        <strong>${m}</strong>
        <span>${item.cal} kcal/100g &middot; P:${item.protein}g C:${item.carbs}g F:${item.fat}g</span>
      </div>`;
    }).join('');
    list.classList.remove('hidden');
  }

  function hideAutocomplete() {
    const list = document.getElementById('food-suggestions');
    if (list) list.classList.add('hidden');
  }

  function fillFromDB(foodName) {
    const item = foodDB[foodName.toLowerCase()];
    if (!item) return;
    const qty = parseFloat(document.getElementById('food-quantity')?.value) || 100;
    const factor = qty / 100;
    setVal('food-calories', Math.round(item.cal * factor));
    setVal('food-protein', round1(item.protein * factor));
    setVal('food-carbs', round1(item.carbs * factor));
    setVal('food-fats', round1(item.fat * factor));
  }

  // ── Save food entry ─────────────────────────────────────────────
  function saveFood() {
    const name = document.getElementById('food-name')?.value.trim();
    const category = document.getElementById('food-category')?.value || 'breakfast';
    const quantity = Math.max(1, parseFloat(document.getElementById('food-quantity')?.value) || 100);
    const calories = Math.max(0, parseFloat(document.getElementById('food-calories')?.value) || 0);
    const protein = Math.max(0, parseFloat(document.getElementById('food-protein')?.value) || 0);
    const carbs = Math.max(0, parseFloat(document.getElementById('food-carbs')?.value) || 0);
    const fat = Math.max(0, parseFloat(document.getElementById('food-fats')?.value) || 0);

    if (!name) { Toast.show('Please enter a food name', 'warning'); return; }
    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
      Toast.show('Please enter nutrition values', 'warning'); return;
    }

    const entry = { name, meal: category, quantity, calories: Math.round(calories), protein: round1(protein), carbs: round1(carbs), fat: round1(fat) };

    if (editingId) {
      Storage.updateFood(currentDate, editingId, entry);
      Toast.show(`Updated "${name}"`, 'success');
    } else {
      Storage.addFood(currentDate, entry);
      Toast.show(`Logged "${name}" — ${Math.round(calories)} kcal`, 'success');
    }

    closeDrawer();
    App.refresh();
  }

  // ── Edit entry ──────────────────────────────────────────────────
  function editFood(id) {
    const foods = Storage.getFoods(currentDate);
    const food = foods.find(f => f.id === id);
    if (!food) return;
    editingId = id;
    setVal('food-id', id);
    setVal('food-name', food.name || '');
    setVal('food-quantity', food.quantity || 100);
    setVal('food-calories', food.calories || 0);
    setVal('food-protein', food.protein || 0);
    setVal('food-carbs', food.carbs || 0);
    setVal('food-fats', food.fat || 0);
    const catEl = document.getElementById('food-category');
    if (catEl) catEl.value = food.meal || 'breakfast';
    const drawer = document.getElementById('food-drawer');
    if (drawer) drawer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // ── Delete entry ────────────────────────────────────────────────
  function deleteFood(id) {
    Storage.deleteFood(currentDate, id);
    Toast.show('Food entry removed', 'info');
    App.refresh();
  }

  // ── Render meal timeline ────────────────────────────────────────
  function renderTimeline(dateKey, filterCategory = 'all', searchQuery = '') {
    const container = document.getElementById('meal-timeline');
    if (!container) return;
    const foods = Storage.getFoods(dateKey);
    const q = searchQuery.toLowerCase().trim();
    let filtered = foods.filter(f => {
      const matchCat = filterCategory === 'all' || f.meal === filterCategory;
      const matchSearch = !q || (f.name || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    const mealOrder = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const byMeal = {};
    mealOrder.forEach(m => { byMeal[m] = []; });
    filtered.forEach(f => {
      const m = (f.meal || 'snacks').toLowerCase();
      if (!byMeal[m]) byMeal[m] = [];
      byMeal[m].push(f);
    });

    const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };
    const mealEmojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍎' };

    const hasAny = filtered.length > 0;
    if (!hasAny) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🍽️</div>
          <strong>No food logged yet</strong>
          <span>${searchQuery ? 'No results for "' + searchQuery + '"' : 'Add your first meal to start tracking today.'}</span>
        </div>`;
      return;
    }

    container.innerHTML = '';
    mealOrder.forEach(meal => {
      const entries = byMeal[meal];
      if (entries.length === 0) return;
      const mealCals = entries.reduce((s, e) => s + (e.calories || 0), 0);
      const group = document.createElement('section');
      group.className = 'meal-group';
      group.innerHTML = `
        <div class="meal-heading">
          <div class="meal-heading-left">
            <span class="meal-emoji">${mealEmojis[meal]}</span>
            <h3>${mealLabels[meal]}</h3>
          </div>
          <span class="meal-total-cal">${mealCals} kcal</span>
        </div>
        <div class="food-list" id="list-${meal}"></div>`;
      container.appendChild(group);
      const list = group.querySelector(`#list-${meal}`);
      entries.forEach(f => {
        const row = document.createElement('article');
        row.className = 'food-row';
        row.innerHTML = `
          <div class="food-info">
            <span class="food-name"></span>
            <div class="food-meta">
              <span>${f.quantity || 100}g</span>
              <span>P: ${f.protein || 0}g</span>
              <span>C: ${f.carbs || 0}g</span>
              <span>F: ${f.fat || 0}g</span>
            </div>
          </div>
          <div class="food-side">
            <span class="food-kcal">${f.calories || 0} kcal</span>
            <div class="row-actions">
              <button type="button" class="btn-edit" data-id="${f.id}">Edit</button>
              <button type="button" class="btn-delete" data-id="${f.id}">Delete</button>
            </div>
          </div>`;
        row.querySelector('.food-name').textContent = f.name || 'Food item';
        row.querySelector('.btn-edit').addEventListener('click', () => Tracker.editFood(f.id));
        row.querySelector('.btn-delete').addEventListener('click', () => Tracker.deleteFood(f.id));
        list.appendChild(row);
      });
    });
  }

  // ── Render macro progress cards ─────────────────────────────────
  function renderMacroCards(consumed, targets) {
    const rawCalPct = targets.calories > 0 ? (consumed.calories / targets.calories) * 100 : 0;
    const calPct = Math.min(100, rawCalPct);
    setEl('calories-consumed', consumed.calories);
    setEl('calories-goal', targets.calories);
    setEl('calorie-balance-label', Analytics.getCalorieBalanceLabel(consumed.calories, targets.calories));
    const calBar = document.getElementById('calories-progress');
    if (calBar) {
      calBar.style.width = calPct + '%';
      calBar.className = 'progress-fill ' + (rawCalPct > 105 ? 'fill-rose' : 'fill-green');
    }
    const calInsight = document.getElementById('calorie-insight');
    if (calInsight) {
      const rem = Math.max(0, targets.calories - consumed.calories);
      calInsight.textContent = consumed.calories === 0 ? 'Start logging meals to track.' :
        calPct > 100 ? `${Math.round(consumed.calories - targets.calories)} kcal over target.` :
        `${Math.round(rem)} kcal remaining today.`;
    }

    // Macros
    renderMacroBar('protein', consumed.protein, targets.protein, 'fill-amber');
    renderMacroBar('carbs', consumed.carbs, targets.carbs, 'fill-cyan');
    renderMacroBar('fats', consumed.fat, targets.fat, 'fill-rose');
    setEl('protein-consumed', Math.round(consumed.protein));
    setEl('protein-goal', targets.protein);
    setEl('carbs-consumed', Math.round(consumed.carbs));
    setEl('carbs-goal', targets.carbs);
    setEl('fats-consumed', Math.round(consumed.fat));
    setEl('fats-goal', targets.fat);
  }

  function renderMacroBar(macro, consumed, target, cls) {
    const bar = document.getElementById(`${macro}-progress`);
    if (bar) {
      const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
      bar.style.width = pct + '%';
      bar.className = `progress-fill ${cls}`;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function round1(n) { return Math.round(parseFloat(n || 0) * 10) / 10; }

  // ── Wire up drawer events ────────────────────────────────────────
  async function init() {
    currentDate = Storage.todayKey(); // safe now — Storage is fully loaded
    if (initialized) return;
    initialized = true;
    
    await loadFoodDB();

    // Open drawer buttons (data-open-food-drawer)
    document.addEventListener('click', e => {
      if (e.target.closest('[data-open-food-drawer]')) openDrawer();
      if (e.target.closest('[data-close-food-drawer]')) closeDrawer();
    });

    // Form submit
    const form = document.getElementById('food-form');
    if (form) form.addEventListener('submit', e => { e.preventDefault(); saveFood(); });

    // Autocomplete on food-name input
    const nameEl = document.getElementById('food-name');
    if (nameEl) {
      nameEl.addEventListener('input', e => showAutocomplete(e.target.value));
      nameEl.addEventListener('keydown', e => { if (e.key === 'Escape') hideAutocomplete(); });
    }

    // Quantity change — auto-recalc from DB
    const qtyEl = document.getElementById('food-quantity');
    if (qtyEl) {
      qtyEl.addEventListener('input', () => {
        const name = document.getElementById('food-name')?.value.trim().toLowerCase();
        if (name && foodDB[name]) fillFromDB(name);
      });
    }

    // Autocomplete suggestion click
    document.addEventListener('click', e => {
      const item = e.target.closest('.suggestion-item');
      if (item) {
        const food = item.dataset.food;
        const nameEl = document.getElementById('food-name');
        if (nameEl) nameEl.value = food;
        fillFromDB(food);
        hideAutocomplete();
        document.getElementById('food-quantity')?.focus();
      }
    });

    // Search & filters on meal timeline
    const searchEl = document.getElementById('food-search');
    if (searchEl) searchEl.addEventListener('input', () => App.refresh());

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-filter]');
      if (btn) {
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        App.refresh();
      }
    });

    // Close autocomplete on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#food-name') && !e.target.closest('#food-suggestions')) {
        hideAutocomplete();
      }
    });

    // Day nav buttons
    document.querySelectorAll('[data-day-prev]').forEach(btn => btn.addEventListener('click', () => changeDate(-1)));
    document.querySelectorAll('[data-day-next]').forEach(btn => btn.addEventListener('click', () => changeDate(1)));
  }

  async function changeDate(delta) {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const today = new Date();
    if (d > today) return;
    currentDate = Storage.getLocalDateString(d);
    updateDateLabel();

    // Sync from backend for this specific date before refreshing the UI
    if (window.Storage && window.Storage.sync) {
      await window.Storage.sync(currentDate);
    }

    App.refresh();
  }

  function updateDateLabel() {
    const label = document.getElementById('current-date-label');
    if (!label || !currentDate) return;
    const d = new Date(currentDate + 'T00:00:00');
    label.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getActiveFilter() {
    const btn = document.querySelector('[data-filter].active');
    return btn ? btn.dataset.filter : 'all';
  }

  function getSearchQuery() {
    return document.getElementById('food-search')?.value || '';
  }

  return {
    init, computeTotals, renderTimeline, renderMacroCards,
    openDrawer, closeDrawer, editFood, deleteFood,
    getActiveFilter, getSearchQuery,
    get currentDate() { return currentDate; },
    set currentDate(v) { currentDate = v; updateDateLabel(); },
    updateDateLabel
  };
})();
