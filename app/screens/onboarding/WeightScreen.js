import React from 'react';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { NumberWheelPicker } from '../../components/NumberWheelPicker';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { kgToLb, lbToKg } from '../../lib/measurements';

export function WeightScreen({ navigation }) {
  const { weight, setWeight, unitSystem } = useOnboarding();
  const { colors } = useTheme();
  const isImperial = unitSystem === 'imperial';

  return (
    <QuestionScreenLayout
      step={4}
      totalSteps={8}
      title="What's your current weight?"
      icon="scale-bathroom"
      iconFamily="MaterialCommunityIcons"
      iconColor={colors.protein}
      onBack={() => navigation.goBack()}
      onContinue={() => navigation.navigate('Activity')}
    >
      <NumberWheelPicker
        value={isImperial ? kgToLb(weight) : weight}
        onChange={(v) => setWeight(isImperial ? lbToKg(v) : v)}
        min={isImperial ? 66 : 30}
        max={isImperial ? 550 : 250}
        step={isImperial ? 1 : 0.5}
        unit={isImperial ? 'lb' : 'kg'}
        formatValue={(v) => (isImperial ? String(Math.round(v)) : v.toFixed(1))}
        accentColor={colors.protein}
      />
    </QuestionScreenLayout>
  );
}
