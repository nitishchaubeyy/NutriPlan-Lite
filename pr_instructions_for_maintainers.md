# Pull Request: Supabase Database Sync & AI Integrations
## Developer Integration & Setup Instructions

Dear Maintainers/Kernel Team,

This pull request implements multi-user persistence, profile goal customization, daily calendar history tracking, and AI-powered quick logging tools for **NutriPlan Lite**.

To integrate and test these features, please follow the guidelines below.

---

## 📂 Summary of Included Files

1. **`index.html`**: Redesigned UI with premium glassmorphism layouts, calendars, authentication sliders, configuration modals, and Chart.js graphics.
2. **`style.css`**: Added glassmorphism styling, fine-bordered inputs, scrollbars, and keyframes. Includes fixes for select dropdowns in Windows browsers.
3. **`script.js`**: Core controller containing Supabase API hooks, local storage fallback demo mode, calendar navigators, Chart.js updates, and Gemini API bindings.
4. **`foodDB.json`**: Extended database containing macros (protein, carbs, fat, calories per 100g) for 43+ food items.
5. **`supabase_setup.sql`**: Schema script containing table creation queries, row-level security (RLS) rules, and triggers.

---

## 🛠️ Step 1: Database Setup (PostgreSQL)

The application communicates directly with Supabase. To initialize the tables on your database instance:

1. Open your **Supabase Dashboard** and go to **SQL Editor**.
2. Open the file **`supabase_setup.sql`** in this PR and copy its contents.
3. Paste the script into the SQL editor and click **Run**.
4. This script will automatically create:
   * **`public.profiles`**: Demographics (age, height, weight, activity multiplier, calorie offsets, macro splits, and water targets).
   * **`public.food_logs`**: Everyday eating records categorized by meal types (`breakfast`, `lunch`, `dinner`, `snack`).
   * **`public.water_logs`**: Hydration tracking history.
   * **Row Level Security (RLS) Policies**: Filters queries to ensure users can only access their own profiles and log lists (`auth.uid() = user_id`).
   * **Trigger Function (`handle_new_user`)**: Listens to user signs-up on `auth.users` and automatically instantiates a default profile row to prevent null query exceptions.

---

## 🔑 Step 2: Configuration & Testing Credentials

We have designed a client-side settings manager to make review easy without needing to modify source code:

1. Launch `index.html` locally in a web browser.
2. The page loads in **Local Demo Mode** (signaled by a warning badge in the header) and uses `localStorage` for all logs. This lets you inspect the interface immediately.
3. To test Supabase sync:
   * Click the **Settings Cog** in the top right.
   * Enter your **Supabase URL** and **Anon Key**.
   * Enter a **Gemini API Key** to enable AI features.
   * Click **Save & Reload**.
4. The header will now show a **Sign In / Sign Up** modal trigger.
5. Register a test user. The trigger will create their default profile row. Log food and water to verify items are successfully saved to your database tables.

---

## 🧪 Verification & Acceptance Criteria Checklist

### 1. Account Lifecycle
- [ ] User can register a new account.
- [ ] User can log in.
- [ ] User profile defaults are successfully populated.
- [ ] Logging out resets the app state.

### 2. Demographics & Goals
- [ ] Changing age, height, weight, gender, or activity multipliers updates the daily target calories correctly.
- [ ] Selecting different fitness goals (Weight Loss, Maintain, Gain Muscle) adds deficit/surplus offsets.
- [ ] Changing macro splits (Low Carb, High Protein, Custom) changes the grams indicators.
- [ ] Custom macro percentages validation works (rejects totals !== 100%).

### 3. Food & Water Loggers
- [ ] Autocomplete works using `foodDB.json`.
- [ ] Logs are grouped correctly in Breakfast, Lunch, Dinner, and Snacks.
- [ ] Users can edit weights or delete items.
- [ ] Adding water updates the visual glass filling indicator.
- [ ] Selected date picker changes reload the historical logs for that specific day.

### 4. AI Assistants (Requires Gemini Key)
- [ ] Typing natural language (e.g. *"I had two eggs and 100g of rice for lunch"*) parses food names, estimates weights, assigns the correct meal type, and logs it.
- [ ] Chatting with Coach Aria replies with personalized recommendations based on today's logged food entries.
