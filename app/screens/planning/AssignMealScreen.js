import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ChipRow } from '../../components/ChipRow';
import { FilterBlock } from '../../components/FilterBlock';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RecipesScreen } from '../recipes/RecipesScreen';
import { MEAL_SLOT_LABELS, assignGeneratedRecipe, assignManualMeal } from '../../lib/mealPlans';

const MODE_OPTIONS = [
  { v: 'generate', label: 'Generate recipes' },
  { v: 'manual', label: 'Enter manually' },
];

// planDate/mealSlot come in via route.params from WeekPlanScreen's "+ Add"
// on a specific day/slot. Two independent paths, switched by a ChipRow, not
// two separate screens — reassigning your mind mid-flow (started generating,
// decided to just type it in) shouldn't mean backing out and re-entering.
export function AssignMealScreen({ navigation, route }) {
  const { planDate, mealSlot } = route.params;
  const { userId } = useAuth();
  const { colors } = useTheme();
  const common = useCommonStyles();

  const [mode, setMode] = useState('generate');

  const [title, setTitle] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAssignRecipe = async (recipe) => {
    const { error: assignError } = await assignGeneratedRecipe({ userId, planDate, mealSlot, recipe });
    if (assignError) {
      setError("Couldn't assign that recipe. Try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const handleManualSubmit = async () => {
    if (!title.trim()) {
      setError('Give this meal a name.');
      return;
    }
    // All four macros or none — a partial set would silently produce a plan
    // entry that can never be logged, with no clue why.
    const rawValues = [calories, protein, carbs, fat];
    const anyFilled = rawValues.some((v) => v.trim());
    const allFilled = rawValues.every((v) => v.trim());
    if (anyFilled && !allFilled) {
      setError('Enter calories, protein, carbs, and fat together, or leave all four blank.');
      return;
    }
    let macros = null;
    if (allFilled) {
      macros = {
        calories: parseFloat(calories),
        proteinG: parseFloat(protein),
        carbsG: parseFloat(carbs),
        fatG: parseFloat(fat),
        fiberG: fiber.trim() ? parseFloat(fiber) : null,
      };
      for (const [field, label] of [['calories', 'Calories'], ['proteinG', 'Protein'], ['carbsG', 'Carbs'], ['fatG', 'Fat']]) {
        if (!Number.isFinite(macros[field]) || macros[field] < 0) {
          setError(`Enter a valid ${label.toLowerCase()} value.`);
          return;
        }
      }
      if (macros.fiberG != null && (!Number.isFinite(macros.fiberG) || macros.fiberG < 0)) {
        setError('Enter a valid fiber value, or leave it blank.');
        return;
      }
    }
    setError('');
    setSaving(true);
    const { error: assignError } = await assignManualMeal({ userId, planDate, mealSlot, title: title.trim(), macros });
    setSaving(false);
    if (assignError) {
      setError("Couldn't save that. Try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 0 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Close">
            <Feather name="x" size={24} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={common.eyebrow}>{(MEAL_SLOT_LABELS[mealSlot] || '').toUpperCase()}</Text>
            <Text style={[common.h1, { marginTop: 0, fontSize: 22 }]}>Assign a meal</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 4 }}>
          <ChipRow options={MODE_OPTIONS} value={mode} onChange={setMode} />
        </View>

        {!!error && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          </View>
        )}

        {mode === 'generate' ? (
          <RecipesScreen onAssign={handleAssignRecipe} />
        ) : (
          <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">
            <View style={common.card}>
              <FilterBlock title="Name">
                <TextInput
                  style={common.input}
                  placeholder="e.g. Mom's chili"
                  placeholderTextColor={colors.inkMuted}
                  value={title}
                  onChangeText={setTitle}
                  accessibilityLabel="Meal name"
                />
              </FilterBlock>
              <FilterBlock title="Calories — optional" style={{ marginTop: 16 }}>
                <TextInput
                  style={common.input} placeholder="0" placeholderTextColor={colors.inkMuted}
                  keyboardType="decimal-pad" value={calories} onChangeText={setCalories} accessibilityLabel="Calories"
                />
              </FilterBlock>
              <FilterBlock title="Protein (g)" style={{ marginTop: 16 }}>
                <TextInput
                  style={common.input} placeholder="0" placeholderTextColor={colors.inkMuted}
                  keyboardType="decimal-pad" value={protein} onChangeText={setProtein} accessibilityLabel="Protein in grams"
                />
              </FilterBlock>
              <FilterBlock title="Carbs (g)" style={{ marginTop: 16 }}>
                <TextInput
                  style={common.input} placeholder="0" placeholderTextColor={colors.inkMuted}
                  keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} accessibilityLabel="Carbs in grams"
                />
              </FilterBlock>
              <FilterBlock title="Fat (g)" style={{ marginTop: 16 }}>
                <TextInput
                  style={common.input} placeholder="0" placeholderTextColor={colors.inkMuted}
                  keyboardType="decimal-pad" value={fat} onChangeText={setFat} accessibilityLabel="Fat in grams"
                />
              </FilterBlock>
              <FilterBlock title="Fiber (g) — optional" style={{ marginTop: 16 }}>
                <TextInput
                  style={common.input} placeholder="0" placeholderTextColor={colors.inkMuted}
                  keyboardType="decimal-pad" value={fiber} onChangeText={setFiber} accessibilityLabel="Fiber in grams, optional"
                />
              </FilterBlock>
              <Text style={[common.tagline, { marginTop: 12 }]}>
                Leave nutrition blank to just block off the slot — you can add it later, but you'll need it before this can be logged.
              </Text>
            </View>

            <PrimaryButton label={saving ? 'Saving…' : 'Assign to plan'} onPress={handleManualSubmit} disabled={saving} />
            {saving && <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
