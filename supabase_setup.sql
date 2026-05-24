-- ====================================================================
-- NutriPlan Lite - Supabase Database Schema Setup
-- ====================================================================
-- Execute this script in the Supabase SQL Editor for your project.

-- 1. Create Profiles Table (user demographics & goals)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    age INTEGER NOT NULL DEFAULT 25,
    weight NUMERIC NOT NULL DEFAULT 70,
    height NUMERIC NOT NULL DEFAULT 175,
    gender VARCHAR(10) NOT NULL DEFAULT 'male',
    activity_level NUMERIC NOT NULL DEFAULT 1.2,
    fitness_goal VARCHAR(20) NOT NULL DEFAULT 'maintain', -- 'lose', 'maintain', 'gain'
    macro_split VARCHAR(20) NOT NULL DEFAULT 'balanced', -- 'balanced', 'lowcarb', 'highprotein', 'custom'
    custom_carbs NUMERIC DEFAULT 45,
    custom_protein NUMERIC DEFAULT 25,
    custom_fat NUMERIC DEFAULT 30,
    water_target INTEGER NOT NULL DEFAULT 2500,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Food Logs Table (daily nutrition entries)
CREATE TABLE IF NOT EXISTS public.food_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT current_date,
    meal_type VARCHAR(20) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
    food_name TEXT NOT NULL,
    quantity_grams NUMERIC NOT NULL DEFAULT 100,
    calories INTEGER NOT NULL DEFAULT 0,
    protein NUMERIC NOT NULL DEFAULT 0,
    carbs NUMERIC NOT NULL DEFAULT 0,
    fat NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Water Logs Table (hydration tracking)
CREATE TABLE IF NOT EXISTS public.water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT current_date,
    amount_ml INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies for Profiles
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = user_id);

-- 6. Define RLS Policies for Food Logs
CREATE POLICY "Users can view their own food logs" 
    ON public.food_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food logs" 
    ON public.food_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food logs" 
    ON public.food_logs FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food logs" 
    ON public.food_logs FOR DELETE 
    USING (auth.uid() = user_id);

-- 7. Define RLS Policies for Water Logs
CREATE POLICY "Users can view their own water logs" 
    ON public.water_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water logs" 
    ON public.water_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water logs" 
    ON public.water_logs FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water logs" 
    ON public.water_logs FOR DELETE 
    USING (auth.uid() = user_id);

-- 8. Trigger to Automatically Create Profile Row on User Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, age, weight, height, gender, activity_level, fitness_goal, macro_split, water_target)
  VALUES (new.id, 25, 70, 175, 'male', 1.2, 'maintain', 'balanced', 2500);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
