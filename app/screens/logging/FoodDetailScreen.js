import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ChipRow } from '../../components/ChipRow';
import { MacroBar } from '../../components/MacroBar';
import { PrimaryButton } from '../../components/PrimaryButton';
import { UNITS, STANDARD_UNIT_ORDER, defaultUnitFor, scaleNutrition, fetchOffNamedServing } from '../../lib/units';
import { logMeal } from '../../lib/mealLogs';

const UNIT_OPTIONS = STANDARD_UNIT_ORDER.map((v) => ({ v, label: UNITS[v].label }));

export function FoodDetailScreen({ navigation, route }) {
  const { food, defaultQuantity, defaultUnit } = route.params;
  const { userId } = useAuth();
  const { colors } = useTheme();
  const common = useCommonStyles();

  const [quantityText, setQuantityText] = useState(String(defaultQuantity ?? 100));
  const [unit, setUnit] = useState(defaultUnit || defaultUnitFor(food.isBeverage));
  const [namedServing, setNamedServing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Named servings ("1 bar (40 g)") only exist for a subset of Open Food
  // Facts products and aren't reliably present in live search results —
  // fetched here, once, from the stable per-product endpoint, only for the
  // specific item the user picked.
  useEffect(() => {
    let cancelled = false;
    if (food.source === 'off' && food.offCode && defaultQuantity == null) {
      fetchOffNamedServing(food.offCode).then((serving) => {
        if (!cancelled) setNamedServing(serving);
      });
    }
    return () => { cancelled = true; };
  }, [food.offCode, food.source, defaultQuantity]);

  const quantity = parseFloat(quantityText);
  const scaled = useMemo(() => {
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    return scaleNutrition(food, quantity, unit);
  }, [food, quantity, unit]);

  const applyNamedServing = () => {
    if (!namedServing) return;
    setQuantityText(String(Math.round(namedServing.grams * 10) / 10));
    setUnit('g');
  };

  const submit = async () => {
    if (!scaled) {
      setError('Enter a valid amount.');
      return;
    }
    setError('');
    setSaving(true);
    const { error: saveError } = await logMeal({
      userId,
      recipeTitle: food.name,
      servings: 1,
      macros: { calories: scaled.calories, proteinG: scaled.proteinG, carbsG: scaled.carbsG, fatG: scaled.fatG, fiberG: scaled.fiberG },
      source: food.source === 'voice' ? 'voice' : food.source === 'photo' ? 'photo' : 'search',
      isEstimated: !!food.isEstimated,
      base: {
        caloriesPer100: food.caloriesPer100, proteinPer100: food.proteinPer100,
        carbsPer100: food.carbsPer100, fatPer100: food.fatPer100, fiberPer100: food.fiberPer100,
      },
      quantity,
      quantityUnit: unit,
      offCode: food.offCode,
      usdaId: food.usdaId,
      customFoodId: food.customFoodId,
    });
    setSaving(false);
    if (saveError) {
      setError("Couldn't log this meal. Try again.");
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
            <View style={{ flex: 1 }}>
              <Text style={[common.h1, { marginTop: 0, fontSize: 22 }]} numberOfLines={2}>{food.name}</Text>
              {!!food.brand && <Text style={common.tagline}>{food.brand}</Text>}
              {!!food.isEstimated && (
                <View style={{
                  flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5,
                  backgroundColor: `${colors.premium}22`, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, marginTop: 8,
                }}>
                  <Feather name="zap" size={10} color={colors.premium} />
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 0.5, color: colors.premium }}>ESTIMATED</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[common.card, { marginTop: 16 }]}>
            <Text style={common.filterTitle}>Amount</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput
                style={[common.input, { flex: 1 }]}
                keyboardType="decimal-pad"
                value={quantityText}
                onChangeText={setQuantityText}
                accessibilityLabel="Quantity"
              />
            </View>
            <View style={{ marginTop: 12 }}>
              <ChipRow options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
            </View>
            {!!namedServing && (
              <Pressable onPress={applyNamedServing} style={{ marginTop: 12 }}>
                <Text style={common.expandHint}>Use serving size: {namedServing.label}</Text>
              </Pressable>
            )}
          </View>

          {scaled && (
            <View style={[common.card, { marginTop: 14 }]}>
              <Text style={common.filterTitle}>Nutrition for this amount</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4, marginBottom: 14 }}>
                <Text style={{ fontFamily: FONTS.displayExtraBold, fontSize: 28, color: colors.ink }}>{Math.round(scaled.calories)}</Text>
                <Text style={common.tagline}>kcal</Text>
              </View>
              <MacroBar label="Protein" grams={scaled.proteinG} kcalPerGram={4} totalCalories={scaled.calories} color={colors.protein} />
              <MacroBar label="Carbs" grams={scaled.carbsG} kcalPerGram={4} totalCalories={scaled.calories} color={colors.carbs} />
              <MacroBar label="Fat" grams={scaled.fatG} kcalPerGram={9} totalCalories={scaled.calories} color={colors.fat} />
              {scaled.fiberG != null && (
                <Text style={[common.tagline, { marginTop: -4 }]}>Fiber: {Math.round(scaled.fiberG)}g</Text>
              )}
            </View>
          )}

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
