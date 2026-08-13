import React from 'react';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { NumberWheelPicker } from '../../components/NumberWheelPicker';
import { COLORS } from '../../theme/colors';
import { useOnboarding } from '../../context/OnboardingContext';

export function HeightScreen({ navigation }) {
  const { height, setHeight } = useOnboarding();

  return (
    <QuestionScreenLayout
      step={3}
      totalSteps={8}
      title="How tall are you?"
      icon="human-male-height"
      iconFamily="MaterialCommunityIcons"
      iconColor={COLORS.fat}
      onBack={() => navigation.goBack()}
      onContinue={() => navigation.navigate('Weight')}
    >
      <NumberWheelPicker
        value={height}
        onChange={setHeight}
        min={120}
        max={220}
        step={1}
        unit="cm"
        accentColor={COLORS.fat}
      />
    </QuestionScreenLayout>
  );
}
