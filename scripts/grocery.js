// ================================================================
// grocery.js — Smart Grocery List Generator Module
// NutriPlan-Lite
// ================================================================

window.Grocery = (() => {
  let shoppingListState = [];

  // Core foods library for suggestions categorized by macro type
  const groceryDatabase = {
    protein: [
      { name: "Chicken breast", baseQty: 500, unit: "g" },
      { name: "Lean beef", baseQty: 400, unit: "g" },
      { name: "Scrambled egg whites", baseQty: 10, unit: "eggs" },
      { name: "Greek yogurt", baseQty: 500, unit: "g" },
      { name: "Fresh paneer", baseQty: 400, unit: "g" },
      { name: "Organic tofu", baseQty: 300, unit: "g" },
      { name: "Atlantic salmon", baseQty: 350, unit: "g" }
    ],
    carbs: [
      { name: "Rolled oats", baseQty: 500, unit: "g" },
      { name: "Brown rice", baseQty: 750, unit: "g" },
      { name: "Sweet potatoes", baseQty: 600, unit: "g" },
      { name: "Whole wheat bread", baseQty: 1, unit: "loaf" },
      { name: "Quinoa grain", baseQty: 350, unit: "g" },
      { name: "Whole wheat pasta", baseQty: 400, unit: "g" }
    ],
    fats: [
      { name: "Avocado", baseQty: 3, unit: "pcs" },
      { name: "Raw almonds", baseQty: 200, unit: "g" },
      { name: "Extra virgin olive oil", baseQty: 250, unit: "ml" },
      { name: "Walnuts", baseQty: 150, unit: "g" },
      { name: "Chia seeds", baseQty: 100, unit: "g" },
      { name: "Peanut butter", baseQty: 340, unit: "g" }
    ],
    micronutrients: [
      { name: "Fresh spinach", baseQty: 200, unit: "g" },
      { name: "Broccoli florets", baseQty: 300, unit: "g" },
      { name: "Blueberries", baseQty: 150, unit: "g" },
      { name: "Bananas", baseQty: 5, unit: "pcs" },
      { name: "Red bell peppers", baseQty: 3, unit: "pcs" },
      { name: "Baby carrots", baseQty: 250, unit: "g" }
    ]
  };

  // Generate grocery list items dynamically based on BMR and macro choices
  function generateWeeklyList() {
    const profile = window.Storage ? window.Storage.getProfile() : {};
    
    // Determine caloric multiplier (higher calories = larger portions)
    const baseCalories = 2000;
    let targetCalories = baseCalories;
    if (window.Dashboard && window.Dashboard.computeTargets) {
      targetCalories = window.Dashboard.computeTargets(profile).calories;
    }
    const multiplier = targetCalories / baseCalories;

    // Determine macro goals to adjust ratios
    const goal = profile.goal || "maintain";
    const split = profile.macroSplit || "balanced";

    const list = [];
    const addGroup = (type, badgeClass, scale = 1.0) => {
      const items = groceryDatabase[type] || [];
      items.forEach(item => {
        let qty = Math.round(item.baseQty * multiplier * scale);
        // Clean egg whites vs grams display
        if (item.unit === "eggs" || item.unit === "pcs" || item.unit === "loaf") {
          qty = Math.max(1, Math.round(item.baseQty * scale));
        }

        list.push({
          id: `${type}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: item.name,
          quantity: qty,
          unit: item.unit,
          category: type,
          badgeClass,
          checked: false
        });
      });
    };

    // Scale grocery components depending on macronutrient split preference
    if (split === "highprotein") {
      addGroup("protein", "badge-protein", 1.4);
      addGroup("carbs", "badge-carbs", 0.8);
      addGroup("fats", "badge-fats", 0.9);
    } else if (split === "lowcarb") {
      addGroup("protein", "badge-protein", 1.2);
      addGroup("carbs", "badge-carbs", 0.4);
      addGroup("fats", "badge-fats", 1.4);
    } else {
      // Balanced standard splits
      addGroup("protein", "badge-protein", 1.0);
      addGroup("carbs", "badge-carbs", 1.0);
      addGroup("fats", "badge-fats", 1.0);
    }
    addGroup("micronutrients", "badge-micronutrients", 1.0);

    shoppingListState = list;
    
    // Load check states from localStorage if they match current IDs
    const savedStates = localStorage.getItem("np_shopping_checklist");
    if (savedStates) {
      try {
        const checkedIds = JSON.parse(savedStates);
        shoppingListState.forEach(item => {
          if (checkedIds.includes(item.id)) {
            item.checked = true;
          }
        });
      } catch (e) {
        console.error("Could not load checklist states", e);
      }
    }
  }

  function toggleItem(id) {
    const item = shoppingListState.find(x => x.id === id);
    if (item) {
      item.checked = !item.checked;
      
      // Save checked states to localStorage
      const checkedIds = shoppingListState.filter(x => x.checked).map(x => x.id);
      localStorage.setItem("np_shopping_checklist", JSON.stringify(checkedIds));
      
      render();
    }
  }

  function getProgress() {
    if (shoppingListState.length === 0) return 0;
    const checked = shoppingListState.filter(x => x.checked).length;
    return Math.round((checked / shoppingListState.length) * 100);
  }

  function render() {
    const listContainer = document.getElementById("grocery-timeline");
    if (!listContainer) return;

    // Group items by category to render structured sections
    const categories = {
      protein: { title: "🍖 High Proteins", badge: "badge-protein", icon: "badge-protein" },
      carbs: { title: "🍞 Complex Carbs", badge: "badge-carbs", icon: "badge-carbs" },
      fats: { title: "🥑 Healthy Fats", badge: "badge-fats", icon: "badge-fats" },
      micronutrients: { title: "🥗 Fruits & Vegetables", badge: "badge-micronutrients", icon: "badge-micronutrients" }
    };

    let html = "";
    Object.entries(categories).forEach(([catKey, catMeta]) => {
      const items = shoppingListState.filter(x => x.category === catKey);
      if (items.length === 0) return;

      html += `
        <div class="glass-panel grocery-card">
          <div class="grocery-card-header">
            <h3>${catMeta.title}</h3>
            <span class="grocery-badge ${catMeta.badge}">${catKey}</span>
          </div>
          <div class="grocery-item-list">
            ${items.map(item => `
              <div class="grocery-item ${item.checked ? 'checked' : ''}" data-grocery-item-id="${item.id}">
                <div class="grocery-item-left">
                  <div class="grocery-checkbox"></div>
                  <span class="grocery-name">${item.name}</span>
                </div>
                <span class="grocery-qty">${item.quantity} ${item.unit}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = `<div class="grocery-grid">${html}</div>`;

    // Bind click events on items
    document.querySelectorAll("[data-grocery-item-id]").forEach(el => {
      el.addEventListener("click", () => {
        toggleItem(el.dataset.groceryItemId);
      });
    });

    // Update Progress Ring
    const progress = getProgress();
    const ring = document.getElementById("grocery-progress-ring");
    if (ring) {
      ring.style.background = `conic-gradient(var(--accent) ${progress}%, rgba(148, 163, 184, 0.12) ${progress}%)`;
      const countEl = ring.querySelector("span");
      if (countEl) countEl.textContent = `${progress}%`;
    }
  }

  function copyToClipboard() {
    if (shoppingListState.length === 0) return;
    const text = shoppingListState.map(item => {
      const status = item.checked ? "[x]" : "[ ]";
      return `${status} ${item.name} - ${item.quantity} ${item.unit} (${item.category})`;
    }).join("\n");

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.Toast) window.Toast.show("Grocery list copied to clipboard!", "success");
      });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      if (window.Toast) window.Toast.show("Grocery list copied to clipboard!", "success");
    }
  }

  function resetChecklist() {
    shoppingListState.forEach(item => {
      item.checked = false;
    });
    localStorage.removeItem("np_shopping_checklist");
    if (window.Toast) window.Toast.show("Shopping list cleared!", "info");
    render();
  }

  function init() {
    generateWeeklyList();
    render();

    // Bind Action Buttons
    const copyBtn = document.getElementById("grocery-btn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", copyToClipboard);
    }

    const resetBtn = document.getElementById("grocery-btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetChecklist);
    }
  }

  return { init, refresh: init };
})();
