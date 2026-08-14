import { supabase } from './supabase';

// base = { caloriesPer100, proteinPer100, carbsPer100, fatPer100, fiberPer100 }
export async function createCustomFood({ userId, name, brand, base, isBeverage }) {
  return supabase
    .from('custom_foods')
    .insert({
      user_id: userId,
      name,
      brand: brand || null,
      calories_per_100: base.caloriesPer100,
      protein_g_per_100: base.proteinPer100,
      carbs_g_per_100: base.carbsPer100,
      fat_g_per_100: base.fatPer100,
      fiber_g_per_100: base.fiberPer100 ?? null,
      is_beverage: !!isBeverage,
    })
    .select()
    .single();
}

export function customFoodToSearchResult(f) {
  return {
    id: `custom:${f.id}`,
    source: 'custom',
    name: f.name,
    brand: f.brand,
    caloriesPer100: f.calories_per_100,
    proteinPer100: f.protein_g_per_100,
    carbsPer100: f.carbs_g_per_100,
    fatPer100: f.fat_g_per_100,
    fiberPer100: f.fiber_g_per_100,
    isBeverage: f.is_beverage,
    namedServings: [],
    customFoodId: f.id,
  };
}

export async function searchCustomFoods(query, limit = 10) {
  const { data, error } = await supabase
    .from('custom_foods')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data.map(customFoodToSearchResult);
}
