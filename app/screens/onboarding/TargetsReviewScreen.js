import React from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { FilterBlock } from '../../components/FilterBlock';
import { QuestionHeader } from '../../components/QuestionHeader';
import { PrimaryButton } from '../../components/PrimaryButton';
import { MacroRing } from '../../components/MacroRing';
import { MacroBar } from '../../components/MacroBar';
import { useOnboarding } from '../../context/OnboardingContext';

export function TargetsReviewScreen({ navigation }) {
  const {
    isEditingExisting,
    calculated,
    caloriesInput, setCaloriesInput,
    proteinInput, setProteinInput,
    carbsInput, setCarbsInput,
    fatInput, setFatInput,
    fiberInput, setFiberInput,
    waterInput, setWaterInput, waterUnitLabel,
    saving, saveError, save,
  } = useOnboarding();
  const { colors } = useTheme();
  const common = useCommonStyles();

  const calories = parseFloat(caloriesInput) || 0;
  const protein = parseFloat(proteinInput) || 0;
  const carbs = parseFloat(carbsInput) || 0;
  const fat = parseFloat(fatInput) || 0;

  const handleSave = async () => {
    const ok = await save();
    // Editing from Settings: pop the modal back to wherever it was opened
    // from. First-time onboarding: nothing to do, RootNavigator's own gate
    // swaps away from Onboarding automatically once the profile updates.
    if (ok && isEditingExisting) {
      navigation.getParent()?.goBack();
    }
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <QuestionHeader
            step={8}
            totalSteps={8}
            onBack={() => navigation.goBack()}
            title="Your daily targets"
            subtitle={`Based on an estimated maintenance of ${calculated ? calculated.tdee : '—'} kcal/day. Adjust any number below before saving.`}
          />

          {calculated?.showWarning && (
            <View style={common.errorBox}>
              <Text style={common.errorText}>This rate may be too aggressive and isn't generally recommended — consider a slower pace or consult a doctor.</Text>
            </View>
          )}

          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 8 }}>
            <MacroRing value={calories} />
          </View>

          <View style={{ marginTop: 12 }}>
            <MacroBar label="Protein" grams={protein} kcalPerGram={4} totalCalories={calories} color={colors.protein} />
            <MacroBar label="Carbs" grams={carbs} kcalPerGram={4} totalCalories={calories} color={colors.carbs} />
            <MacroBar label="Fat" grams={fat} kcalPerGram={9} totalCalories={calories} color={colors.fat} />
          </View>

          <View style={[common.card, { marginTop: 24 }]}>
            <FilterBlock title="Daily calories">
              <TextInput style={common.input} keyboardType="number-pad" value={caloriesInput} onChangeText={setCaloriesInput} accessibilityLabel="Daily calories" />
            </FilterBlock>
            <FilterBlock title="Protein (g)" style={{ marginTop: 16 }}>
              <TextInput style={common.input} keyboardType="number-pad" value={proteinInput} onChangeText={setProteinInput} accessibilityLabel="Protein in grams" />
            </FilterBlock>
            <FilterBlock title="Carbs (g)" style={{ marginTop: 16 }}>
              <TextInput style={common.input} keyboardType="number-pad" value={carbsInput} onChangeText={setCarbsInput} accessibilityLabel="Carbs in grams" />
            </FilterBlock>
            <FilterBlock title="Fat (g)" style={{ marginTop: 16 }}>
              <TextInput style={common.input} keyboardType="number-pad" value={fatInput} onChangeText={setFatInput} accessibilityLabel="Fat in grams" />
            </FilterBlock>
            <FilterBlock title="Fiber (g)" style={{ marginTop: 16 }}>
              <TextInput style={common.input} keyboardType="number-pad" value={fiberInput} onChangeText={setFiberInput} accessibilityLabel="Fiber in grams" />
            </FilterBlock>
            {isEditingExisting && (
              <FilterBlock title={`Daily water goal (${waterUnitLabel})`} style={{ marginTop: 16 }}>
                <TextInput style={common.input} keyboardType="number-pad" value={waterInput} onChangeText={setWaterInput} accessibilityLabel={`Daily water goal in ${waterUnitLabel}`} />
              </FilterBlock>
            )}
          </View>

          <PrimaryButton label={saving ? 'Saving…' : isEditingExisting ? 'Save targets' : 'Save and continue'} onPress={handleSave} disabled={saving} />

          {saving && <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />}
          {!!saveError && (
            <View style={common.errorBox}><Text style={common.errorText}>{saveError}</Text></View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
