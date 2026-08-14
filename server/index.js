// Shelf backend — proxies requests to the Anthropic API so your API key
// never has to live inside the app itself.
//
// Deploy this anywhere that runs Node (Render, Railway, Fly.io all have
// free/cheap tiers). Set ANTHROPIC_API_KEY as an environment variable there —
// never commit it to git.

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-5';
// Raised from 4, pulled back from an initial 6 after a real timed test: a
// realistic large pantry (14 items) at 6 recipes measured 94s end-to-end —
// too close to even the raised timeout below to call "reliable," not a
// hypothetical concern. 5 is the actual reliability/variety balance point,
// not a guess.
const RECIPE_COUNT = 5;

// Same project the app itself talks to (app/lib/supabase.js) — URL and anon
// key are not secret, they're already embedded in the client bundle. The
// service role key is the actual secret: it bypasses RLS entirely and can
// delete any user, so it only ever lives here as an env var, never in the app.
const SUPABASE_URL = 'https://ltojyhjzsgqcoswzpsju.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_C8KuPFP_lTrWZUBd-daSsQ_oK4oF1b_';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verifies a caller-supplied access token and reports the real user id it
// belongs to — never trust a client-supplied user id directly.
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Admin-privileged client, only used for account deletion. Null (rather than
// throwing at startup) when the env var isn't set, so the rest of the server
// keeps working and /delete-account fails with a clear message instead of
// crashing the whole process over a feature some deploys may not have configured yet.
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. /delete-account will fail.');
}
// Node/undici's default fetch timeout is 5 minutes with no feedback to the user in that
// window — cap it far below that so a stalled request fails fast with a clear message
// instead of leaving the app looking hung. Raised from 45s to 100s after confirming via
// Render logs that the 45s ceiling itself was the failure — real DOMException[TimeoutError]
// entries from this exact AbortSignal, meaning generation was routinely taking ~45s+ and
// getting killed before it could finish, not a genuinely stuck/hung request. Raised again to
// 130s after a real timed test of a large (14-item) pantry measured 94s end-to-end at
// RECIPE_COUNT=6 — 100s left too little margin to call reliable. That same 94s test also
// completed without Render's own infrastructure cutting the connection first, which is the
// actual evidence this higher ceiling is safe to use, not just a bigger guess.
const ANTHROPIC_TIMEOUT_MS = 130000;

if (!ANTHROPIC_API_KEY) {
  console.warn('WARNING: ANTHROPIC_API_KEY is not set. Requests will fail.');
}

async function callClaude(messages, maxTokens = 1000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Anthropic API error ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// Second-layer, deterministic safety net for the diets where getting it wrong isn't just
// a taste mismatch — it can violate someone's religious or health-critical requirement.
// The prompt is the first layer; this catches cases where the model slips anyway.
const MEAT_FISH_TERMS = ['chicken', 'beef', 'pork', 'bacon', 'ham', 'turkey', 'lamb', 'veal', 'sausage', 'pepperoni', 'salami', 'prosciutto', 'chorizo', 'duck', 'goose', 'venison', 'bison', 'shrimp', 'prawn', 'crab', 'lobster', 'fish', 'salmon', 'tuna', 'anchovy', 'anchovies', 'gelatin', 'lard'];
const DAIRY_EGG_HONEY_TERMS = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'egg', 'eggs', 'honey', 'mayonnaise', 'whey', 'casein', 'ghee'];
const PORK_ALCOHOL_TERMS = ['pork', 'bacon', 'ham', 'prosciutto', 'pancetta', 'lard', 'pepperoni', 'chorizo', 'salami', 'wine', 'beer', 'alcohol', 'rum', 'brandy', 'sherry', 'liqueur', 'vermouth', 'sake'];

const DIET_BLOCKLISTS = {
  halal: PORK_ALCOHOL_TERMS,
  vegetarian: MEAT_FISH_TERMS,
  vegan: [...MEAT_FISH_TERMS, ...DAIRY_EGG_HONEY_TERMS],
};

// Ingredients explicitly flagged as plant-based analogs ("vegan bacon", "veggie sausage")
// are compliant substitutes, not violations — don't flag those.
const QUALIFIER_RE = /\b(vegan|veggie|plant-based|plant based|meatless|non-dairy|dairy-free|dairy free)\b/i;

function findDietViolations(recipe, activeDiets) {
  const blocklists = activeDiets.map((d) => DIET_BLOCKLISTS[d]).filter(Boolean);
  if (!blocklists.length) return [];

  const terms = [...new Set(blocklists.flat())];
  const strings = [
    ...(recipe.ingredients || []),
    ...(recipe.missing || []),
    ...(recipe.usesFromShelf || []),
  ];

  const violations = [];
  strings.forEach((raw) => {
    const s = String(raw);
    if (QUALIFIER_RE.test(s)) return;
    terms.forEach((term) => {
      if (new RegExp(`\\b${term}\\b`, 'i').test(s)) violations.push(`${term} (in "${s}")`);
    });
  });
  return [...new Set(violations)];
}

// The model occasionally omits or malforms a macro field (string, negative,
// NaN) even when instructed not to. Rather than reject an otherwise-good
// recipe over that, strip just the bad field so the client's "only render if
// present" check (recipe.calories != null) quietly hides that one badge.
//
// fiberG allows exactly 0 — a real, common value (plenty of recipes, e.g.
// anything meat/egg/dairy-only, genuinely have ~0g fiber) — while the other
// four stay strictly positive-only, since a recipe with 0 calories or 0g of
// every macro is a model error, not a legitimate value. Confirmed live: this
// exact `n <= 0` check was silently deleting valid `fiberG: 0` results,
// which is why fiber appeared to be missing far more often than the other
// macros — not a truncation issue and not a frontend rendering bug.
function sanitizeMacros(recipe) {
  const clean = { ...recipe };
  for (const field of ['calories', 'proteinG', 'carbsG', 'fatG', 'fiberG']) {
    const n = Number(clean[field]);
    const min = field === 'fiberG' ? 0 : 0.0001;
    if (!Number.isFinite(n) || n < min) delete clean[field];
    else clean[field] = n;
  }
  return clean;
}

// Parses "35 min", "1 hr 10 min", "45-50 min" (range → takes the upper bound), etc.
// Returns null if nothing numeric is found — treated as "can't verify" downstream, not a violation.
function parseTimeToMinutes(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();
  let minutes = 0;
  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/);
  if (hourMatch) minutes += parseFloat(hourMatch[1]) * 60;

  const rangeMatch = s.match(/(\d+)\s*[-–]\s*(\d+)\s*min/);
  if (rangeMatch) {
    minutes += Math.max(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
  } else {
    const minMatch = s.match(/(\d+)\s*min/);
    if (minMatch) minutes += parseInt(minMatch[1], 10);
    else if (!hourMatch) {
      const anyNum = s.match(/\d+/);
      if (anyNum) minutes += parseInt(anyNum[0], 10);
    }
  }
  return minutes > 0 ? minutes : null;
}

// POST /identify-ingredients  { base64, mediaType }
app.post('/identify-ingredients', async (req, res) => {
  try {
    const { base64, mediaType } = req.body;
    if (!base64) return res.status(400).json({ error: 'Missing image data' });

    const data = await callClaude([
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: base64 } },
          {
            type: 'text',
            text: `Look at this photo and identify food items, ingredients, or pantry staples — but only ones you can see clearly and confidently. Skip anything blurry, partially hidden, out of focus, or that you're genuinely unsure about; it's better to miss an item than guess wrong. Where a quantity is visibly countable or estimable, include it in the item text (e.g. "2 eggs", "half an onion", "a few carrots") — otherwise just the item name.

Respond ONLY with JSON in this exact shape, nothing else:
{"items": ["2 eggs","half an onion"], "notFood": false}

If the photo doesn't show food or pantry items at all, respond with:
{"items": [], "notFood": true}`,
          },
        ],
      },
    ], 500);

    const textBlock = (data.content || []).find((b) => b.type === 'text');
    let parsed;
    try {
      parsed = textBlock ? extractJson(textBlock.text) : { items: [], notFood: false };
    } catch (parseErr) {
      console.warn('/identify-ingredients: model response was not valid JSON, returning no items. Raw response:', String(textBlock && textBlock.text).slice(0, 500));
      parsed = { items: [], notFood: false };
    }
    const items = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
    res.json({ items, notFood: !!parsed.notFood });
  } catch (err) {
    console.error(err);
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Request timed out', timeout: true });
    }
    if (err.status === 529 || err.status === 503) {
      return res.status(503).json({ error: 'Service overloaded', overloaded: true });
    }
    res.status(500).json({ error: 'Failed to identify ingredients' });
  }
});

// POST /find-recipes  { pantry: [], diets: [], time, mood, servings }
app.post('/find-recipes', async (req, res) => {
  try {
    const { pantry, diets, time, mood, servings } = req.body;
    if (!Array.isArray(pantry) || pantry.length === 0) {
      return res.status(400).json({ error: 'Pantry list is required' });
    }

    const dietList = (Array.isArray(diets) ? diets : []).filter(d => d && d !== 'none');
    const dietText = dietList.length ? `must satisfy ALL of the following — ${dietList.join(', ')}` : 'no restriction';
    const timeLimit = time && time !== 'any' ? parseInt(time, 10) : null;
    const timeText = timeLimit ? `under ${timeLimit} minutes` : 'no time limit';
    const serveText = servings === '6+' ? '6 or more' : (servings || '2');
    const dietCritical = dietList.length
      ? `\nCRITICAL: the diets listed above are non-negotiable dietary and religious restrictions. Under no circumstances suggest a recipe containing any ingredient that violates ANY selected diet, even if that ingredient is in the user's pantry. If an ingredient like pork, alcohol, or shellfish conflicts with a selected diet (e.g. Halal, vegetarian, vegan), you must exclude it entirely from every suggested recipe — do not list it in "ingredients", "usesFromShelf", or "missing", and do not suggest it as something to pick up either. When in doubt about whether an ingredient is compliant, leave it out.\n`
      : '';

    const prompt = `I have these ingredients available: ${pantry.join(', ')}.
Dietary requirements: ${dietText}.
Time constraint: ${timeText}.
Servings needed: ${serveText} people.
${mood ? `Mood/style requested: ${mood}.` : ''}
${dietCritical}
Suggest ${RECIPE_COUNT} real, cookable recipes, ranked with the recipe needing the FEWEST additional ingredients first. For each recipe assume basic staples (salt, pepper, oil, water) are always available and don't count as "missing".

Make the ${RECIPE_COUNT} recipes genuinely diverse from each other, not variations on the same dish — vary cuisine style, cooking method, and which pantry ingredient takes the lead role wherever the pantry actually supports it. Do not suggest near-duplicates of each other (e.g. four different techniques for the same scrambled eggs) unless the pantry is small enough that it genuinely only supports one type of dish — in that case, prioritize being realistic over forcing artificial variety.

Every entry in "ingredients" must include a specific quantity and unit (e.g. "2 boneless chicken thighs", "1 cup jasmine rice", "1 tsp ground cumin") — never vague amounts like "some" or "a bit of". Scale every quantity exactly to serve ${serveText} people.

The "time" field must be the realistic TOTAL time for an average home cook — prep (chopping, measuring, marinating start-to-finish where applicable) plus actual cook time, not just active cooking. Be honest, not optimistic: if a recipe genuinely takes 35 minutes, say "35 min" — don't round down to make it look faster. Round to the nearest 5 minutes. Cross-check "time" against your own step count and complexity — a recipe with 8 detailed steps, marinating, or simmering should not be labeled a quick 15-20 minute recipe. Format "time" as a single number of minutes, e.g. "35 min" (no ranges, no "1 hr 10 min" — convert to one total-minutes figure).${timeLimit ? ` Every recipe's "time" MUST be at or under ${timeLimit} minutes — this is a hard constraint, not a suggestion; if a recipe would realistically take longer, either simplify it or don't suggest it.` : ''}

Every entry in "steps" must be exactly one clear action — never combine multiple actions into one sentence. Every step involving actual cooking (boiling, simmering, sautéing, baking, roasting, grilling, frying) must include a specific time range, e.g. "Simmer the rice, covered, for 15-18 minutes" rather than "cook the rice." For any step cooking meat, include both a time estimate AND a doneness cue — visual, tactile, or temperature-based (e.g. "Cook the chicken thighs for 6-7 minutes per side until the internal temperature reaches 165°F" or "until juices run clear and the center is no longer pink"). For staples like rice, pasta, and grains, use the standard accurate cook time for that ingredient (white rice ~15-18 min simmered, dried pasta ~8-11 min boiled). If meat needs to rest after cooking, state how long, e.g. "let rest for 5 minutes before slicing."

For each recipe, calculate nutrition PER SERVING (i.e. for one of the ${serveText} servings, not the whole recipe) using a real ingredient-by-ingredient method — never shortcut straight to a guessed total:
1. For every entry in "ingredients", recall its standard nutrition profile (USDA FoodData Central-style values per 100g or per common household unit) and compute that ingredient's calorie/protein/carb/fat/fiber contribution based on the EXACT quantity used in this recipe.
2. Add up every ingredient's contribution, then divide by ${serveText} to get the per-serving total. Actually perform this sum — do not skip to an estimated final number.
3. Cross-check the result against the Atwater factors: calories should land within about 10% of (protein × 4) + (carbs × 4) + (fat × 9). Fiber is a subset of the carb grams already counted, not additional calories on top.
4. These are careful, ingredient-grounded estimates, not lab-verified values — accuracy matters, but don't present false precision either.

Respond ONLY with a single-line, compact JSON array — no line breaks or indentation inside the JSON itself, every extra whitespace character is response budget you need for ${RECIPE_COUNT} complete recipes. No other text. Exact shape (shown indented below only for readability — your actual response must be compact):
[
  {
    "title": "Recipe name",
    "time": "20 min",
    "difficulty": "Easy",
    "usesFromShelf": ["ingredient1","ingredient2"],
    "missing": ["ingredient you'd need to buy"],
    "ingredients": ["full ingredient list with quantities, for the whole recipe"],
    "steps": ["step 1", "step 2", "step 3"],
    "calories": 520,
    "proteinG": 38,
    "carbsG": 46,
    "fatG": 18,
    "fiberG": 6
  }
]
"usesFromShelf" must list only items copied from the ingredients I have available above — not staples, not missing items.
If a recipe needs nothing extra, "missing" should be an empty array.
"calories", "proteinG", "carbsG", "fatG", and "fiberG" are per serving and must be positive numbers, not strings or ranges.`;

    // Raised from 4096 -> 8192 -> 12288: a large/verbose pantry (e.g. long
    // descriptive item names from the photo-scan flow) plus the 5 macro
    // fields per recipe pushed 4-recipe responses past the old ceiling often
    // enough to be a real bug, not an edge case — confirmed via Render logs
    // showing responses that were valid JSON as far as they went, then just
    // stopped. Left at 12288 even after RECIPE_COUNT dropped 6->5: this is a
    // ceiling, not a target — extra headroom against truncation costs
    // nothing unless the model actually needs it.
    const data = await callClaude([{ role: 'user', content: prompt }], 12288);
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) throw new Error('No text response from model');
    const truncated = data.stop_reason === 'max_tokens';

    let recipes;
    try {
      recipes = extractJson(textBlock.text);
    } catch (parseErr) {
      recipes = null;
    }
    if (!Array.isArray(recipes)) {
      if (truncated) {
        console.warn(`/find-recipes: response truncated at max_tokens (pantry size: ${pantry.length}), returning no recipes.`);
      } else {
        // Most often caused by a heavily diet-incompatible pantry pushing the model to add
        // explanatory text instead of pure JSON — treat it the same as "no compliant recipes"
        // rather than surfacing an opaque 500.
        console.warn('/find-recipes: model response was not a valid recipe array, returning no recipes. Raw response:', String(textBlock.text).slice(0, 500));
      }
      // dietMismatch only when diets were actually active; otherwise this was
      // a generation failure (truncation or a malformed response), which the
      // client shows a distinct, accurate message for via generationFailed —
      // "no recipes matched your filters" is simply false when no filters
      // were even active.
      return res.json({ recipes: [], dietMismatch: dietList.length > 0, generationFailed: dietList.length === 0 });
    }

    const activeDiets = dietList.filter((d) => DIET_BLOCKLISTS[d]);
    let safeRecipes = recipes;
    let dietMismatch = false;
    if (activeDiets.length) {
      safeRecipes = recipes.filter((r) => findDietViolations(r, activeDiets).length === 0);
      const dropped = recipes.length - safeRecipes.length;
      if (dropped > 0) {
        console.warn(`/find-recipes: filtered ${dropped} recipe(s) for violating ${activeDiets.join(', ')}`);
      }
      // Every generated recipe violated the diet(s) — not a bug, the pantry just doesn't
      // have enough compliant ingredients to work with.
      if (recipes.length > 0 && safeRecipes.length === 0) {
        dietMismatch = true;
      }
    }

    let timedRecipes = safeRecipes;
    if (timeLimit) {
      timedRecipes = safeRecipes.filter((r) => {
        const mins = parseTimeToMinutes(r.time);
        return mins === null || mins <= timeLimit;
      });
      const droppedForTime = safeRecipes.length - timedRecipes.length;
      if (droppedForTime > 0) {
        console.warn(`/find-recipes: filtered ${droppedForTime} recipe(s) exceeding the ${timeLimit}-minute limit`);
      }
    }

    // If every surviving recipe completely ignores the pantry (no usesFromShelf items at
    // all), that's functionally the same failure as a diet mismatch — the model gave up
    // trying to work with what's actually available and just generated generic recipes.
    // Recipes using at least one pantry ingredient are left untouched and shown normally.
    if (!dietMismatch && dietList.length > 0 && timedRecipes.length > 0) {
      const allIgnorePantry = timedRecipes.every((r) => !(r.usesFromShelf || []).length);
      if (allIgnorePantry) {
        console.warn('/find-recipes: every recipe ignored the pantry (empty usesFromShelf), treating as diet mismatch');
        dietMismatch = true;
        timedRecipes = [];
      }
    }

    res.json({ recipes: timedRecipes.map(sanitizeMacros), dietMismatch });
  } catch (err) {
    console.error(err);
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Request timed out', timeout: true });
    }
    if (err.status === 529 || err.status === 503) {
      return res.status(503).json({ error: 'Service overloaded', overloaded: true });
    }
    res.status(500).json({ error: 'Failed to generate recipes' });
  }
});

// POST /delete-account  Authorization: Bearer <supabase access token>
// Deleting the auth.users row cascades to profiles, pantry_items, and
// meal_logs automatically — all three have `on delete cascade` foreign keys
// to auth.users(id), so nothing else needs deleting explicitly here.
app.post('/delete-account', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing access token' });

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !user) return res.status(401).json({ error: 'Invalid or expired session' });

    if (!supabaseAdmin) {
      console.error('/delete-account: SUPABASE_SERVICE_ROLE_KEY is not configured');
      return res.status(500).json({ error: 'Account deletion is not configured on the server' });
    }

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error('/delete-account: deleteUser failed', deleteErr);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Shelf backend running on port ${PORT}`));
