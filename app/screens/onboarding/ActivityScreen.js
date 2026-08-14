import React from 'react';
import { View, ScrollView } from 'react-native';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { SelectableCard } from '../../components/SelectableCard';
import { useTheme } from '../../context/ThemeContext';
import { useOnboarding } from '../../context/OnboardingContext';

// Standard 5-zone fitness intensity mapping (the same low-to-high color ramp
// wearables/HR-zone charts use — blue/green/gold/orange/red) rather than
// assigning arbitrary colors, and rather than reusing the macro hues, which
// already carry a different fixed meaning elsewhere in the app.
function activityOptions(colors) {
  return [
    { v: 'sedentary', label: 'Sedentary', description: 'Little to no exercise, desk job', icon: 'sofa', color: colors.primary },
    { v: 'light', label: 'Light', description: 'Light exercise or sports 1-3 days/week', icon: 'walk', color: colors.success },
    { v: 'moderate', label: 'Moderate', description: 'Moderate exercise or sports 3-5 days/week', icon: 'run', color: colors.premium },
    { v: 'active', label: 'Active', description: 'Hard exercise or sports 6-7 days/week', icon: 'run-fast', color: colors.protein },
    { v: 'very_active', label: 'Very Active', description: 'Very hard exercise daily, or physically demanding job', icon: 'fire', color: colors.destructive },
  ];
}

export function ActivityScreen({ navigation }) {
  const { activityLevel, setActivityLevel } = useOnboarding();
  const { colors } = useTheme();
  const ACTIVITY_OPTIONS = activityOptions(colors);

  return (
    <QuestionScreenLayout
      step={5}
      totalSteps={8}
      title="How active are you day-to-day?"
      subtitle="Outside of dedicated workouts — desk job vs. on-your-feet, that kind of thing."
      onBack={() => navigation.goBack()}
      onContinue={() => navigation.navigate('TargetWeight')}
      continueDisabled={!activityLevel}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '100%' }}>
        <View style={{ gap: 10, paddingBottom: 4 }}>
          {ACTIVITY_OPTIONS.map(opt => (
            <SelectableCard
              key={opt.v}
              icon={opt.icon}
              iconFamily="MaterialCommunityIcons"
              label={opt.label}
              description={opt.description}
              selected={activityLevel === opt.v}
              onPress={() => setActivityLevel(opt.v)}
              accentColor={opt.color}
            />
          ))}
        </View>
      </ScrollView>
    </QuestionScreenLayout>
  );
}
