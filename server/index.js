// Shelf backend — proxies requests to the Anthropic API so your API key
// never has to live inside the app itself.
//
// Deploy this anywhere that runs Node (Render, Railway, Fly.io all have
// free/cheap tiers). Set ANTHROPIC_API_KEY as an environment variable there —
// never commit it to git.

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-5';
// Node/undici's default fetch timeout is 5 minutes with no feedback to the user in that
// window — cap it far below that so a stalled request fails fast with a clear message
// instead of leaving the app looking hung. 45s observed as a safe margin: even a plain,
// unrestricted request took ~21s in testing (the detailed quantity/time/step instructions
// apply to every request, not just diet-restricted ones), so this isn't just headroom for
// worst-case diet prompts.
const ANTHROPIC_TIMEOUT_MS = 45000;

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
Suggest 4 real, cookable recipes, ranked with the recipe needing the FEWEST additional ingredients first. For each recipe assume basic staples (salt, pepper, oil, water) are always available and don't count as "missing".

Every entry in "ingredients" must include a specific quantity and unit (e.g. "2 boneless chicken thighs", "1 cup jasmine rice", "1 tsp ground cumin") — never vague amounts like "some" or "a bit of". Scale every quantity exactly to serve ${serveText} people.

The "time" field must be the realistic TOTAL time for an average home cook — prep (chopping, measuring, marinating start-to-finish where applicable) plus actual cook time, not just active cooking. Be honest, not optimistic: if a recipe genuinely takes 35 minutes, say "35 min" — don't round down to make it look faster. Round to the nearest 5 minutes. Cross-check "time" against your own step count and complexity — a recipe with 8 detailed steps, marinating, or simmering should not be labeled a quick 15-20 minute recipe. Format "time" as a single number of minutes, e.g. "35 min" (no ranges, no "1 hr 10 min" — convert to one total-minutes figure).${timeLimit ? ` Every recipe's "time" MUST be at or under ${timeLimit} minutes — this is a hard constraint, not a suggestion; if a recipe would realistically take longer, either simplify it or don't suggest it.` : ''}

Every entry in "steps" must be exactly one clear action — never combine multiple actions into one sentence. Every step involving actual cooking (boiling, simmering, sautéing, baking, roasting, grilling, frying) must include a specific time range, e.g. "Simmer the rice, covered, for 15-18 minutes" rather than "cook the rice." For any step cooking meat, include both a time estimate AND a doneness cue — visual, tactile, or temperature-based (e.g. "Cook the chicken thighs for 6-7 minutes per side until the internal temperature reaches 165°F" or "until juices run clear and the center is no longer pink"). For staples like rice, pasta, and grains, use the standard accurate cook time for that ingredient (white rice ~15-18 min simmered, dried pasta ~8-11 min boiled). If meat needs to rest after cooking, state how long, e.g. "let rest for 5 minutes before slicing."

Respond ONLY with a JSON array, no other text, in this exact shape:
[
  {
    "title": "Recipe name",
    "time": "20 min",
    "difficulty": "Easy",
    "usesFromShelf": ["ingredient1","ingredient2"],
    "missing": ["ingredient you'd need to buy"],
    "ingredients": ["full ingredient list with quantities, for the whole recipe"],
    "steps": ["step 1", "step 2", "step 3"]
  }
]
"usesFromShelf" must list only items copied from the ingredients I have available above — not staples, not missing items.
If a recipe needs nothing extra, "missing" should be an empty array.`;

    const data = await callClaude([{ role: 'user', content: prompt }], 4096);
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) throw new Error('No text response from model');

    let recipes;
    try {
      recipes = extractJson(textBlock.text);
    } catch (parseErr) {
      recipes = null;
    }
    if (!Array.isArray(recipes)) {
      // Most often caused by a heavily diet-incompatible pantry pushing the model to add
      // explanatory text instead of pure JSON — treat it the same as "no compliant recipes"
      // rather than surfacing an opaque 500.
      console.warn('/find-recipes: model response was not a valid recipe array, returning no recipes. Raw response:', String(textBlock.text).slice(0, 500));
      return res.json({ recipes: [], dietMismatch: dietList.length > 0 });
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

    res.json({ recipes: timedRecipes, dietMismatch });
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

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Shelf backend running on port ${PORT}`));
