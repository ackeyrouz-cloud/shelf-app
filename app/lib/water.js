import { supabase } from './supabase';
import { UNITS } from './units';
import { localDateString } from './mealLogs';

// Storage is always ml — display unit is auto-detected once from the
// device's region via the built-in Hermes Intl API (no new native
// dependency). US region gets fl oz/cups; everywhere else gets ml/L. This
// isn't tied to a manual toggle since the app doesn't have a general
// unit-system setting yet — if one gets built later, this is the one place
// that would need to start reading it instead.
export function getWaterUnitSystem() {
  try {
    const locale = Intl.NumberFormat().resolvedOptions().locale; // e.g. "en-US"
    const region = locale.split('-')[1];
    return region === 'US' ? 'imperial' : 'metric';
  } catch (e) {
    return 'metric';
  }
}

// Fluid ounces (UNITS.flOz), not the weight ounce (UNITS.oz) — water is a
// volume, and those two "oz" units are meaningfully different conversions.
export function quickAddAmounts(unitSystem) {
  if (unitSystem === 'imperial') {
    return [
      { label: '8 oz', ml: 8 * UNITS.flOz.toGrams },
      { label: '16 oz', ml: 16 * UNITS.flOz.toGrams },
      { label: '24 oz', ml: 24 * UNITS.flOz.toGrams },
    ];
  }
  return [
    { label: '250 ml', ml: 250 },
    { label: '500 ml', ml: 500 },
    { label: '750 ml', ml: 750 },
  ];
}

export function mlToDisplay(ml, unitSystem) {
  return unitSystem === 'imperial' ? ml / UNITS.flOz.toGrams : ml;
}

export function displayToMl(amount, unitSystem) {
  return unitSystem === 'imperial' ? amount * UNITS.flOz.toGrams : amount;
}

export function displayUnitLabel(unitSystem) {
  return unitSystem === 'imperial' ? 'fl oz' : 'ml';
}

// Whole-number fl oz for imperial; liters (1 decimal) past 1000ml for
// metric, otherwise plain ml — matches how most water-tracking UIs read at
// a glance rather than showing "1500 ml" once totals get large.
export function formatWaterAmount(ml, unitSystem) {
  if (unitSystem === 'imperial') {
    return `${Math.round(ml / UNITS.flOz.toGrams)} fl oz`;
  }
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${Math.round(ml)} ml`;
}

export async function getWaterForDate(date = new Date()) {
  const { data, error } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('log_date', localDateString(date))
    .maybeSingle();
  if (error) return { amountMl: 0, error };
  return { amountMl: data?.amount_ml ?? 0, error: null };
}

// amountMl may be negative (used by the custom-amount "undo" affordance) —
// increment_water() floors the running total at 0 either way.
export async function addWater(amountMl, date = new Date()) {
  const { data, error } = await supabase.rpc('increment_water', {
    p_log_date: localDateString(date),
    p_amount_ml: amountMl,
  });
  if (error) return { amountMl: null, error };
  return { amountMl: data, error: null };
}

export async function resetWaterForDate(date = new Date()) {
  return supabase
    .from('water_logs')
    .update({ amount_ml: 0 })
    .eq('log_date', localDateString(date));
}
