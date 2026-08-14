import React from 'react';
import { View } from 'react-native';
import { QuestionScreenLayout } from '../../components/QuestionScreenLayout';
import { SelectableCard } from '../../components/SelectableCard';
import { useTheme } from '../../context/ThemeContext';
import { SEX_OPTIONS } from '../../lib/targets';
import { useOnboarding } from '../../context/OnboardingContext';

const SEX_ICONS = { male: 'human-male', female: 'human-female' };

export function SexScreen({ navigation }) {
  const { sex, setSex } = useOnboarding();
  const { colors } = useTheme();

  return (
    <QuestionScreenLayout
      step={1}
      totalSteps={8}
      title="What's your sex?"
      subtitle="Used for the calorie-need formula — it's the biggest factor after body size."
      icon="user"
      onContinue={() => navigation.navigate('Age')}
      continueDisabled={!sex}
    >
      <View style={{ gap: 12 }}>
        {SEX_OPTIONS.map(opt => (
          <SelectableCard
            key={opt.v}
            icon={SEX_ICONS[opt.v]}
            iconFamily="MaterialCommunityIcons"
            label={opt.label}
            selected={sex === opt.v}
            onPress={() => setSex(opt.v)}
            accentColor={colors.primary}
          />
        ))}
      </View>
    </QuestionScreenLayout>
  );
}
