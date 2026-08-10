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
            text: 'List every distinct food item, ingredient, or pantry staple visible in this photo. Respond ONLY with a JSON array of short lowercase strings, nothing else. Example: ["eggs","milk","half an onion"]. If nothing food-related is visible, respond with [].',
          },
        ],
      },
    ]);

    const textBlock = (data.content || []).find((b) => b.type === 'text');
    const items = textBlock ? extractJson(textBlock.text) : [];
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to identify ingredients' });
  }
});

// POST /find-recipes  { pantry: [], diet, time, mood }
app.post('/find-recipes', async (req, res) => {
  try {
    const { pantry, diet, time, mood } = req.body;
    if (!Array.isArray(pantry) || pantry.length === 0) {
      return res.status(400).json({ error: 'Pantry list is required' });
    }

    const dietText = !diet || diet === 'none' ? 'no dietary restriction' : diet;
    const timeText = !time || time === 'any' ? 'no time limit' : `under ${time} minutes`;

    const prompt = `I have these ingredients available: ${pantry.join(', ')}.
Dietary requirement: ${dietText}.
Time constraint: ${timeText}.
${mood ? `Mood/style requested: ${mood}.` : ''}

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
If a recipe needs nothing extra, "missing" should be an empty array.`;

    const data = await callClaude([{ role: 'user', content: prompt }]);
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) throw new Error('No text response from model');
    const recipes = extractJson(textBlock.text);
    res.json({ recipes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate recipes' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Shelf backend running on port ${PORT}`));
