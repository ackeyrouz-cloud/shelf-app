import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable, Switch,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { FilterBlock } from '../../components/FilterBlock';
import { ChipRow } from '../../components/ChipRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { logMeal } from '../../lib/mealLogs';
import { createCustomFood } from '../../lib/customFoods';
import { UNITS, STANDARD_UNIT_ORDER, toGramsEquivalent } from '../../lib/units';

const UNIT_OPTIONS = STANDARD_UNIT_ORDER.map((v) => ({ v, label: UNITS[v].label }));

// Manual entry is the always-available fallback for anything without a
// recipe behind it — packaged food, restaurant meals, anything with a known
// label. servings is pinned at 1: the user types the totals for what they
// actually ate, not a per-serving base to be multiplied (the servings-adjust
// UI on the logged entry afterward still works fine as a "scale this whole
// entry" correction, same as it does for recipe logs).
//
// "Save as a reusable food" is the same form plus one more question — what
// amount these values are for — since a custom food needs a per-100 base to
// scale correctly in search later, the same convention as database foods. A
// pure one-off entry skips that question entirely; there's nothing to scale.
export function LogMealScreen({ navigation, route }) {
  const { userId } = useAuth();
  const { colors } = useTheme();
  const common = useCommonStyles();

  const initialCreateCustom = !!route.params?.createCustom;

  const [name, setName] = useState(route.params?.prefillName || '');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [saveAsCustom, setSaveAsCustom] = useState(initialCreateCustom);
  const [baseQuantity, setBaseQuantity] = useState('100');
  const [baseUnit, setBaseUnit] = useState('g');
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

    let base = null;
    let quantity = null;
    let quantityUnit = null;
    let customFoodId = null;
    let source = 'manual';

    if (saveAsCustom) {
      const qty = parseFloat(baseQuantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError('Enter a valid amount for what these values are based on.');
        return;
      }
      const grams = toGramsEquivalent(qty, baseUnit);
      const factor = 100 / grams;
      base = {
        caloriesPer100: parsed.calories * factor,
        proteinPer100: parsed.proteinG * factor,
        carbsPer100: parsed.carbsG * factor,
        fatPer100: parsed.fatG * factor,
        fiberPer100: parsed.fiberG != null ? parsed.fiberG * factor : null,
      };
      const isBeverage = UNITS[baseUnit].kind === 'volume';

      setError('');
      setSaving(true);
      const { data: customFood, error: customError } = await createCustomFood({
        userId, name: name.trim(), brand: null, base, isBeverage,
      });
      if (customError) {
        setSaving(false);
        setError("Couldn't save this as a reusable food. Check your connection and try again.");
        return;
      }
      customFoodId = customFood.id;
      quantity = qty;
      quantityUnit = baseUnit;
      source = 'custom';
    } else {
      setError('');
      setSaving(true);
    }

    const { error: saveError } = await logMeal({
      userId,
      recipeTitle: name.trim(),
      servings: 1,
      macros: parsed,
      source,
      base,
      quantity,
      quantityUnit,
      customFoodId,
    });
    setSaving(false);
    if (saveError) {
      setError("Couldn't save this entry. Check your connection and try again.");
      return;
    }
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">
          <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
              <Feather name="chevron-left" size={24} color={colors.ink} />
            </Pressable>
            <Text style={[common.h1, { marginTop: 0 }]}>{initialCreateCustom ? 'Create a custom food' : 'Log a meal'}</Text>
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

          <View style={[common.card, { marginTop: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={common.filterTitle}>Save as a reusable food</Text>
                <Text style={[common.tagline, { marginTop: 0 }]}>Find and log this again later from search.</Text>
              </View>
              <Switch
                value={saveAsCustom}
                onValueChange={setSaveAsCustom}
                trackColor={{ false: colors.hairline, true: colors.premium }}
                thumbColor={colors.surface}
                accessibilityLabel="Save as a reusable custom food"
              />
            </View>
            {saveAsCustom && (
              <View style={{ marginTop: 16 }}>
                <FilterBlock title="These values are for">
                  <TextInput
                    style={common.input}
                    placeholder="100"
                    placeholderTextColor={colors.inkMuted}
                    keyboardType="decimal-pad"
                    value={baseQuantity}
                    onChangeText={setBaseQuantity}
                    accessibilityLabel="Base amount"
                  />
                </FilterBlock>
                <View style={{ marginTop: 10 }}>
                  <ChipRow options={UNIT_OPTIONS} value={baseUnit} onChange={setBaseUnit} />
                </View>
              </View>
            )}
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
