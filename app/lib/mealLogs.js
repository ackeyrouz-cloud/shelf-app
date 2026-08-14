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

// macros = { calories, proteinG, carbsG, fatG, fiberG } — for recipe logs,
// the exact per-serving values already shown on the recipe, never
// re-estimated here. For manual entries, the values the user typed for
// this one entry, with servings pinned at 1 (see LogMealScreen).
//
// base/quantity/quantityUnit/offCode/usdaId/customFoodId are only set for
// search- and custom-food-sourced logs — that's what lets a "recent" entry
// be reopened and rescaled to a new quantity later (see foodFromRecentLog in
// lib/foodSearch.js). Recipe and manual logs leave these null: there's no
// per-100 base to rescale from, so "log again" just repeats the same values.
export async function logMeal({
  userId, recipeTitle, servings, macros, source = 'recipe',
  base, quantity, quantityUnit, offCode, usdaId, customFoodId, isEstimated = false,
}) {
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
      source,
      base_calories_per_100: base?.caloriesPer100 ?? null,
      base_protein_g_per_100: base?.proteinPer100 ?? null,
      base_carbs_g_per_100: base?.carbsPer100 ?? null,
      base_fat_g_per_100: base?.fatPer100 ?? null,
      base_fiber_g_per_100: base?.fiberPer100 ?? null,
      quantity: quantity ?? null,
      quantity_unit: quantityUnit ?? null,
      off_code: offCode ?? null,
      usda_id: usdaId ?? null,
      custom_food_id: customFoodId ?? null,
      is_estimated: isEstimated,
    })
    .select()
    .single();
}

// Recent, deduplicated-by-name, non-recipe logs — the "before you even type
// anything" quick-log list. This is recency-ranked, not frequency-ranked:
// true frequency (most-often-logged, not just most-recently-logged) would
// need a grouped aggregate query, which isn't built here. In practice the
// two mostly overlap (what you eat often, you also tend to have logged
// recently), so this covers the common case without that added complexity.
export async function getRecentFoods(limit = 8) {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .neq('source', 'recipe')
    .order('logged_at', { ascending: false })
    .limit(40);
  if (error) return { data: [], error };

  const seen = new Set();
  const deduped = [];
  for (const log of data) {
    const key = log.recipe_title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(log);
    if (deduped.length >= limit) break;
  }
  return { data: deduped, error: null };
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
