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
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
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
    const parsed = textBlock ? extractJson(textBlock.text) : { items: [], notFood: false };
    const items = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
    res.json({ items, notFood: !!parsed.notFood });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to identify ingredients' });
  }
});

// POST /find-recipes  { pantry: [], diets: [], time, mood }
app.post('/find-recipes', async (req, res) => {
  try {
    const { pantry, diets, time, mood } = req.body;
    if (!Array.isArray(pantry) || pantry.length === 0) {
      return res.status(400).json({ error: 'Pantry list is required' });
    }

    const dietList = (Array.isArray(diets) ? diets : []).filter(d => d && d !== 'none');
    const dietText = dietList.length ? `must satisfy ALL of the following — ${dietList.join(', ')}` : 'no restriction';
    const timeText = !time || time === 'any' ? 'no time limit' : `under ${time} minutes`;
    const dietCritical = dietList.length
      ? `\nCRITICAL: the diets listed above are non-negotiable dietary and religious restrictions. Under no circumstances suggest a recipe containing any ingredient that violates ANY selected diet, even if that ingredient is in the user's pantry. If an ingredient like pork, alcohol, or shellfish conflicts with a selected diet (e.g. Halal, vegetarian, vegan), you must exclude it entirely from every suggested recipe — do not list it in "ingredients", "usesFromShelf", or "missing", and do not suggest it as something to pick up either. When in doubt about whether an ingredient is compliant, leave it out.\n`
      : '';

    const prompt = `I have these ingredients available: ${pantry.join(', ')}.
Dietary requirements: ${dietText}.
Time constraint: ${timeText}.
${mood ? `Mood/style requested: ${mood}.` : ''}
${dietCritical}
Suggest 4 real, cookable recipes, ranked with the recipe needing the FEWEST additional ingredients first. For each recipe assume basic staples (salt, pepper, oil, water) are always available and don't count as "missing".

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
    const recipes = extractJson(textBlock.text);

    const activeDiets = dietList.filter((d) => DIET_BLOCKLISTS[d]);
    let safeRecipes = recipes;
    if (activeDiets.length) {
      safeRecipes = recipes.filter((r) => findDietViolations(r, activeDiets).length === 0);
      const dropped = recipes.length - safeRecipes.length;
      if (dropped > 0) {
        console.warn(`/find-recipes: filtered ${dropped} recipe(s) for violating ${activeDiets.join(', ')}`);
      }
    }

    res.json({ recipes: safeRecipes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate recipes' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Shelf backend running on port ${PORT}`));
