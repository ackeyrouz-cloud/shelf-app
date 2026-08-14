import { parseServingSize } from './units';

// Same reasoning as fetchOffNamedServing in units.js: no API key needed, so
// this calls Open Food Facts directly rather than round-tripping through
// the backend. Barcode lookups use the stable per-product endpoint (the
// same one already proven reliable for named-serving lookups), not the
// live-search endpoint.

// Mirrors the beverage-tag matching in server/index.js's offIsBeverage —
// duplicated rather than shared, since app/ and server/ are separately
// deployed and don't share a package. Open Food Facts' top-level umbrella
// tag "en:plant-based-foods-and-beverages" would false-positive a plain
// banana as a drink under a naive substring match, so this matches only
// the real "en:beverages" branch plus a fixed set of specific drink leaf
// categories, confirmed against real products during the search feature build.
const OFF_BEVERAGE_TAGS = new Set([
  'en:sodas', 'en:juices', 'en:waters', 'en:colas', 'en:carbonated-drinks',
  'en:teas', 'en:coffees', 'en:alcoholic-beverages', 'en:beers', 'en:wines',
  'en:smoothies', 'en:energy-drinks', 'en:plant-milks', 'en:milks',
  'en:fruit-juices', 'en:vegetable-juices', 'en:hot-beverages', 'en:cold-beverages',
]);

function offIsBeverage(categoriesTags) {
  if (!Array.isArray(categoriesTags)) return false;
  return categoriesTags.some((t) => {
    const tag = String(t);
    return tag.startsWith('en:beverages') || OFF_BEVERAGE_TAGS.has(tag);
  });
}

// The detail endpoint's `brands` field is a plain string (e.g. "Chobani" or
// "Chobani, Zero Sugar"), not an array like the search endpoint returns —
// confirmed by testing a real product before writing this, not assumed.
function normalizeBrand(brands) {
  if (!brands) return null;
  const parts = String(brands).split(',').map((b) => b.trim()).filter(Boolean);
  return parts.length ? [...new Set(parts)].join(', ') : null;
}

function normalizeOffProduct(product, code) {
  const n = product.nutriments || {};
  const calories = Number(n['energy-kcal_100g']);
  if (!Number.isFinite(calories)) return null; // no usable nutrition data

  const namedServing = parseServingSize(product.serving_size);

  return {
    id: `off:${code}`,
    source: 'off',
    offCode: code,
    name: product.product_name || 'Unnamed product',
    brand: normalizeBrand(product.brands),
    caloriesPer100: calories,
    proteinPer100: Number.isFinite(Number(n.proteins_100g)) ? Number(n.proteins_100g) : 0,
    carbsPer100: Number.isFinite(Number(n.carbohydrates_100g)) ? Number(n.carbohydrates_100g) : 0,
    fatPer100: Number.isFinite(Number(n.fat_100g)) ? Number(n.fat_100g) : 0,
    fiberPer100: Number.isFinite(Number(n.fiber_100g)) ? Number(n.fiber_100g) : null,
    isBeverage: offIsBeverage(product.categories_tags),
    namedServings: namedServing ? [namedServing] : [],
  };
}

// Returns { food } on success, { notFound: true } for a barcode Open Food
// Facts doesn't recognize, or { error: true } for a network/lookup failure
// — kept distinct so the scanner screen can show an accurate message
// ("not in the database" vs. "something went wrong, try again") instead of
// one generic failure state.
export async function lookupOffBarcode(code) {
  // React Native's global AbortSignal is polyfilled via the `abort-controller`
  // npm package, which predates the AbortSignal.timeout() static method and
  // doesn't implement it — calling it throws a synchronous TypeError on every
  // request, unrelated to actual connectivity. Use the manual
  // AbortController + setTimeout pattern already used elsewhere in this app
  // (RecipesScreen, PantryContext) instead.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_size,categories_tags,code`,
      { signal: controller.signal },
    );
    if (!res.ok) {
      console.warn('lookupOffBarcode: non-OK response', res.status);
      return { error: true };
    }
    const data = await res.json();
    if (data.status !== 1 || !data.product) return { notFound: true };
    const food = normalizeOffProduct(data.product, code);
    if (!food) return { notFound: true }; // recognized barcode, but no usable nutrition data
    return { food };
  } catch (e) {
    console.warn('lookupOffBarcode failed:', e.name, e.message);
    return { error: true };
  } finally {
    clearTimeout(timeoutId);
  }
}
