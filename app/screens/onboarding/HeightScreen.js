import React from 'react';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { NumberWheelPicker } from '../../components/NumberWheelPicker';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { cmToIn, inToCm } from '../../lib/measurements';

// Imperial deliberately uses a single relabeled "in" wheel rather than a
// separate feet+inches picker — less polished, but a fundamentally
// different widget wasn't worth building for a Settings-level toggle.
export function HeightScreen({ navigation }) {
  const { height, setHeight, unitSystem } = useOnboarding();
  const { colors } = useTheme();
  const isImperial = unitSystem === 'imperial';

  return (
    <QuestionScreenLayout
      step={3}
      totalSteps={8}
      title="How tall are you?"
      icon="human-male-height"
      iconFamily="MaterialCommunityIcons"
      iconColor={colors.fat}
      onBack={() => navigation.goBack()}
      onContinue={() => navigation.navigate('Weight')}
    >
      <NumberWheelPicker
        value={isImperial ? cmToIn(height) : height}
        onChange={(v) => setHeight(isImperial ? inToCm(v) : v)}
        min={isImperial ? 47 : 120}
        max={isImperial ? 87 : 220}
        step={1}
        unit={isImperial ? 'in' : 'cm'}
        accentColor={colors.fat}
      />
    </QuestionScreenLayout>
  );
}
