import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { FilterBlock } from '../../components/FilterBlock';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { logMeal } from '../../lib/mealLogs';

// Manual entry is the always-available fallback for anything without a
// recipe behind it — packaged food, restaurant meals, anything with a known
// label. servings is pinned at 1: the user types the totals for what they
// actually ate, not a per-serving base to be multiplied (the servings-adjust
// UI on the logged entry afterward still works fine as a "scale this whole
// entry" correction, same as it does for recipe logs).
export function LogMealScreen({ navigation }) {
  const { userId } = useAuth();
  const { colors } = useTheme();
  const common = useCommonStyles();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      setError('Give this entry a name.');
      return;
    }
    const parsed = {
      calories: parseFloat(calories),
      proteinG: parseFloat(protein),
      carbsG: parseFloat(carbs),
      fatG: parseFloat(fat),
      fiberG: fiber.trim() ? parseFloat(fiber) : null,
    };
    for (const [field, label] of [['calories', 'Calories'], ['proteinG', 'Protein'], ['carbsG', 'Carbs'], ['fatG', 'Fat']]) {
      if (!Number.isFinite(parsed[field]) || parsed[field] < 0) {
        setError(`Enter a valid ${label.toLowerCase()} value.`);
        return;
      }
    }
    if (parsed.fiberG != null && (!Number.isFinite(parsed.fiberG) || parsed.fiberG < 0)) {
      setError('Enter a valid fiber value, or leave it blank.');
      return;
    }

    setError('');
    setSaving(true);
    const { error: saveError } = await logMeal({
      userId,
      recipeTitle: name.trim(),
      servings: 1,
      macros: parsed,
      source: 'manual',
    });
    setSaving(false);
    if (saveError) {
      setError("Couldn't save this entry. Check your connection and try again.");
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">
          <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Close">
              <Feather name="x" size={24} color={colors.ink} />
            </Pressable>
            <Text style={[common.h1, { marginTop: 0 }]}>Log a meal</Text>
          </View>
          <Text style={common.tagline}>Type in the nutrition info directly — for packaged food, restaurant meals, or anything with a known label.</Text>

          <View style={[common.card, { marginTop: 20 }]}>
            <FilterBlock title="Name">
              <TextInput
                style={common.input}
                placeholder="e.g. Chobani vanilla yogurt"
                placeholderTextColor={colors.inkMuted}
                value={name}
                onChangeText={setName}
                accessibilityLabel="Meal or food name"
              />
            </FilterBlock>
            <FilterBlock title="Calories" style={{ marginTop: 16 }}>
              <TextInput
                style={common.input}
                placeholder="0"
                placeholderTextColor={colors.inkMuted}
                keyboardType="decimal-pad"
                value={calories}
                onChangeText={setCalories}
                accessibilityLabel="Calories"
              />
            </FilterBlock>
            <FilterBlock title="Protein (g)" style={{ marginTop: 16 }}>
              <TextInput
                style={common.input}
                placeholder="0"
                placeholderTextColor={colors.inkMuted}
                keyboardType="decimal-pad"
                value={protein}
                onChangeText={setProtein}
                accessibilityLabel="Protein in grams"
              />
            </FilterBlock>
            <FilterBlock title="Carbs (g)" style={{ marginTop: 16 }}>
              <TextInput
                style={common.input}
                placeholder="0"
                placeholderTextColor={colors.inkMuted}
                keyboardType="decimal-pad"
                value={carbs}
                onChangeText={setCarbs}
                accessibilityLabel="Carbs in grams"
              />
            </FilterBlock>
            <FilterBlock title="Fat (g)" style={{ marginTop: 16 }}>
              <TextInput
                style={common.input}
                placeholder="0"
                placeholderTextColor={colors.inkMuted}
                keyboardType="decimal-pad"
                value={fat}
                onChangeText={setFat}
                accessibilityLabel="Fat in grams"
              />
            </FilterBlock>
            <FilterBlock title="Fiber (g) — optional" style={{ marginTop: 16 }}>
              <TextInput
                style={common.input}
                placeholder="0"
                placeholderTextColor={colors.inkMuted}
                keyboardType="decimal-pad"
                value={fiber}
                onChangeText={setFiber}
                accessibilityLabel="Fiber in grams, optional"
              />
            </FilterBlock>
          </View>

          <PrimaryButton label={saving ? 'Saving…' : 'Log this meal'} onPress={submit} disabled={saving} />

          {saving && <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />}
          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
