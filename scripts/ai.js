// ================================================================
// Vite Build-Time Environment Variable Core Architecture
// ================================================================
const VITE_GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || null;
const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || null;

// Local browser storage fallback pattern (for manual settings cog injections)
const LOCAL_GEMINI_KEY = localStorage.getItem('user_gemini_key');
const LOCAL_SUPABASE_URL = localStorage.getItem('user_supabase_url');

// Operational production runtime parameters computation
const activeGeminiKey = VITE_GEMINI_KEY || LOCAL_GEMINI_KEY;
const activeSupabaseUrl = VITE_SUPABASE_URL || LOCAL_SUPABASE_URL;

export const isCloudModeActive = Boolean(activeGeminiKey && activeSupabaseUrl);

// ================================================================
// Client-Side API Fault Isolation & Banner Injection Pipeline
// ================================================================
export function checkApiStatus() {
  if (!isCloudModeActive) {
    console.warn("NutriPlan-Lite: Running in Local-First Demo Mode (No compile-time or local keys found).");
    showStatusBanner("demo");
    return false;
  }
  return true;
}

export function showStatusBanner(type, message = "") {
  // Target template layout context container or top layout node body fallback
  const aiContainer = document.getElementById('ai-coach-view') || document.getElementById('main-ai-feed') || document.body;
  
  // Guard-clause validation block to stop redundant duplicate injections
  if (document.getElementById('api-status-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'api-status-banner';
  
  if (type === 'demo') {
    banner.className = 'bg-blue-500/20 border border-blue-500 text-blue-200 p-4 rounded-xl my-3 text-sm text-center font-medium backdrop-blur-md transition-all duration-300';
    banner.innerText = 'ℹ️ Running in Local-First Demo Mode. Calorie calculations and local metric updates persist offline!';
  } else if (type === 'error') {
    banner.className = 'bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-xl my-3 text-sm text-center font-medium backdrop-blur-md transition-all duration-300';
    banner.innerText = message || '⚠️ API Connection Fault (401/403 Invalid Context). Verify credentials inside your Settings layer.';
  }

  aiContainer.prepend(banner);
}

// ================================================================
// Main AI Closure Component Structure
// ================================================================
window.AI = (() => {

  // ── Contextual rule-based local fallback response engine ───────
  const rules = [
    {
      test: /^(hi|hello|hey|good morning|good evening|good afternoon)/i,
      reply: (ctx) => `Hey there. I'm your nutrition coach. You've logged **${ctx.calories} kcal** today with **${Math.round(ctx.calPct)}%** of your goal hit. How can I help you today?`
    },
    {
      test: /how.*doing|progress|status|summary/i,
      reply: (ctx) => {
        const hydMsg = ctx.hydPct >= 1 ? 'Hydration goal met! 💧' : `Hydration at ${Math.round(ctx.hydPct * 100)}%.`;
        return `📊 **Daily Summary:**\n- Calories: ${ctx.calories}/${ctx.targetCal} kcal (${Math.round(ctx.calPct)}%)\n- Protein: ${ctx.protein}/${ctx.targetProtein}g\n- Carbs: ${ctx.carbs}/${ctx.targetCarbs}g\n- Fat: ${ctx.fat}/${ctx.targetFat}g\n- ${hydMsg}\n\nHealth Score: **${ctx.score}/100** ${ctx.score >= 80 ? '🌟' : ctx.score >= 50 ? '💪' : '🎯'}`;
      }
    },
    {
      test: /water|hydrat|drink/i,
      reply: (ctx) => {
        const rem = Math.max(0, ctx.waterTarget - ctx.water);
        if (ctx.hydPct >= 1) return `✅ Amazing! You've hit your hydration goal of ${ctx.waterTarget}ml. Keep sipping!`;
        return `💧 You've had **${ctx.water}ml** of your ${ctx.waterTarget}ml goal. That's ${Math.round(ctx.hydPct * 100)}%. You need **${rem}ml** more — try a glass every hour!`;
      }
    },
    {
      test: /protein|muscle|build|strength/i,
      reply: (ctx) => {
        if (ctx.protPct >= 0.9) return `💪 Excellent protein intake! You're at **${ctx.protein}g** of ${ctx.targetProtein}g. Keep it up!`;
        return `💪 Your protein is at **${ctx.protein}g** (${Math.round(ctx.protPct * 100)}% of goal). To hit ${ctx.targetProtein}g, try adding: eggs, Greek yogurt, chicken, paneer, tofu, or dal to your next meal.`;
      }
    },
    {
      test: /calori|calorie|kcal|eat|food/i,
      reply: (ctx) => {
        const rem = Math.max(0, ctx.targetCal - ctx.calories);
        if (ctx.calPct > 1.1) return `⚠️ You're **${ctx.calories - ctx.targetCal} kcal over** your target. Consider a lighter dinner or skip the evening snack.`;
        if (ctx.calPct < 0.5 && ctx.calories === 0) return `🍽️ You haven't logged any food yet today. Start with breakfast to fuel your body and track your nutrition!`;
        return `🍽️ You've eaten **${ctx.calories} kcal** (${Math.round(ctx.calPct * 100)}% of goal). ${rem > 0 ? `You have ${Math.round(rem)} kcal remaining.` : 'You\'ve hit your calorie goal!'}`;
      }
    },
    {
      test: /carb|carbs|energy|fatigue/i,
      reply: (ctx) => {
        const carbPct = ctx.targetCarbs > 0 ? ctx.carbs / ctx.targetCarbs : 0;
        if (carbPct < 0.5) return `⚡ Your carbs are low at **${ctx.carbs}g** of ${ctx.targetCarbs}g. Add rice, oats, fruits, or whole grains for sustained energy.`;
        return `✅ Carb intake looks good at **${ctx.carbs}g** (${Math.round(carbPct * 100)}% of goal). Carbs fuel your brain and muscles!`;
      }
    },
    {
      test: /fat|fats|healthy fat|omega/i,
      reply: (ctx) => {
        const fatPct = ctx.targetFat > 0 ? ctx.fat / ctx.targetFat : 0;
        if (fatPct > 1.2) return `⚠️ Fat intake is high at **${ctx.fat}g** (${Math.round(fatPct * 100)}% of goal). Consider reducing fried foods, butter, or full-fat dairy.`;
        return `Fats are at **${ctx.fat}g** of ${ctx.targetFat}g (${Math.round(fatPct * 100)}%). Healthy fats from nuts, seeds, avocado, and fish support brain and hormone health.`;
      }
    },
    {
      test: /lose weight|fat loss|deficit|cut/i,
      reply: (ctx) => `For fat loss: aim for a **300–500 kcal daily deficit**. Your target is ${ctx.targetCal} kcal. Keep protein high (${ctx.targetProtein}g/day), stay hydrated, and prioritize whole foods. Consistency beats perfection! 🎯`
    },
    {
      test: /gain weight|bulk|muscle gain|surplus/i,
      reply: (ctx) => `For muscle gain: eat in a **200–400 kcal surplus**. Your current target is ${ctx.targetCal} kcal. Prioritize protein (${ctx.targetProtein}g/day), time carbs around workouts, and get 7–9 hours of sleep. 💪`
    },
    {
      test: /breakfast|morning meal/i,
      reply: () => `🌅 **Healthy breakfast ideas:**\n- Oats with whey protein + banana (450 kcal, 32g protein)\n- Eggs (3) + whole wheat toast + fruits (400 kcal, 28g protein)\n- Greek yogurt bowl + nuts + berries (350 kcal, 22g protein)\n- Paneer bhurji with 2 rotis (480 kcal, 26g protein)`
    },
    {
      test: /lunch|afternoon meal|midday/i,
      reply: () => `☀️ **Balanced lunch ideas:**\n- Dal + rice + sabzi + curd (550 kcal, 25g protein)\n- Chicken breast + brown rice + vegetables (520 kcal, 42g protein)\n- Rajma chawal + salad (500 kcal, 22g protein)\n- Quinoa bowl + tofu + greens (460 kcal, 28g protein)`
    },
    {
      test: /dinner|evening meal|supper/i,
      reply: () => `🌙 **Light dinner ideas:**\n- Grilled fish + steamed vegetables (380 kcal, 35g protein)\n- Paneer curry + 1 roti (400 kcal, 24g protein)\n- Vegetable soup + whole wheat bread (300 kcal, 12g protein)\n- Egg white omelette + salad (280 kcal, 26g protein)`
    },
    {
      test: /snack|snacks/i,
      reply: () => `🍎 **Smart snack options:**\n- Handful of almonds + green tea (180 kcal)\n- Greek yogurt + honey (150 kcal, 12g protein)\n- Banana + peanut butter (220 kcal)\n- Boiled egg + cucumber (90 kcal, 8g protein)\n- Roasted chickpeas (150 kcal, 8g protein)`
    },
    {
      test: /streak|consistency|habit/i,
      reply: (ctx) => `🔥 Your current tracking streak is **${ctx.streak} day${ctx.streak !== 1 ? 's' : ''}**! ${ctx.streak >= 7 ? 'Incredible consistency — you\'re building a real habit!' : ctx.streak >= 3 ? 'Great start! Keep going to build your streak.' : 'Every day you log is a step forward. You\'ve got this!'}`
    },
    {
      test: /score|health score|rating/i,
      reply: (ctx) => {
        const feedback = ctx.score >= 85 ? 'Outstanding! 🌟' : ctx.score >= 70 ? 'Great job! 💪' : ctx.score >= 50 ? 'Good progress! 🎯' : 'Room to improve — start by logging meals and drinking water!';
        return `Your Nutrition Score is **${ctx.score}/100**. ${feedback}\n\nScore breakdown:\n- Calorie accuracy: ${Math.round(ctx.calPct * 100)}%\n- Protein target: ${Math.round(ctx.protPct * 100)}%\n- Hydration: ${Math.round(ctx.hydPct * 100)}%`;
      }
    },
    {
      test: /thank|thanks|great|awesome|amazing|helpful/i,
      reply: () => `You're welcome! 😊 Keep up the great work with your nutrition journey. Every healthy choice counts! 🌱`
    }
  ];

  function getContext() {
    const profile = typeof Storage !== 'undefined' ? Storage.getProfile() : {};
    const dateKey = typeof Tracker !== 'undefined' ? Tracker.currentDate : new Date().toISOString().split('T')[0];
    const consumed = typeof Tracker !== 'undefined' ? Tracker.computeTotals(dateKey) : { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const water = typeof Storage !== 'undefined' ? Storage.getWater(dateKey) : 0;
    const waterTarget = profile.waterTarget || 2500;
    const targets = typeof Dashboard !== 'undefined' ? Dashboard.computeTargets(profile) : { calories: 2000, protein: 150, carbs: 200, fat: 65 };
    const score = typeof Analytics !== 'undefined' ? Analytics.calculateHealthScore(consumed, targets, water, waterTarget) : 70;
    const streak = typeof Storage !== 'undefined' ? Storage.getStreak() : 0;

    return {
      calories: Math.round(consumed.calories),
      protein: Math.round(consumed.protein * 10) / 10,
      carbs: Math.round(consumed.carbs * 10) / 10,
      fat: Math.round(consumed.fat * 10) / 10,
      water,
      waterTarget,
      targetCal: targets.calories,
      targetProtein: targets.protein,
      targetCarbs: targets.carbs,
      targetFat: targets.fat,
      calPct: targets.calories > 0 ? consumed.calories / targets.calories : 0,
      protPct: targets.protein > 0 ? consumed.protein / targets.protein : 0,
      hydPct: waterTarget > 0 ? water / waterTarget : 0,
      score,
      streak,
      goal: profile.goal || 'maintain'
    };
  }

  function getReply(prompt) {
    const ctx = getContext();
    const matched = rules.find(r => r.test.test(prompt));
    if (matched) return matched.reply(ctx);
    return `I'm here to help with your nutrition. You've logged **${ctx.calories} kcal** today (${Math.round(ctx.calPct * 100)}% of goal). Ask me about meals, macros, hydration, recipes, or your progress.`;
  }

  // Production runtime external dynamic cloud dispatcher
  async function queryCloudGeminiAI(prompt) {
    try {
      const targetEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${activeGeminiKey}`;
      const response = await fetch(targetEndpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }] 
        })
      });

      // Catch localized auth errors gracefully without exploding execution tree
      if (response.status === 401 || response.status === 403) {
        showStatusBanner('error', '⚠️ Remote AI processing engine rejected your credentials (401/403). Falling back to offline engine!');
        return null;
      }

      const rawResult = await response.json();
      return rawResult?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err) {
      console.error("Intercepted runtime network drop:", err);
      showStatusBanner('error', '⚠️ Cloud API connection timed out. Local pipeline is taking over.');
      return null;
    }
  }

  // Mini coach chat panel handler module
  function initMainChat() {
    const feed = document.getElementById('main-ai-feed');
    const form = document.getElementById('main-ai-form');
    const input = document.getElementById('main-ai-input');
    const clearBtn = document.getElementById('clear-ai-chat');
    
    if (!form || !feed) return; 

    if (form.dataset.initialized) return;
    form.dataset.initialized = 'true';

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        feed.innerHTML = `
          <div class="chat-bubble ai-bubble">
            <p>Chat cleared. How can I help you today?</p>
          </div>
        `;
      });
    }

    document.querySelectorAll('.prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (input) {
          input.value = btn.textContent;
          input.focus();
        }
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const prompt = input?.value.trim();
      if (!prompt) return;
      
      appendMessage('user-bubble', prompt);
      input.value = '';
      
      const typingId = 'typing-' + Date.now();
      appendMessage('ai-bubble', '...', typingId);
      
      let finalReply = null;

      // Conditional selection pattern based on cloud eligibility
      if (isCloudModeActive) {
        finalReply = await queryCloudGeminiAI(prompt);
      }

      // Local system takes over execution block if cloud returns empty/error 
      if (!finalReply) {
        finalReply = getReply(prompt);
      }
      
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();
      appendMessage('ai-bubble', finalReply);
    });
  }

  // Dashboard coach insights panel generator module
  function generateInsights() {
    const container = document.getElementById('ai-insights');
    if (!container) return;
    const ctx = getContext();
    const insights = [];

    if (ctx.calories === 0) {
      insights.push({ type: 'info', title: 'Ready to track!', msg: 'Log your first meal to see your daily nutrition analysis.' });
    } else if (ctx.calPct > 1.1) {
      insights.push({ type: 'warning', title: 'Over calorie limit', msg: `You're ${Math.round(ctx.calories - ctx.targetCal)} kcal over your daily goal.` });
    } else if (ctx.calPct >= 0.85) {
      insights.push({ type: 'success', title: 'Calorie goal on track', msg: `Great job! ${Math.round(ctx.calPct * 100)}% of your daily calorie target reached.` });
    } else {
      insights.push({ type: 'info', title: 'Keep fueling up', msg: `${Math.round(ctx.targetCal - ctx.calories)} kcal remaining to reach your daily goal.` });
    }

    if (ctx.protPct < 0.5) {
      insights.push({ type: 'warning', title: 'Low protein intake', msg: `Only ${ctx.protein}g of ${ctx.targetProtein}g goal. Add eggs, chicken, or dal to boost protein.` });
    } else if (ctx.protPct >= 0.9) {
      insights.push({ type: 'success', title: 'Protein target hit!', msg: `Excellent! You're at ${ctx.protein}g protein — supporting muscle and recovery.` });
    }

    if (ctx.hydPct < 0.5) {
      insights.push({ type: 'warning', title: 'Stay hydrated', msg: `Only ${ctx.water}ml of ${ctx.waterTarget}ml. Drink a glass of water now! 💧` });
    } else if (ctx.hydPct >= 1) {
      insights.push({ type: 'success', title: 'Hydration goal met! 💧', msg: `You've hit your ${ctx.waterTarget}ml water target today. Keep it up!` });
    }

    if (ctx.streak >= 3) {
      insights.push({ type: 'success', title: `🔥 ${ctx.streak}-day streak!`, msg: `Impressive consistency! Keep logging daily to maintain your healthy habit.` });
    }

    container.innerHTML = insights.map(i => `
      <div class="insight-card ${i.type}">
        <strong>${i.title}</strong>
        <span>${i.msg}</span>
      </div>
    `).join('');
  }

  // Automatically execute environment validations inside closure lifecycle hooks
  function init() {
    checkApiStatus();
    initMainChat();
    generateInsights();
  }

  return { init, initMainChat, generateInsights, getReply };
})();

// Self-contained DOM lifecycle execution block
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.AI.init());
} else {
  window.AI.init();
}