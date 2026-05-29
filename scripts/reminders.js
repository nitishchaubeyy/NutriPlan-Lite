// ================================================================
// reminders.js — Smart Meal Reminder & Habit Tracking System
// NutriPlan-Lite
// ================================================================

window.Reminders = (() => {
  let remindersState = {
    breakfast: { enabled: true, time: "08:00", label: "Breakfast" },
    lunch: { enabled: true, time: "13:00", label: "Lunch" },
    dinner: { enabled: true, time: "20:00", label: "Dinner" },
    hydration: { enabled: true, time: "10:00", label: "Hydration" }
  };

  let habitsState = [
    { id: "habit-log-meals", name: "Complete meal logging", desc: "Log breakfast, lunch, and dinner today.", points: 15, checked: false },
    { id: "habit-water-target", name: "Hit water goal", desc: "Meet your calculated daily hydration target.", points: 10, checked: false },
    { id: "habit-protein-floor", name: "protein floor baseline", desc: "Hit at least 85% of your target daily protein.", points: 15, checked: false },
    { id: "habit-calorie-bounds", name: "Stay in calorie budget", desc: "Do not exceed your target calories limit.", points: 20, checked: false }
  ];

  let schedulerTimer = null;

  // Schedule polling to check for custom notification alarms
  function startNotificationScheduler() {
    if (schedulerTimer) clearInterval(schedulerTimer);

    schedulerTimer = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMins}`;

      Object.entries(remindersState).forEach(([key, config]) => {
        if (config.enabled && config.time === currentTime) {
          triggerNotification(config.label);
        }
      });
    }, 60000); // Check once per minute
  }

  function triggerNotification(label) {
    const text = label === "Hydration" 
      ? "Time to hydrate! Grab a fresh glass of water to keep your hydration streak going." 
      : `Time for your ${label}! Log your food intake in NutriPlan to keep your calorie goals aligned.`;

    // 1. Trigger Browser Notification (if permission granted)
    if (Notification.permission === "granted") {
      new Notification(`NutriPlan Reminder: ${label}`, {
        body: text,
        icon: "/favicon.ico"
      });
    }

    // 2. Trigger beautiful In-App Toast
    if (window.Toast) {
      window.Toast.show(`🔔 ${label} Reminder: ${text}`, "info", 5000);
    }
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      if (window.Toast) window.Toast.show("This browser does not support desktop notifications.", "warning");
      return false;
    }

    if (Notification.permission === "granted") return true;

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      if (window.Toast) window.Toast.show("Notifications enabled successfully!", "success");
      return true;
    } else {
      if (window.Toast) window.Toast.show("Notification permission denied.", "warning");
      return false;
    }
  }

  function toggleReminder(key, enabled) {
    if (remindersState[key]) {
      remindersState[key].enabled = enabled;
      localStorage.setItem("np_reminders_schedule", JSON.stringify(remindersState));
      if (window.Toast) window.Toast.show(`${remindersState[key].label} reminder ${enabled ? 'enabled' : 'disabled'}.`, "info");
    }
  }

  function updateReminderTime(key, time) {
    if (remindersState[key]) {
      remindersState[key].time = time;
      localStorage.setItem("np_reminders_schedule", JSON.stringify(remindersState));
    }
  }

  // Load and save state routines
  function loadPersistedState() {
    // 1. Load Custom Reminder schedule
    const savedSchedule = localStorage.getItem("np_reminders_schedule");
    if (savedSchedule) {
      try {
        remindersState = JSON.parse(savedSchedule);
      } catch (e) {
        console.error("Could not parse reminders schedule", e);
      }
    }

    // 2. Load Checklist states for the current selected day
    const dateKey = window.Tracker ? window.Tracker.currentDate : new Date().toISOString().split('T')[0];
    const savedHabits = localStorage.getItem(`np_habits_log_${dateKey}`);
    if (savedHabits) {
      try {
        const checkedIds = JSON.parse(savedHabits);
        habitsState.forEach(h => {
          h.checked = checkedIds.includes(h.id);
        });
      } catch (e) {
        console.error("Could not parse habits log", e);
      }
    } else {
      // Reset checklist default states for a new day
      habitsState.forEach(h => {
        h.checked = false;
      });
    }
  }

  function toggleHabit(id) {
    const habit = habitsState.find(x => x.id === id);
    if (habit) {
      habit.checked = !habit.checked;

      // Save Checked Checklist items to localStorage
      const dateKey = window.Tracker ? window.Tracker.currentDate : new Date().toISOString().split('T')[0];
      const checkedIds = habitsState.filter(x => x.checked).map(x => x.id);
      localStorage.setItem(`np_habits_log_${dateKey}`, JSON.stringify(checkedIds));

      if (window.Toast) window.Toast.show(`Habit updated: +${habit.points} consistency points earned!`, "success");
      
      render();
    }
  }

  function getHabitProgress() {
    if (habitsState.length === 0) return 0;
    const checked = habitsState.filter(x => x.checked).length;
    return Math.round((checked / habitsState.length) * 100);
  }

  function render() {
    const remindersContainer = document.getElementById("reminders-timeline");
    if (!remindersContainer) return;

    let schedulerHtml = "";
    Object.entries(remindersState).forEach(([key, config]) => {
      schedulerHtml += `
        <div class="scheduler-item">
          <div class="scheduler-item-left">
            <span class="scheduler-icon">${key === 'hydration' ? '💧' : '⏰'}</span>
            <div>
              <span class="scheduler-title">${config.label} Alert</span>
              <span class="scheduler-desc">Trigger a daily push notification alert at ${config.time}.</span>
            </div>
          </div>
          <div class="scheduler-item-right">
            <input type="time" class="scheduler-time-input" data-reminder-time-key="${key}" value="${config.time}">
            <label class="switch">
              <input type="checkbox" data-reminder-switch-key="${key}" ${config.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `;
    });

    let habitsHtml = "";
    habitsState.forEach(h => {
      habitsHtml += `
        <div class="habit-item ${h.checked ? 'checked' : ''}" data-habit-id="${h.id}">
          <div class="habit-item-left">
            <div class="habit-checkbox"></div>
            <div>
              <span class="habit-name">${h.name}</span>
              <span class="habit-desc">${h.desc}</span>
            </div>
          </div>
          <span class="habit-points">+${h.points} pts</span>
        </div>
      `;
    });

    const progress = getHabitProgress();

    remindersContainer.innerHTML = `
      <div class="reminders-layout">
        <!-- Reminders Scheduler Card -->
        <div class="glass-panel reminders-card">
          <div class="reminders-card-header">
            <h2>Smart Reminders</h2>
            <p>Schedule meal time triggers and fluid ingestion alerts to remain context-aware.</p>
          </div>
          <button id="reminders-btn-permission" class="secondary-button" style="margin-bottom:var(--space-xs);" type="button">🔔 Request Notification Permission</button>
          <div class="scheduler-list">
            ${schedulerHtml}
          </div>
        </div>

        <!-- Daily Habits Card -->
        <div class="glass-panel reminders-card">
          <div class="reminders-card-header">
            <h2>Habits Checklist</h2>
            <p>Log everyday baseline guidelines. Achieve consistency to advance streaks and compliance indices.</p>
          </div>
          <div class="reminders-progress-card">
            <div class="reminders-progress-info">
              <h4>Daily Compliance</h4>
              <p>Checked checklist points progress.</p>
            </div>
            <div class="reminders-progress-ring" id="reminders-progress-ring" style="--progress: ${progress}%">
              <span>${progress}%</span>
            </div>
          </div>
          <div class="habit-item-list" style="margin-top:var(--space-xs)">
            ${habitsHtml}
          </div>
        </div>
      </div>
    `;

    // Bind Checklist elements
    document.querySelectorAll("[data-habit-id]").forEach(el => {
      el.addEventListener("click", () => {
        toggleHabit(el.dataset.habitId);
      });
    });

    // Bind toggle buttons
    document.querySelectorAll("[data-reminder-switch-key]").forEach(el => {
      el.addEventListener("change", (e) => {
        toggleReminder(el.dataset.reminderSwitchKey, e.target.checked);
      });
    });

    // Bind time inputs
    document.querySelectorAll("[data-reminder-time-key]").forEach(el => {
      el.addEventListener("change", (e) => {
        updateReminderTime(el.dataset.reminderTimeKey, e.target.value);
      });
    });

    // Bind Permission Button
    const permBtn = document.getElementById("reminders-btn-permission");
    if (permBtn) {
      permBtn.addEventListener("click", requestNotificationPermission);
    }

    // Update Progress Ring rendering
    const ring = document.getElementById("reminders-progress-ring");
    if (ring) {
      ring.style.background = `conic-gradient(var(--accent) ${progress}%, rgba(148, 163, 184, 0.12) ${progress}%)`;
    }
  }

  function init() {
    loadPersistedState();
    render();
    startNotificationScheduler();
  }

  return { init, refresh: init };
})();
