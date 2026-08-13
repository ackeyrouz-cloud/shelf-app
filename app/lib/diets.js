export const DIETS = [
  { v: 'none', label: 'No restriction' },
  { v: 'vegetarian', label: 'Vegetarian' },
  { v: 'vegan', label: 'Vegan' },
  { v: 'pescatarian', label: 'Pescatarian' },
  { v: 'gluten-free', label: 'Gluten-free' },
  { v: 'dairy-free', label: 'Dairy-free' },
  { v: 'nut-free', label: 'Nut-free' },
  { v: 'keto', label: 'Keto' },
  { v: 'low-carb', label: 'Low-carb' },
  { v: 'paleo', label: 'Paleo' },
  { v: 'high-protein', label: 'High-protein' },
  { v: 'halal', label: 'Halal' },
];
// Diets that are logically incompatible — e.g. pescatarian (eats fish) directly
// contradicts vegan/vegetarian (no fish). Not an exhaustive nutrition-logic matrix —
// just the unambiguous cases where two selections can't both be true at once.
export const DIET_CONFLICTS = {
  vegan: ['pescatarian'],
  vegetarian: ['pescatarian'],
  pescatarian: ['vegan', 'vegetarian'],
};
export const dietLabel = (v) => (DIETS.find(d => d.v === v) || {}).label || v;

export const TIMES = [
  { v: 'any', label: 'Any' },
  { v: '15', label: 'Under 15 min' },
  { v: '30', label: 'Under 30 min' },
  { v: '60', label: 'Under 1 hour' },
];
export const SERVINGS = [
  { v: '1', label: '1' },
  { v: '2', label: '2' },
  { v: '4', label: '4' },
  { v: '6+', label: '6+' },
];
