import React from 'react';
import { SafeAreaView, View, Text, Platform, KeyboardAvoidingView } from 'react-native';
import { common } from '../theme/common';
import { QuestionHeader } from './QuestionHeader';
import { PrimaryButton } from './PrimaryButton';

// Shared chrome for every onboarding question: back chevron + step progress,
// title/subtitle (+ optional small icon accent), centered content, and a
// fixed-bottom Continue CTA. Kept as a single layout so every question
// screen feels like the same object, not eight separately-built forms.
export function QuestionScreenLayout({
  step, totalSteps, onBack, title, subtitle, icon, iconFamily, iconColor, children,
  onContinue, continueLabel = 'Continue', continueDisabled = false, error,
}) {
  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <QuestionHeader
            step={step} totalSteps={totalSteps} onBack={onBack} title={title} subtitle={subtitle}
            icon={icon} iconFamily={iconFamily} iconColor={iconColor}
          />

          <View style={{ flex: 1, justifyContent: 'center' }}>
            {children}
          </View>

          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}

          <PrimaryButton
            label={continueLabel}
            onPress={onContinue}
            disabled={continueDisabled}
            style={{ marginBottom: 20 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
