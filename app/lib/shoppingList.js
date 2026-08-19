import { supabase, getAuthHeaders } from './supabase';
import { localDateString } from './mealLogs';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';

export async function getShoppingListForWeek(weekStartDate) {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('week_start_date', localDateString(weekStartDate))
    .order('item_name', { ascending: true });
  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

export async function toggleShoppingListItem(id, checked) {
  return supabase.from('shopping_list_items').update({ checked }).eq('id', id);
}

// Consolidates every generated-recipe plan's ingredients for the week into
// one shopping list via /consolidate-shopping-list, cross-referenced
// against the *current* pantry (not each recipe's stale missing-ingredient
// snapshot from whenever it was originally searched). Manual plan entries
// have no ingredient list and don't contribute.
//
// Regenerating replaces the week's rows, but reconciles `checked` state by
// exact item_name match against what's there now — a simple, honest
// limitation: a reworded ingredient string from a fresh Claude call won't
// carry its checkmark over, but an unchanged one will.
export async function generateShoppingList({ userId, weekStartDate, plans, pantry }) {
  const recipes = plans
    .filter((p) => p.recipe_source === 'generated' && p.recipe_json?.ingredients?.length)
    .map((p) => ({ title: p.recipe_title, ingredients: p.recipe_json.ingredients }));

  if (recipes.length === 0) {
    return { data: [], error: null, empty: true };
  }

  let items;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/consolidate-shopping-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ recipes, pantry }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      return { data: [], error: data.timeout ? 'timeout' : data.overloaded ? 'overloaded' : 'error' };
    }
    items = Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    return { data: [], error: e.name === 'AbortError' ? 'timeout' : 'error' };
  } finally {
    clearTimeout(timeoutId);
  }

  const weekStart = localDateString(weekStartDate);

  const { data: existing } = await supabase
    .from('shopping_list_items')
    .select('item_name, checked')
    .eq('week_start_date', weekStart);
  const checkedByName = new Map((existing || []).map((r) => [r.item_name, r.checked]));

  const { error: deleteError } = await supabase.from('shopping_list_items').delete().eq('week_start_date', weekStart);
  if (deleteError) return { data: [], error: 'error' };

  if (items.length === 0) return { data: [], error: null };

  const rows = items.map((item) => ({
    user_id: userId,
    week_start_date: weekStart,
    item_name: item.name,
    item_note: Array.isArray(item.fromRecipes) && item.fromRecipes.length ? `From ${item.fromRecipes.join(', ')}` : null,
    checked: checkedByName.get(item.name) ?? false,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('shopping_list_items')
    .insert(rows)
    .select();
  if (insertError) return { data: [], error: 'error' };
  return { data: inserted, error: null };
}
