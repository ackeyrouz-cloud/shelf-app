import React, { createContext, useContext, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateTargets } from '../lib/targets';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';

const OnboardingContext = createContext(undefined);

// Scoped to the onboarding flow only (mounted by OnboardingNavigator, torn
// down once the profile is saved) — this is deliberately not a global
// context like Auth/Profile/Pantry.
export function OnboardingProvider({ children }) {
  const { userId } = useAuth();
  const { setProfile } = useProfile();

  // Wheel-picker fields get sane defaults so the highlighted value and the
  // Continue button always agree — there's no "nothing selected" state for
  // a wheel the way there is for an unselected chip.
  const [sex, setSex] = useState('');
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [activityLevel, setActivityLevel] = useState('');
  const [targetWeight, setTargetWeight] = useState(70);
  const [targetTimeframeWeeks, setTargetTimeframeWeeks] = useState(12);

  // Editable target overrides — undefined until the review screen seeds them
  // from the calculated baseline, matching the original "adjust before saving" behavior.
  const [caloriesInput, setCaloriesInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');
  const [fiberInput, setFiberInput] = useState('');

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

  const save = async () => {
    const finalCalories = parseFloat(caloriesInput);
    const finalProtein = parseFloat(proteinInput);
    const finalCarbs = parseFloat(carbsInput);
    const finalFat = parseFloat(fatInput);
    const finalFiber = parseFloat(fiberInput);
    if ([finalCalories, finalProtein, finalCarbs, finalFat, finalFiber].some(n => !(n >= 0))) {
      setSaveError('Enter valid numbers for all targets.');
      return;
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
      })
      .select()
      .single();
    if (saveErr) {
      setSaveError("Couldn't save your profile. Check your connection and try again.");
      setSaving(false);
      return;
    }
    setProfile(data);
  };

  const value = {
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
