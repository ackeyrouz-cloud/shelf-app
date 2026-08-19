// Body-measurement conversions for the app-wide unit system setting
// (profiles.unit_system). Kept separate from lib/units.js, which is scoped
// to food-serving nutrition units — a different domain (grams of chicken
// vs. a person's height).
//
// Storage is always metric (weight in kg, height in cm) regardless of
// display preference — these helpers only convert at the display/input
// boundary, matching how lib/water.js keeps amount_ml as the stored unit
// and converts for display only.
const KG_PER_LB = 0.453592;
const CM_PER_IN = 2.54;

export function kgToLb(kg) { return kg / KG_PER_LB; }
export function lbToKg(lb) { return lb * KG_PER_LB; }
export function cmToIn(cm) { return cm / CM_PER_IN; }
export function inToCm(inches) { return inches * CM_PER_IN; }
