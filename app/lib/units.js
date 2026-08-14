// Unit conversion + nutrition scaling for food search.
//
// Every database's nutrition data (Open Food Facts, USDA FDC) is normalized
// per-100g for solids and per-100ml for liquids — this module treats "grams"
// and "ml" as numerically interchangeable (1ml ≈ 1g), which is the standard
// nutrition-label convention for beverages and accurate enough for the vast
// majority of drinks (mostly water by mass). It is a real simplification,
// not exact for dense/syrupy liquids, but it's the same assumption the
// underlying databases themselves are built on.
export const UNITS = {
  g: { label: 'g', toGrams: 1, kind: 'weight' },
  oz: { label: 'oz', toGrams: 28.3495, kind: 'weight' },
  lb: { label: 'lb', toGrams: 453.592, kind: 'weight' },
  kg: { label: 'kg', toGrams: 1000, kind: 'weight' },
  ml: { label: 'ml', toGrams: 1, kind: 'volume' },
  l: { label: 'L', toGrams: 1000, kind: 'volume' },
  flOz: { label: 'fl oz', toGrams: 29.5735, kind: 'volume' },
  cup: { label: 'cup', toGrams: 240, kind: 'volume' }, // US nutrition-label cup
};

export const STANDARD_UNIT_ORDER = ['g', 'oz', 'lb', 'kg', 'ml', 'l', 'flOz', 'cup'];

export function defaultUnitFor(isBeverage) {
  return isBeverage ? 'ml' : 'g';
}

// grams here means "grams-equivalent" per the module comment above.
export function toGramsEquivalent(quantity, unitKey) {
  const unit = UNITS[unitKey];
  if (!unit || !Number.isFinite(quantity)) return null;
  return quantity * unit.toGrams;
}

// base = { caloriesPer100, proteinPer100, carbsPer100, fatPer100, fiberPer100 }
export function scaleNutrition(base, quantity, unitKey) {
  const grams = toGramsEquivalent(quantity, unitKey);
  if (grams == null) return null;
  const factor = grams / 100;
  return {
    calories: base.caloriesPer100 * factor,
    proteinG: base.proteinPer100 * factor,
    carbsG: base.carbsPer100 * factor,
    fatG: base.fatPer100 * factor,
    fiberG: base.fiberPer100 != null ? base.fiberPer100 * factor : null,
    grams,
  };
}

// Best-effort parse of a free-text serving_size string (e.g. "1 bar (40 g)",
// "1 cup (240ml)", "170.0g") into a named-serving shortcut. Returns null on
// anything without a clear number+unit — a missing shortcut just falls back
// to the standard unit list, never a fabricated one.
export function parseServingSize(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml)\b/i);
  if (!match) return null;
  const amount = parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  const grams = unit === 'kg' || unit === 'l' ? amount * 1000 : amount;
  return { label: raw.trim(), grams };
}

// Fetched lazily, only once a user taps a specific Open Food Facts result —
// not during live search — since this field isn't reliably present in the
// fast search-a-licious results but the classic per-product endpoint is
// stable and gives real serving_size data when Open Food Facts has it.
export async function fetchOffNamedServing(code) {
  if (!code) return null;
  // Manual AbortController + setTimeout, not AbortSignal.timeout() — React
  // Native's AbortSignal polyfill (the `abort-controller` npm package)
  // doesn't implement that static method and throws synchronously if called,
  // regardless of actual connectivity. See lookupOffBarcode in offLookup.js
  // for the same fix, found via a real reproduction of this exact failure.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=serving_size`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseServingSize(data?.product?.serving_size);
  } catch (e) {
    console.warn('fetchOffNamedServing failed:', e.name, e.message);
    return null; // best-effort — a failed lookup just means no named-serving shortcut, not a broken screen
  } finally {
    clearTimeout(timeoutId);
  }
}
