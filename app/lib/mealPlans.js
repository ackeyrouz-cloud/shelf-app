import { supabase } from './supabase';
import { localDateString, logMeal } from './mealLogs';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'];
export const MEAL_SLOT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function addDays(date, delta) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

// Rolling 7-day window starting today, not a fixed Monday — matches the
// "today, not calendar week" framing Profile's date-nav already uses, and
// avoids "why does my week start mid-plan" the first time someone opens
// this mid-week.
export function weekDates(startDate = new Date()) {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
}

export async function getMealPlansForWeek(startDate = new Date()) {
  const dates = weekDates(startDate).map((d) => localDateString(d));
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .gte('plan_date', dates[0])
    .lte('plan_date', dates[dates.length - 1]);
  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

// recipe = the full recipe object from /find-recipes (title, time,
// difficulty, ingredients, missing, usesFromShelf, steps, calories,
// proteinG, carbsG, fatG, fiberG) — stored whole in recipe_json since
// recipes are never persisted anywhere else; this is the only copy once one
// is assigned to a day.
export async function assignGeneratedRecipe({ userId, planDate, mealSlot, recipe, servings = 1 }) {
  return supabase
    .from('meal_plans')
    .upsert({
      user_id: userId,
      plan_date: localDateString(planDate),
      meal_slot: mealSlot,
      recipe_source: 'generated',
      recipe_title: recipe.title,
      recipe_json: recipe,
      calories_per_serving: recipe.calories ?? null,
      protein_g_per_serving: recipe.proteinG ?? null,
      carbs_g_per_serving: recipe.carbsG ?? null,
      fat_g_per_serving: recipe.fatG ?? null,
      fiber_g_per_serving: recipe.fiberG ?? null,
      servings,
      meal_log_id: null,
    }, { onConflict: 'user_id,plan_date,meal_slot' })
    .select()
    .single();
}

// macros = { calories, proteinG, carbsG, fatG, fiberG } — same shape as the
// existing manual meal-logging form uses. No ingredient list, so this entry
// won't contribute to the consolidated shopping list — see the meal-planning
// plan for why that's the intended scope, not a gap.
export async function assignManualMeal({ userId, planDate, mealSlot, title, macros, servings = 1 }) {
  return supabase
    .from('meal_plans')
    .upsert({
      user_id: userId,
      plan_date: localDateString(planDate),
      meal_slot: mealSlot,
      recipe_source: 'manual',
      recipe_title: title,
      recipe_json: null,
      calories_per_serving: macros?.calories ?? null,
      protein_g_per_serving: macros?.proteinG ?? null,
      carbs_g_per_serving: macros?.carbsG ?? null,
      fat_g_per_serving: macros?.fatG ?? null,
      fiber_g_per_serving: macros?.fiberG ?? null,
      servings,
      meal_log_id: null,
    }, { onConflict: 'user_id,plan_date,meal_slot' })
    .select()
    .single();
}

export async function removePlannedMeal(id) {
  return supabase.from('meal_plans').delete().eq('id', id);
}

// Converts a planned meal into a real logged entry via the exact same
// logMeal() pipeline every other logging method uses (manual entries log as
// source: 'manual', generated recipes log as source: 'recipe' — matching
// what each would have logged as through their own standalone flow), then
// records the resulting log's id back on the plan row so the UI can show
// "Logged" and this can't be double-converted.
export async function logPlannedMeal({ userId, plan }) {
  const { data: logged, error: logError } = await logMeal({
    userId,
    recipeTitle: plan.recipe_title,
    servings: plan.servings,
    macros: {
      calories: plan.calories_per_serving,
      proteinG: plan.protein_g_per_serving,
      carbsG: plan.carbs_g_per_serving,
      fatG: plan.fat_g_per_serving,
      fiberG: plan.fiber_g_per_serving,
    },
    source: plan.recipe_source === 'manual' ? 'manual' : 'recipe',
  });
  if (logError) return { data: null, error: logError };

  const { data: updatedPlan, error: updateError } = await supabase
    .from('meal_plans')
    .update({ meal_log_id: logged.id })
    .eq('id', plan.id)
    .select()
    .single();
  if (updateError) return { data: null, error: updateError };
  return { data: updatedPlan, error: null };
}
