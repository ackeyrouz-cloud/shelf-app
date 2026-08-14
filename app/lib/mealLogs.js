import { supabase } from './supabase';

// Local (device) calendar day, not UTC — this is what makes "today's total"
// and history correct regardless of timezone. Never derive a day from a
// timestamptz at query time; always use this at write/read time instead.
export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// macros = { calories, proteinG, carbsG, fatG, fiberG } — the exact
// per-serving values already shown on the recipe, never re-estimated here.
export async function logMeal({ userId, recipeTitle, servings, macros }) {
  return supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      log_date: localDateString(),
      recipe_title: recipeTitle,
      servings_logged: servings,
      calories_per_serving: macros.calories,
      protein_g_per_serving: macros.proteinG,
      carbs_g_per_serving: macros.carbsG,
      fat_g_per_serving: macros.fatG,
      fiber_g_per_serving: macros.fiberG ?? null,
    })
    .select()
    .single();
}

export async function getMealLogsForDate(date) {
  return supabase
    .from('meal_logs')
    .select('*')
    .eq('log_date', localDateString(date))
    .order('logged_at', { ascending: true });
}

export async function updateMealLogServings(id, servings) {
  return supabase
    .from('meal_logs')
    .update({ servings_logged: servings })
    .eq('id', id)
    .select()
    .single();
}

export async function deleteMealLog(id) {
  return supabase.from('meal_logs').delete().eq('id', id);
}
