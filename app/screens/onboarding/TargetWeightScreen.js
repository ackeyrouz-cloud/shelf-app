import React from 'react';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { NumberWheelPicker } from '../../components/NumberWheelPicker';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';

export function TargetWeightScreen({ navigation }) {
  const { targetWeight, setTargetWeight } = useOnboarding();
  const { colors } = useTheme();

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
        value={targetWeight}
        onChange={setTargetWeight}
        min={30}
        max={250}
        step={0.5}
        unit="kg"
        formatValue={(v) => v.toFixed(1)}
        accentColor={colors.premium}
      />
    </QuestionScreenLayout>
  );
}
