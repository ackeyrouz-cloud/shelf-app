import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';

// A single Claude-estimated nutrition pass — see server/index.js's
// /estimate-meal for the "at most one clarifying question, ever" contract.
// mustEstimate: true tells the server this is the follow-up call after a
// clarifying answer, and it must produce a real estimate no matter what.
export async function estimateMeal(description, { mustEstimate = false } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${API_BASE_URL}/estimate-meal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, mustEstimate }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.timeout ? 'timeout' : data.overloaded ? 'overloaded' : 'error' };
    }
    return data; // { needsClarification: true, question } or { needsClarification: false, estimate }
  } catch (e) {
    console.warn('estimateMeal failed:', e.name, e.message);
    return { error: e.name === 'AbortError' ? 'timeout' : 'error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Matches the search-result food shape so it can go through the exact same
// FoodDetailScreen quantity/unit picker and logMeal() path.
export function foodFromEstimate(estimate) {
  return {
    id: `voice:${Date.now()}`,
    source: 'voice',
    name: estimate.name,
    brand: null,
    caloriesPer100: estimate.caloriesPer100,
    proteinPer100: estimate.proteinPer100,
    carbsPer100: estimate.carbsPer100,
    fatPer100: estimate.fatPer100,
    fiberPer100: estimate.fiberPer100,
    isBeverage: !!estimate.isBeverage,
    namedServings: [],
    isEstimated: true,
  };
}

// Photo estimation gets the app-wide image-request timeout (matching
// PantryContext's pickPhoto), longer than the text-only estimate above —
// uploading a photo plus vision analysis is a heavier request than a short
// text prompt. No clarifying-question round trip here; see
// server/index.js's /estimate-meal-photo for why.
export async function estimateMealPhoto(base64, mediaType, caption) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/estimate-meal-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mediaType, caption }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.timeout ? 'timeout' : data.overloaded ? 'overloaded' : 'error' };
    }
    return data; // { canEstimate: true, estimate } or { canEstimate: false }
  } catch (e) {
    console.warn('estimateMealPhoto failed:', e.name, e.message);
    return { error: e.name === 'AbortError' ? 'timeout' : 'error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function foodFromPhotoEstimate(estimate) {
  return {
    id: `photo:${Date.now()}`,
    source: 'photo',
    name: estimate.name,
    brand: null,
    caloriesPer100: estimate.caloriesPer100,
    proteinPer100: estimate.proteinPer100,
    carbsPer100: estimate.carbsPer100,
    fatPer100: estimate.fatPer100,
    fiberPer100: estimate.fiberPer100,
    isBeverage: !!estimate.isBeverage,
    namedServings: [],
    isEstimated: true,
  };
}
