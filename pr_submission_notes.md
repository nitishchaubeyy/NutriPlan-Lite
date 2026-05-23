# Pull Request Submission Description

Copy and paste this markdown text directly into your GitHub Pull Request description.

---

## Title
feat: Upgrade to Online Supabase DB, Premium Glassmorphic Dashboard, and AI Integrations

## Description
This pull request brings massive enhancements to **NutriPlan Lite**, elevating it from a simple local calorie counter into a full-featured, persistent, and intelligent fitness companion. It adds online database synchronization (via Supabase), robust local fallback modes, calendar history logs, and AI utilities (via Gemini API).

### 🚀 Key Additions & Features

1. **Online Database Sync & Authentication (Supabase)**:
   * Real-time saving of user profiles, hydration targets, and categorized food logs.
   * Row Level Security (RLS) policies to isolate user records.
   * Automated Postgres triggers to bootstrap default profiles on registration.
2. **Local Fallback Mode**:
   * If database keys are not set, the app runs locally on `localStorage` in "Demo Mode" with zero broken features.
3. **Advanced Demographics & Goal Customization**:
   * Custom weight goals (Weight Loss: -500 kcal, Weight Gain: +300 kcal, Maintenance).
   * Selection between Balanced, Low-Carb, High-Protein, or custom macronutrient split percentages.
4. **Enhanced Data Visualizations**:
   * Interactive **Chart.js** doughnut gauge displaying consumed vs remaining calories in real time.
   * Progress meters for protein, carbohydrate, and fat limits.
5. **AI Nutrition Coach & Quick Logger (Gemini API)**:
   * **AI Quick Log**: Convert natural language descriptions (e.g., *"I had a banana and 3 scrambled eggs for breakfast"*) into structured, weighed food logs.
   * **AI Coach Aria**: A smart chatbot assistant that contextualizes advice based on the user's vitals and actual food entries today.
6. **Detailed Food Database**:
   * Extended `foodDB.json` with detailed macronutrient mappings for all 43+ food items.

---

## 🛠️ File-by-File Changes Summary

* **[index.html](file:///c:/Users/jayav/Desktop/nutriapp/NutriPlan-Lite/index.html)**:
  * Integrated CDN scripts for Supabase JS SDK and Chart.js.
  * Added responsive dashboard cards, calendar date selectors, settings cogs, and modular modals (Add Food form, API config form, Auth login overlay).
* **[style.css](file:///c:/Users/jayav/Desktop/nutriapp/NutriPlan-Lite/style.css)**:
  * Implemented a dark theme color system, custom scrollbars, and fine-bordered glass cards.
  * Explicitly styled dropdown `select option` elements to prevent white-on-white text rendering issues in Windows browsers.
* **[script.js](file:///c:/Users/jayav/Desktop/nutriapp/NutriPlan-Lite/script.js)**:
  * Refactored application state lifecycle (`appState`, `dayState`, `localState`).
  * Programmed unified CRUD actions for logging food and water (dual DB/local modes).
  * Added Gemini API REST connectors for natural language parsing and chatbot coaching.
* **[foodDB.json](file:///c:/Users/jayav/Desktop/nutriapp/NutriPlan-Lite/foodDB.json)**:
  * Expanded list of foods to include exact values for calories, protein, fats, and carbs per 100g.
* **[supabase_setup.sql](file:///c:/Users/jayav/Desktop/nutriapp/NutriPlan-Lite/supabase_setup.sql)**:
  * Prepared the full SQL commands database bootstrap script for contributors/admins.

---

## 🧪 Verification & Testing Performed

1. **Local Sandbox Test**: Open `index.html` locally in a web browser. Verify adding food logs, resetting water levels, and updating profile constraints. All metrics update instantly.
2. **Database Integration**: Link a Supabase project via the Configuration modal. Verify account registration, login verification, and live table data insertions (`profiles`, `food_logs`, `water_logs`).
3. **AI Logging**: Test typing free-text food descriptions in the AI Quick Log input box. Verify automatic parsing, macro estimations, and logging into the correct meal category.
4. **Chat Coach**: Test chatting with coach Aria and verify responses are tailored to demographic parameters.
