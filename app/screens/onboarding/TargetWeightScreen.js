import React from 'react';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { NumberWheelPicker } from '../../components/NumberWheelPicker';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { kgToLb, lbToKg } from '../../lib/measurements';

export function TargetWeightScreen({ navigation }) {
  const { targetWeight, setTargetWeight, unitSystem } = useOnboarding();
  const { colors } = useTheme();
  const isImperial = unitSystem === 'imperial';

  return (
    <QuestionScreenLayout
      step={6}
      totalSteps={8}
      title="What's your target weight?"
      subtitle="Set it equal to your current weight if you're aiming to maintain."
      icon="target"
      iconColor={colors.premium}
      onBack={() => navigation.goBack()}
      onContinue={() => navigation.navigate('Timeframe')}
    >
      <NumberWheelPicker
        value={isImperial ? kgToLb(targetWeight) : targetWeight}
        onChange={(v) => setTargetWeight(isImperial ? lbToKg(v) : v)}
        min={isImperial ? 66 : 30}
        max={isImperial ? 550 : 250}
        step={isImperial ? 1 : 0.5}
        unit={isImperial ? 'lb' : 'kg'}
        formatValue={(v) => (isImperial ? String(Math.round(v)) : v.toFixed(1))}
        accentColor={colors.premium}
      />
    </QuestionScreenLayout>
  );
}
