import React, { createContext, useContext, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateTargets } from '../lib/targets';
import { getWaterUnitSystem, mlToDisplay, displayToMl, displayUnitLabel } from '../lib/water';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';

const OnboardingContext = createContext(undefined);

// Scoped to the onboarding flow only (mounted by OnboardingNavigator, torn
// down once the profile is saved) — this is deliberately not a global
// context like Auth/Profile/Pantry. Doubles as the "edit targets" flow when
// entered from Settings with an existing profile already loaded: the same
// screens, prefilled with real values instead of defaults, ending at the
// same override-capable review screen.
export function OnboardingProvider({ children }) {
  const { userId } = useAuth();
  const { profile, setProfile } = useProfile();

  // True whenever there's a complete existing profile to edit (i.e. this
  // mount came from Settings' "Recalculate Targets", not first-time signup).
  const isEditingExisting = profile?.weight != null;

  // Wheel-picker fields get sane defaults so the highlighted value and the
  // Continue button always agree — there's no "nothing selected" state for
  // a wheel the way there is for an unselected chip. When editing an
  // existing profile, seed from its real values instead.
  const [sex, setSex] = useState(() => profile?.sex ?? '');
  const [age, setAge] = useState(() => profile?.age ?? 30);
  const [height, setHeight] = useState(() => profile?.height ?? 170);
  const [weight, setWeight] = useState(() => profile?.weight ?? 70);
  const [activityLevel, setActivityLevel] = useState(() => profile?.activity_level ?? '');
  const [targetWeight, setTargetWeight] = useState(() => profile?.target_weight ?? 70);
  const [targetTimeframeWeeks, setTargetTimeframeWeeks] = useState(() => profile?.target_timeframe_weeks ?? 12);

  // Editable target overrides — undefined until the review screen seeds them
  // from the calculated baseline, matching the original "adjust before saving" behavior.
  const [caloriesInput, setCaloriesInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');
  const [fiberInput, setFiberInput] = useState('');

  // Water goal is only editable from Settings (isEditingExisting), never
  // shown during first-time onboarding — but it's still part of every save,
  // seeded here so a first-time save writes a sensible default rather than
  // needing a special case.
  const waterUnitSystem = useMemo(() => getWaterUnitSystem(), []);
  const waterUnitLabel = displayUnitLabel(waterUnitSystem);
  const [waterInput, setWaterInput] = useState(() => String(Math.round(mlToDisplay(profile?.target_water_ml ?? 2000, waterUnitSystem))));

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const calculated = useMemo(() => {
    if (!sex || !activityLevel || !(age > 0) || !(height > 0) || !(weight > 0) || !(targetWeight > 0) || !(targetTimeframeWeeks >= 1)) {
      return null;
    }
    return calculateTargets({ weight, height, age, sex, activityLevel, targetWeight, targetTimeframeWeeks });
  }, [sex, age, height, weight, activityLevel, targetWeight, targetTimeframeWeeks]);

  const seedInputsFromCalculated = () => {
    if (!calculated) return;
    setCaloriesInput(String(calculated.calories));
    setProteinInput(String(calculated.proteinG));
    setCarbsInput(String(calculated.carbsG));
    setFatInput(String(calculated.fatG));
    setFiberInput(String(calculated.fiberG));
  };

  // Returns true on success, false on failure — callers only need this to
  // decide whether to navigate afterward (the edit-from-Settings case);
  // first-time onboarding ignores the return value since RootNavigator's
  // gate transitions automatically once profile updates.
  const save = async () => {
    const finalCalories = parseFloat(caloriesInput);
    const finalProtein = parseFloat(proteinInput);
    const finalCarbs = parseFloat(carbsInput);
    const finalFat = parseFloat(fatInput);
    const finalFiber = parseFloat(fiberInput);
    if ([finalCalories, finalProtein, finalCarbs, finalFat, finalFiber].some(n => !(n >= 0))) {
      setSaveError('Enter valid numbers for all targets.');
      return false;
    }
    const finalWaterMl = displayToMl(parseFloat(waterInput), waterUnitSystem);
    if (!(finalWaterMl > 0)) {
      setSaveError('Enter a valid water goal.');
      return false;
    }
    setSaveError('');
    setSaving(true);
    const { data, error: saveErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        weight,
        height,
        age,
        sex,
        activity_level: activityLevel,
        target_weight: targetWeight,
        target_timeframe_weeks: targetTimeframeWeeks,
        weekly_goal_rate: calculated.weeklyGoalRateKg,
        target_calories: finalCalories,
        target_protein_g: finalProtein,
        target_carbs_g: finalCarbs,
        target_fat_g: finalFat,
        target_fiber_g: finalFiber,
        target_water_ml: finalWaterMl,
      })
      .select()
      .single();
    if (saveErr) {
      setSaveError("Couldn't save your profile. Check your connection and try again.");
      setSaving(false);
      return false;
    }
    setProfile(data);
    setSaving(false);
    return true;
  };

  const value = {
    isEditingExisting,
    sex, setSex,
    age, setAge,
    height, setHeight,
    weight, setWeight,
    activityLevel, setActivityLevel,
    targetWeight, setTargetWeight,
    targetTimeframeWeeks, setTargetTimeframeWeeks,
    calculated,
    caloriesInput, setCaloriesInput,
    proteinInput, setProteinInput,
    carbsInput, setCarbsInput,
    fatInput, setFatInput,
    fiberInput, setFiberInput,
    waterInput, setWaterInput, waterUnitLabel,
    seedInputsFromCalculated,
    saving, saveError,
    save,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (ctx === undefined) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
