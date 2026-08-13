import React from 'react';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { NumberWheelPicker } from '../../components/NumberWheelPicker';
import { COLORS } from '../../theme/colors';
import { useOnboarding } from '../../context/OnboardingContext';

export function TimeframeScreen({ navigation }) {
  const { targetTimeframeWeeks, setTargetTimeframeWeeks, seedInputsFromCalculated } = useOnboarding();

  return (
    <QuestionScreenLayout
      step={7}
      totalSteps={8}
      title="Over what timeframe?"
      subtitle="How many weeks to reach your target weight."
      icon="clock"
      iconColor={COLORS.success}
      onBack={() => navigation.goBack()}
      onContinue={() => {
        seedInputsFromCalculated();
        navigation.navigate('Review');
      }}
    >
      <NumberWheelPicker
        value={targetTimeframeWeeks}
        onChange={setTargetTimeframeWeeks}
        min={1}
        max={52}
        step={1}
        unit="weeks"
        accentColor={COLORS.success}
      />
    </QuestionScreenLayout>
  );
}
