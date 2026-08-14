import React from 'react';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { NumberWheelPicker } from '../../components/NumberWheelPicker';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';

export function WeightScreen({ navigation }) {
  const { weight, setWeight } = useOnboarding();
  const { colors } = useTheme();

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
        value={weight}
        onChange={setWeight}
        min={30}
        max={250}
        step={0.5}
        unit="kg"
        formatValue={(v) => v.toFixed(1)}
        accentColor={colors.protein}
      />
    </QuestionScreenLayout>
  );
}
