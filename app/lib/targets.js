export const SEX_OPTIONS = [
  { v: 'male', label: 'Male' },
  { v: 'female', label: 'Female' },
];
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};
// kcal per kg of body fat - the standard metric approximation used to convert a
// weekly weight-change goal into a daily calorie adjustment.
const KCAL_PER_KG_FAT = 7700;

// Mifflin-St Jeor BMR -> activity-scaled TDEE -> calorie target adjusted for the
// weekly rate implied by (targetWeight - weight) / targetTimeframeWeeks, floored at
// BMR so it never recommends eating below resting energy needs. Macros: protein by
// g/kg bodyweight (scaled by goal direction), fat as a % of calories with a g/kg
// floor, carbs fill the remainder with a floor, fiber per the USDA 14g/1000kcal
// guideline with a floor. When a floor overrides the pure math, the macros' calories
// can sum to slightly more than target_calories - that's intentional, not a bug.
export function calculateTargets({ weight, height, age, sex, activityLevel, targetWeight, targetTimeframeWeeks }) {
  const bmr = sex === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.sedentary);

  const weeklyGoalRateKg = (targetWeight - weight) / targetTimeframeWeeks;
  const dailyAdjustment = (weeklyGoalRateKg * KCAL_PER_KG_FAT) / 7;

  const calories = Math.max(tdee + dailyAdjustment, bmr);

  const proteinPerKg = weeklyGoalRateKg < 0 ? 2.0 : weeklyGoalRateKg > 0 ? 1.8 : 1.6;
  const proteinG = weight * proteinPerKg;

  const fatG = Math.max((calories * 0.25) / 9, weight * 0.5);

  const carbsG = Math.max((calories - proteinG * 4 - fatG * 9) / 4, 50);

  const fiberG = Math.max((calories / 1000) * 14, 20);

  const warningThreshold = weight * 0.01;
  const showWarning = Math.abs(weeklyGoalRateKg) > warningThreshold;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    weeklyGoalRateKg,
    calories: Math.round(calories / 10) * 10,
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
    fiberG: Math.round(fiberG),
    showWarning,
  };
}
