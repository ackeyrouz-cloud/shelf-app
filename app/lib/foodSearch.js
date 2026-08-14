import { API_BASE_URL } from './config';
import { searchCustomFoods } from './customFoods';

// Custom foods (the user's own) and the database fan-out (Open Food Facts +
// USDA, merged server-side) are fetched in parallel and combined, with
// custom foods first — they're the user's own curated/reused items, and
// listing them ahead of general database results makes that distinction
// legible at a glance (see FoodSearchScreen's "Your foods" section).
export async function searchFoods(query, { signal } = {}) {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], custom: [], sources: {} };

  const [dbResult, customResult] = await Promise.allSettled([
    fetch(`${API_BASE_URL}/food-search?q=${encodeURIComponent(trimmed)}`, { signal }).then((r) => r.json()),
    searchCustomFoods(trimmed),
  ]);

  // Distinct from either upstream source individually failing (handled by
  // the backend's per-source `sources` flags) — this is the whole request
  // having been superseded by a newer keystroke. Let the caller's existing
  // AbortError handling (matching the pattern already used for recipe
  // search and pantry photo scan) discard this response rather than render
  // a stale one.
  if (signal?.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }

  const dbResults = dbResult.status === 'fulfilled' ? (dbResult.value.results || []) : [];
  const sources = dbResult.status === 'fulfilled'
    ? dbResult.value.sources
    : { off: 'error', usda: 'error' };
  const customFoods = customResult.status === 'fulfilled' ? customResult.value : [];

  return { results: [...customFoods, ...dbResults], sources };
}

// Reconstructs a search-result-shaped food from a "recent" meal_logs row, so
// the same FoodDetailScreen (quantity/unit picker) can reopen it. Returns
// null when the log has no per-100 base (recipe/manual logs) — those aren't
// rescalable, so the caller should offer "log again with the same values"
// instead rather than a quantity picker with nothing to scale from.
export function foodFromRecentLog(log) {
  if (log.base_calories_per_100 == null) return null;
  const source = log.custom_food_id ? 'custom' : log.off_code ? 'off' : log.usda_id ? 'usda' : 'voice';
  return {
    id: `log:${log.id}`,
    source,
    name: log.recipe_title,
    brand: null,
    caloriesPer100: log.base_calories_per_100,
    proteinPer100: log.base_protein_g_per_100,
    carbsPer100: log.base_carbs_g_per_100,
    fatPer100: log.base_fat_g_per_100,
    fiberPer100: log.base_fiber_g_per_100,
    isBeverage: ['ml', 'l', 'flOz', 'cup'].includes(log.quantity_unit),
    namedServings: [],
    offCode: log.off_code,
    usdaId: log.usda_id,
    customFoodId: log.custom_food_id,
    isEstimated: !!log.is_estimated,
    defaultQuantity: log.quantity,
    defaultUnit: log.quantity_unit,
  };
}
