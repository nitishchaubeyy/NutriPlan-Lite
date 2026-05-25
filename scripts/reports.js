// ================================================================
// reports.js — Weekly nutrition reports, smart insights, and exporters
// NutriPlan-Lite
// ================================================================

window.WeeklyReport = (() => {

  // ── Open Modal and Populate Report Data ──────────────────────────
  function openReportModal() {
    const modal = document.getElementById('weekly-report-modal');
    if (!modal) return;

    const weeklyData = window.Storage.getWeeklyData();
    const profile = window.Storage.getProfile();
    const targets = window.Dashboard ? window.Dashboard.computeTargets(profile) : { calories: 2000, protein: 120, waterTarget: 2500 };
    const targetCalories = profile.targetCalories || targets.calories;
    const targetProtein = profile.targetProtein || targets.protein;
    const targetWater = profile.targetWater || profile.waterTarget || 2500;

    // 1. Populate Report Summary Data
    updateReportPrintDOM(weeklyData, targetCalories, targetProtein, targetWater, profile.goal || 'maintain');

    // 2. Open drawer and lock scroll
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // ── Close Modal ──────────────────────────────────────────────────
  function closeReportModal() {
    const modal = document.getElementById('weekly-report-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ── Build Report Sheet Content inside printable DOM container ──────
  function updateReportPrintDOM(weeklyData, targetCalories, targetProtein, targetWater, goal) {
    // A. Range dates
    const startDay = weeklyData[0]?.date ? new Date(weeklyData[0].date) : new Date();
    const endDay = weeklyData[weeklyData.length - 1]?.date ? new Date(weeklyData[weeklyData.length - 1].date) : new Date();
    
    const formatDateStr = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const dateRangeEl = document.getElementById('report-date-range');
    if (dateRangeEl) dateRangeEl.textContent = `${formatDateStr(startDay)} - ${formatDateStr(endDay)}`;

    // B. Calculate aggregates
    const avgCal = Math.round(weeklyData.reduce((s, d) => s + d.calories, 0) / 7);
    const avgProt = Math.round((weeklyData.reduce((s, d) => s + d.protein, 0) / 7) * 10) / 10;
    const avgCarbs = Math.round((weeklyData.reduce((s, d) => s + d.carbs, 0) / 7) * 10) / 10;
    const avgFats = Math.round((weeklyData.reduce((s, d) => s + d.fat, 0) / 7) * 10) / 10;
    const totalWater = weeklyData.reduce((s, d) => s + d.water, 0);
    const totalWaterLiters = (totalWater / 1000).toFixed(1);
    const avgWater = Math.round(totalWater / 7);

    const calAdherenceDays = weeklyData.filter(d => d.calories > 0 && Math.abs(d.calories - targetCalories) / targetCalories <= 0.15).length;
    const waterAdherenceDays = weeklyData.filter(d => d.water > 0 && d.water >= targetWater * 0.75).length;
    const consistencyScore = Math.min(100, Math.round(((calAdherenceDays + waterAdherenceDays) / 14) * 100));

    const loggedDays = weeklyData.filter(d => d.calories > 0).length;
    const calorieAdherencePct = loggedDays > 0 ? Math.round((calAdherenceDays / loggedDays) * 100) : 0;
    const proteinStatusPct = targetProtein > 0 ? Math.round((avgProt / targetProtein) * 100) : 0;
    const streak = window.Storage.getStreak();

    // Populate aggregated stats
    setEl('report-stat-calories', avgCal > 0 ? avgCal + ' kcal' : '—');
    setEl('report-stat-water', totalWater > 0 ? totalWaterLiters + ' Liters' : '—');
    setEl('report-stat-protein', avgProt > 0 ? avgProt + ' grams' : '—');
    setEl('report-stat-consistency', (consistencyScore > 0 ? consistencyScore : 0) + '%');

    // Stats meta values
    setElMeta('report-meta-calories', loggedDays > 0 ? `${calorieAdherencePct}% Adherence` : 'No logs yet', calorieAdherencePct >= 70 ? '#10b981' : calorieAdherencePct >= 40 ? '#f59e0b' : '#ef4444');
    setElMeta('report-meta-protein', avgProt > 0 ? `${proteinStatusPct}% of Goal` : 'No logs yet', proteinStatusPct >= 85 ? '#10b981' : proteinStatusPct >= 50 ? '#f59e0b' : '#ef4444');
    setElMeta('report-meta-water', totalWater > 0 ? `${avgWater} ml / day` : 'No water logged', avgWater >= targetWater * 0.85 ? '#06b6d4' : avgWater >= targetWater * 0.5 ? '#f59e0b' : '#ef4444');
    setElMeta('report-meta-streak', `${streak}-day streak`, streak > 0 ? '#10b981' : '#f59e0b');

    // C. Draw Mini Bar Charts (CSS based high contrast print grids)
    drawPrintMiniBars('print-weekly-calories-bars', weeklyData.map(d => ({ label: d.label, value: d.calories })), targetCalories, '#10b981', '#f59e0b', 'kcal');
    drawPrintMiniBars('print-weekly-water-bars', weeklyData.map(d => ({ label: d.label, value: d.water })), targetWater, '#06b6d4', 'rgba(6,182,212,0.4)', 'ml');

    // D. Build Averages Table Rows
    const tableBody = document.getElementById('report-table-body');
    if (tableBody) {
      tableBody.innerHTML = weeklyData.map(day => `
        <tr>
          <td><strong>${day.label}</strong></td>
          <td style="text-align:right;">${day.calories > 0 ? day.calories : '—'}</td>
          <td style="text-align:right;">${day.protein > 0 ? day.protein + 'g' : '—'}</td>
          <td style="text-align:right;">${day.carbs > 0 ? day.carbs + 'g' : '—'}</td>
          <td style="text-align:right;">${day.fat > 0 ? day.fat + 'g' : '—'}</td>
          <td style="text-align:right;">${day.water > 0 ? day.water + ' ml' : '—'}</td>
        </tr>
      `).join('');
    }

    // E. Generate and render smart AI insights
    const insightsList = document.getElementById('report-insights-list');
    if (insightsList) {
      const insights = generateSmartInsights(weeklyData, targetCalories, targetProtein, targetWater, goal);
      insightsList.innerHTML = insights.map(item => `
        <div class="report-insight-item">
          <span>${item.icon}</span>
          <div>
            <strong>${item.title}</strong> — <span>${item.desc}</span>
          </div>
        </div>
      `).join('');
    }

    // F. Stamp Generation Time
    const timeEl = document.getElementById('report-generation-time');
    if (timeEl) timeEl.textContent = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
  }

  // ── Draw Mini Progress Bars snapshot inside white report sheet ─────
  function drawPrintMiniBars(containerId, dataset, targetVal, primaryColor, altColor, unit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const maxVal = Math.max(targetVal * 1.25, ...dataset.map(d => d.value), 1);
    container.innerHTML = dataset.map(day => {
      const heightPct = Math.min(100, (day.value / maxVal) * 100);
      const isTargetMet = day.value >= targetVal * 0.85;
      const color = day.value === 0 ? '#e2e8f0' : isTargetMet ? primaryColor : altColor;

      return `
        <div class="report-bar-col">
          <span class="report-bar-val">${day.value > 0 ? (day.value >= 1000 && unit === 'ml' ? (day.value/1000).toFixed(1)+'L' : day.value) : '—'}</span>
          <div class="report-bar-wrap">
            <div class="report-bar-fill" style="height:${heightPct}%; background:${color};" title="${day.label}: ${day.value} ${unit}"></div>
          </div>
          <span class="report-bar-label">${day.label}</span>
        </div>
      `;
    }).join('');
  }

  // ── Smart Insights Rule-based Generator ────────────────────────────
  function generateSmartInsights(weeklyData, targetCalories, targetProtein, waterTarget, goal) {
    const insights = [];
    const avgCal = Math.round(weeklyData.reduce((s, d) => s + d.calories, 0) / 7);
    const avgProt = Math.round(weeklyData.reduce((s, d) => s + d.protein, 0) / 7);
    const avgWater = Math.round(weeklyData.reduce((s, d) => s + d.water, 0) / 7);

    const loggedDays = weeklyData.filter(d => d.calories > 0).length;
    const waterMetDays = weeklyData.filter(d => d.water >= waterTarget).length;
    const proteinMetDays = weeklyData.filter(d => d.protein >= targetProtein).length;

    // 1. Calorie insights based on active goal
    if (loggedDays > 0) {
      const calPct = avgCal / targetCalories;
      if (goal === 'lose') {
        if (calPct >= 0.8 && calPct <= 1.0) {
          insights.push({ icon: '🎯', title: 'Optimal calorie deficit', desc: `Your average intake of ${avgCal} kcal aligns with your weight loss plan. Consistently maintaining this deficit supports fat loss.` });
        } else if (calPct > 1.05) {
          insights.push({ icon: '⚠️', title: 'Slight surplus detected', desc: `Your calorie average (${avgCal} kcal) exceeds your target goal of ${targetCalories} kcal. Consider incorporating higher volume, lower calorie foods.` });
        } else {
          insights.push({ icon: '🥗', title: 'Aggressive calorie reduction', desc: `You are averaging ${avgCal} kcal, which is significantly lower than your goal. Ensure you feed your body enough macronutrients to protect lean muscle mass.` });
        }
      } else if (goal === 'gain') {
        if (calPct >= 1.0 && calPct <= 1.15) {
          insights.push({ icon: '📈', title: 'Lean bulking on track', desc: `Average calories (${avgCal} kcal) support muscle protein synthesis surpluses. Combine with progressive strength workouts.` });
        } else if (calPct < 0.95) {
          insights.push({ icon: '⚠️', title: 'Deficit while gaining', desc: `Your average intake (${avgCal} kcal) falls below maintenance targets. Double down on caloric density (nuts, healthy fats) to meet your muscle building goal.` });
        }
      } else {
        if (Math.abs(calPct - 1) <= 0.1) {
          insights.push({ icon: '⚖️', title: 'Weight maintenance baseline met', desc: `Excellent steady energy balance! Your calorie average of ${avgCal} kcal maps neatly to your maintenance target.` });
        }
      }
    }

    // 2. Hydration insights
    if (avgWater > 0) {
      if (waterMetDays >= 5) {
        insights.push({ icon: '💧', title: 'Superior hydration habits', desc: `You hit your fluid target on ${waterMetDays}/7 days this week. Excellent hydration consistency supports joint health, cognitive function, and energy.` });
      } else if (avgWater < waterTarget * 0.7) {
        insights.push({ icon: '🥤', title: 'Increase fluid frequency', desc: `Your average hydration level (${avgWater} ml) is low compared to your target (${waterTarget} ml). Try keeping a water bottle nearby and logging drinks hourly.` });
      }
    } else {
      insights.push({ icon: '❓', title: 'Start tracking water', desc: 'No water logged this week. Stay refreshed and support digestion by drinking at least 2 liters of water daily.' });
    }

    // 3. Protein insights
    if (avgProt > 0) {
      if (proteinMetDays >= 4) {
        insights.push({ icon: '💪', title: 'High-quality protein adherence', desc: `You met your protein targets on ${proteinMetDays} days this week, keeping lean muscle tissues supported and aiding post-workout recovery.` });
      } else if (avgProt < targetProtein * 0.75) {
        insights.push({ icon: '🍗', title: 'Boost amino acids profile', desc: `Average protein (${avgProt}g) is below target (${targetProtein}g). Try adding lean meats, eggs, tofu, fish, or plant-based protein powders to your meals.` });
      }
    }

    // Fallback if no entries yet
    if (insights.length === 0) {
      insights.push({ icon: '🌱', title: 'Welcome to NutriPlan Reports', desc: 'Log meals, proteins, and fluid targets consistently across the week to compile advanced comparative insights.' });
    }

    return insights;
  }

  // ── PDF Document Exporter using html2canvas & jsPDF ──────────────────
  async function exportPDF() {
    const reportSheet = document.getElementById('nutrition-report-print');
    if (!reportSheet) return;

    const btnPDF = document.getElementById('btn-export-pdf');
    if (btnPDF) {
      btnPDF.disabled = true;
      btnPDF.textContent = 'Rendering...';
    }

    try {
      // 1. Capture white report sheet as canvas
      const canvas = await html2canvas(reportSheet, {
        scale: 2, // High resolution crisp text rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // 2. Initialize jsPDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate responsive dimensions to center A4 page perfectly
      const imgWidth = pageWidth - 20; // 10mm margins on left and right
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // Top margin

      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page reports if text wraps extremely long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // 3. Download the PDF
      pdf.save('NutriPlan-Lite-Weekly-Report.pdf');
      Toast.show('PDF Report downloaded successfully!', 'success');

    } catch (err) {
      console.error('PDF generation error:', err);
      Toast.show('Failed to generate PDF. Please try again.', 'error');
    } finally {
      if (btnPDF) {
        btnPDF.disabled = false;
        btnPDF.textContent = 'Download PDF';
      }
    }
  }

  // ── CSV Tabular Summaries Exporter ─────────────────────────────────
  function exportCSV() {
    const weeklyData = window.Storage.getWeeklyData();
    if (weeklyData.length === 0) {
      Toast.show('No weekly log data available to export.', 'warning');
      return;
    }

    try {
      // 1. Build CSV headers and rows
      const headers = ['Date', 'Day Label', 'Calories Consumed (kcal)', 'Protein (g)', 'Carbs (g)', 'Fats (g)', 'Hydration Intake (ml)'];
      const rows = weeklyData.map(d => [
        d.date,
        d.label,
        d.calories,
        d.protein,
        d.carbs,
        d.fat,
        d.water
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(val => `"${val}"`).join(','))
      ].join('\n');

      // 2. Download Blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `NutriPlan-Weekly-Intake-Summary.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Toast.show('CSV Intake Summary downloaded!', 'success');

    } catch (err) {
      console.error('CSV compilation error:', err);
      Toast.show('Failed to compile CSV spreadsheet.', 'error');
    }
  }

  // ── DOM Helpers ──────────────────────────────────────────────────
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setElMeta(id, val, color) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = val;
      el.style.color = color;
    }
  }

  // ── Wire up events ───────────────────────────────────────────────
  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;

    document.addEventListener('click', e => {
      if (e.target.closest('#btn-generate-report')) {
        openReportModal();
      } else if (e.target.closest('#close-report-x') || e.target.closest('#close-report-backdrop')) {
        closeReportModal();
      } else if (e.target.closest('#btn-export-pdf')) {
        exportPDF();
      } else if (e.target.closest('#btn-export-csv')) {
        exportCSV();
      }
    });
  }

  // ── Public APIs ──────────────────────────────────────────────────
  return {
    init,
    openReportModal,
    closeReportModal,
    exportPDF,
    exportCSV
  };
})();
