// ================================================================
// hydration.js — Water intake tracking with bottle animation
// NutriPlan-Lite
// ================================================================

window.Hydration = (() => {

  // ── Update all hydration UI ─────────────────────────────────────
  function render(dateKey, profile) {
    const waterTarget = profile.waterTarget || 2500;
    const water = Storage.getWater(dateKey);
    const pct = waterTarget > 0 ? Math.min(100, (water / waterTarget) * 100) : 0;

    // Dashboard summary card
    setEl('water-consumed', water);
    setEl('water-goal', waterTarget);
    setEl('water-percent', Math.round(pct) + '%');
    setEl('hydration-label', Analytics.getHydrationLabel(water, waterTarget));

    // Mini ring in summary grid
    const miniRing = document.getElementById('water-ring');
    if (miniRing) miniRing.style.setProperty('--progress', pct + '%');

    // Hydration panel - large display
    setEl('water-consumed-large', water);
    setEl('water-target-large', waterTarget);

    // Bottle fill animation
    const fill = document.getElementById('water-fill');
    if (fill) fill.style.height = pct + '%';
  }

  // ── Add water ───────────────────────────────────────────────────
  function addWater(dateKey, ml) {
    Storage.addWater(dateKey, ml);
    Toast.show(`+${ml}ml water logged 💧`, 'info');
    App.refresh();
  }

  // ── Reset water ─────────────────────────────────────────────────
  function resetWater(dateKey) {
    Storage.setWater(dateKey, 0);
    Toast.show('Hydration reset', 'info');
    App.refresh();
  }

  // ── Wire up events ───────────────────────────────────────────────
  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    // Delegate water add buttons (data-add-water="250")
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-add-water]');
      if (btn) {
        const ml = parseInt(btn.dataset.addWater, 10);
        if (!isNaN(ml) && ml > 0) addWater(Tracker.currentDate, ml);
      }
      if (e.target.closest('[data-reset-water]')) {
        resetWater(Tracker.currentDate);
      }
    });
  }

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { init, render, addWater, resetWater };
})();
