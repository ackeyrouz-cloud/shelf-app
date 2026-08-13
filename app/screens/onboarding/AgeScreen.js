import React from 'react';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { NumberWheelPicker } from '../../components/NumberWheelPicker';
import { COLORS } from '../../theme/colors';
import { useOnboarding } from '../../context/OnboardingContext';

export function AgeScreen({ navigation }) {
  const { age, setAge } = useOnboarding();

  return (
    <QuestionScreenLayout
      step={2}
      totalSteps={8}
      title="How old are you?"
      icon="calendar"
      iconColor={COLORS.carbs}
      onBack={() => navigation.goBack()}
      onContinue={() => navigation.navigate('Height')}
    >
      <NumberWheelPicker
        value={age}
        onChange={setAge}
        min={13}
        max={100}
        step={1}
        unit="years"
        accentColor={COLORS.carbs}
      />
    </QuestionScreenLayout>
  );
}
