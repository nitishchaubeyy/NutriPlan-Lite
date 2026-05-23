// ================================================================
// analytics.js — Dashboard analytics, charts, and health score
// NutriPlan-Lite
// ================================================================

window.Analytics = {

  // ── Health Score Calculation ────────────────────────────────────
  calculateHealthScore(consumed, targets, water, waterTarget) {
    let score = 0;
    // Calorie accuracy (max 35 pts)
    const calPct = targets.calories > 0 ? consumed.calories / targets.calories : 0;
    if (calPct >= 0.85 && calPct <= 1.05) score += 35;
    else if (calPct >= 0.70 && calPct <= 1.15) score += 22;
    else if (calPct > 0) score += 10;

    // Protein adequacy (max 25 pts)
    const protPct = targets.protein > 0 ? consumed.protein / targets.protein : 0;
    if (protPct >= 0.90) score += 25;
    else if (protPct >= 0.70) score += 16;
    else if (protPct > 0) score += 8;

    // Hydration (max 25 pts)
    const hydPct = waterTarget > 0 ? water / waterTarget : 0;
    if (hydPct >= 0.90) score += 25;
    else if (hydPct >= 0.60) score += 15;
    else if (hydPct > 0) score += 7;

    // Meal variety (max 15 pts) – rewarded via food count
    const foodCount = Math.min(consumed.foodCount || 0, 5);
    score += foodCount * 3;

    return Math.min(100, Math.round(score));
  },

  // ── Nutrition Score ring ────────────────────────────────────────
  updateScoreRing(score) {
    const ring = document.getElementById('nutrition-score-ring');
    const scoreEl = document.getElementById('nutrition-score');
    if (ring) ring.style.setProperty('--progress', `${score}%`);
    if (scoreEl) scoreEl.textContent = score;
  },

  // ── Calorie balance label ───────────────────────────────────────
  getCalorieBalanceLabel(consumed, target) {
    if (target === 0) return 'Set Goal';
    const pct = consumed / target;
    if (consumed === 0) return 'Not Started';
    if (pct > 1.15) return 'Over Limit';
    if (pct > 1.0) return 'At Limit';
    if (pct >= 0.85) return 'On Track';
    if (pct >= 0.5) return 'In Progress';
    return 'Just Started';
  },

  // ── Hydration label ─────────────────────────────────────────────
  getHydrationLabel(water, target) {
    if (target === 0) return 'Set Goal';
    const pct = water / target;
    if (pct >= 1.0) return 'Goal Met! 💧';
    if (pct >= 0.75) return 'Almost There';
    if (pct >= 0.5) return 'Halfway';
    if (pct > 0) return 'Low';
    return 'None Yet';
  },

  // ── Render mini bar chart for weekly calories ───────────────────
  renderWeeklyCaloriesChart(weeklyData, targetCalories) {
    const container = document.getElementById('weekly-calories-chart');
    if (!container) return;
    const maxVal = Math.max(targetCalories * 1.2, ...weeklyData.map(d => d.calories), 1);
    container.innerHTML = weeklyData.map(day => {
      const heightPct = Math.min(100, (day.calories / maxVal) * 100);
      const isToday = day.date === Storage.todayKey();
      const onTarget = day.calories > 0 && day.calories <= targetCalories * 1.1;
      const color = isToday ? 'var(--green)' : onTarget ? 'var(--teal)' : day.calories === 0 ? 'rgba(148,163,184,0.2)' : 'var(--amber)';
      return `
        <div class="chart-bar-col">
          <span class="chart-bar-val">${day.calories > 0 ? day.calories : ''}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${heightPct}%;background:${color}" title="${day.label}: ${day.calories} kcal"></div>
          </div>
          <span class="chart-bar-label ${isToday ? 'today' : ''}">${day.label}</span>
        </div>
      `;
    }).join('');
  },

  // ── Render weekly hydration chart ───────────────────────────────
  renderWeeklyWaterChart(weeklyData, waterTarget) {
    const container = document.getElementById('weekly-water-chart');
    if (!container) return;
    const maxVal = Math.max(waterTarget * 1.2, ...weeklyData.map(d => d.water), 1);
    container.innerHTML = weeklyData.map(day => {
      const heightPct = Math.min(100, (day.water / maxVal) * 100);
      const isToday = day.date === Storage.todayKey();
      const color = isToday ? 'var(--teal)' : day.water >= waterTarget ? 'var(--green)' : 'rgba(34,211,238,0.35)';
      return `
        <div class="chart-bar-col">
          <span class="chart-bar-val">${day.water > 0 ? (day.water >= 1000 ? (day.water/1000).toFixed(1)+'L' : day.water+'ml') : ''}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="height:${heightPct}%;background:${color}" title="${day.label}: ${day.water}ml"></div>
          </div>
          <span class="chart-bar-label ${isToday ? 'today' : ''}">${day.label}</span>
        </div>
      `;
    }).join('');
  },

  // ── Macro donut chart (CSS conic-gradient) ──────────────────────
  renderMacroDonut(protein, carbs, fat) {
    const donut = document.getElementById('macro-donut');
    if (!donut) return;
    const total = protein + carbs + fat;
    if (total === 0) {
      donut.style.background = 'rgba(148,163,184,0.12)';
      return;
    }
    const pPct = (protein / total) * 100;
    const cPct = (carbs / total) * 100;
    donut.style.background = `conic-gradient(
      var(--amber) 0% ${pPct.toFixed(1)}%,
      var(--teal) ${pPct.toFixed(1)}% ${(pPct + cPct).toFixed(1)}%,
      var(--rose) ${(pPct + cPct).toFixed(1)}% 100%
    )`;
  },

  // ── Render Recommendation cards ─────────────────────────────────
  renderRecommendations(consumed, targets, water, waterTarget, goal) {
    const container = document.getElementById('recommendation-list');
    if (!container) return;
    const recs = [];
    const calPct = targets.calories > 0 ? consumed.calories / targets.calories : 0;
    const hydPct = waterTarget > 0 ? water / waterTarget : 0;
    const protPct = targets.protein > 0 ? consumed.protein / targets.protein : 0;

    if (calPct < 0.5 && consumed.calories === 0)
      recs.push({ icon: '🍽️', title: 'Log your first meal', desc: 'Start tracking to see your nutrition score rise.' });
    else if (calPct < 0.7)
      recs.push({ icon: '⚡', title: 'Fuel up!', desc: `You still have ${Math.round(targets.calories - consumed.calories)} kcal left to reach your goal.` });
    else if (calPct > 1.1)
      recs.push({ icon: '⚠️', title: 'Calorie limit exceeded', desc: `You're ${Math.round(consumed.calories - targets.calories)} kcal over your daily target.` });

    if (hydPct < 0.5)
      recs.push({ icon: '💧', title: 'Drink more water', desc: `You've reached ${Math.round(hydPct * 100)}% of your hydration goal. Aim for ${waterTarget}ml today.` });
    else if (hydPct >= 1.0)
      recs.push({ icon: '✅', title: 'Hydration goal met!', desc: `Great job! You hit your ${waterTarget}ml water target for today.` });

    if (protPct < 0.6)
      recs.push({ icon: '💪', title: 'Boost protein intake', desc: `You've consumed ${Math.round(consumed.protein)}g of your ${targets.protein}g protein goal.` });

    if (goal === 'lose' && calPct > 0.9 && calPct <= 1.0)
      recs.push({ icon: '🎯', title: 'On track for fat loss', desc: 'Keep maintaining your calorie deficit consistently.' });

    if (goal === 'gain' && calPct >= 1.0)
      recs.push({ icon: '📈', title: 'Great for muscle gain', desc: 'You hit your calorie surplus today. Combine with strength training.' });

    if (recs.length === 0)
      recs.push({ icon: '⭐', title: 'Excellent day!', desc: 'You are hitting all your nutrition and hydration goals.' });

    container.innerHTML = recs.map(r => `
      <div class="recommendation-card">
        <span class="rec-icon">${r.icon}</span>
        <div>
          <strong>${r.title}</strong>
          <span>${r.desc}</span>
        </div>
      </div>
    `).join('');
  },

  // ── Activity feed ───────────────────────────────────────────────
  renderActivityFeed(foods) {
    const container = document.getElementById('activity-list');
    if (!container) return;
    const recent = [...foods].reverse().slice(0, 5);
    if (recent.length === 0) {
      container.innerHTML = `<div class="activity-empty">No activity yet today.</div>`;
      return;
    }
    container.innerHTML = recent.map(f => {
      const time = f.timestamp ? new Date(f.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="activity-item">
          <strong>${f.name}</strong>
          <span>${f.calories} kcal · ${f.meal} · ${time}</span>
        </div>
      `;
    }).join('');
  }
};
