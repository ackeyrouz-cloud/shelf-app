import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { common } from '../theme/common';
import { MacroRing } from './MacroRing';
import { MacroBar } from './MacroBar';

export function RecipeCard({ recipe, servings, open, onToggle }) {
  const missing = recipe.missing || [];
  const usesFromShelf = recipe.usesFromShelf || [];
  const totalRelevant = usesFromShelf.length + missing.length;
  const ready = missing.length === 0;
  const matchColor = ready ? COLORS.success : COLORS.premium;
  const fraction = totalRelevant > 0 ? usesFromShelf.length / totalRelevant : 0;
  const [checked, setChecked] = useState({});
  const toggleIngredient = (i) => {
    Haptics.selectionAsync();
    setChecked(prev => ({ ...prev, [i]: !prev[i] }));
  };
  const handleToggle = () => {
    Haptics.selectionAsync();
    onToggle();
  };

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(fraction, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [fraction]);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <Pressable onPress={handleToggle} style={({ pressed }) => [styles.recipe, { borderLeftColor: matchColor }, pressed && { opacity: 0.92 }]}>
      <View style={styles.recipeTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.recipeMeta}>{recipe.time} · {recipe.difficulty} · Serves {servings}</Text>
        </View>
        <View style={[styles.matchBadge, { backgroundColor: matchColor }]}>
          <Text style={styles.matchBadgeText}>
            {ready ? 'Ready now' : `Needs ${missing.length} item${missing.length > 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      {totalRelevant > 0 && (
        <View style={styles.usesBlock}>
          <View style={styles.usesLabelRow}>
            <Text style={styles.usesNumber}>
              {usesFromShelf.length}<Text style={styles.usesNumberMuted}> / {totalRelevant} ingredients you have</Text>
            </Text>
          </View>
          <View style={styles.usesTrack}>
            <Animated.View style={[styles.usesFill, fillStyle, { backgroundColor: matchColor }]} />
          </View>
        </View>
      )}

      {!ready && (
        <Text style={styles.missingLine}>Pick up: <Text style={{ fontFamily: FONTS.bodyBold, color: COLORS.premium }}>{missing.join(', ')}</Text></Text>
      )}

      {/* UI slot for Phase 4's backend macro fields — renders only once a
          recipe actually carries this data, using the same fixed macro
          colors as everywhere else in the app. */}
      {recipe.calories != null && (
        <View style={styles.macroChips}>
          <View style={styles.macroChip}>
            <Text style={styles.macroChipLabel}>KCAL</Text>
            <Text style={styles.macroChipValue}>{Math.round(recipe.calories)}</Text>
          </View>
          {recipe.proteinG != null && (
            <View style={styles.macroChip}>
              <View style={[styles.macroDot, { backgroundColor: COLORS.protein }]} />
              <Text style={styles.macroChipLabel}>PROTEIN</Text>
              <Text style={styles.macroChipValue}>{Math.round(recipe.proteinG)}g</Text>
            </View>
          )}
          {recipe.carbsG != null && (
            <View style={styles.macroChip}>
              <View style={[styles.macroDot, { backgroundColor: COLORS.carbs }]} />
              <Text style={styles.macroChipLabel}>CARBS</Text>
              <Text style={styles.macroChipValue}>{Math.round(recipe.carbsG)}g</Text>
            </View>
          )}
          {recipe.fatG != null && (
            <View style={styles.macroChip}>
              <View style={[styles.macroDot, { backgroundColor: COLORS.fat }]} />
              <Text style={styles.macroChipLabel}>FAT</Text>
              <Text style={styles.macroChipValue}>{Math.round(recipe.fatG)}g</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.expandRow}>
        <Text style={common.expandHint}>{open ? 'Tap to collapse' : 'Tap for full recipe'}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.inkMuted} />
      </View>

      {open && (
        <View style={styles.recipeDetail}>
          {recipe.calories != null && (
            <View style={styles.fullMacros}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <MacroRing calories={recipe.calories} size={104} label="KCAL / SERVING" />
              </View>
              {recipe.proteinG != null && <MacroBar label="Protein" grams={recipe.proteinG} kcalPerGram={4} totalCalories={recipe.calories} color={COLORS.protein} />}
              {recipe.carbsG != null && <MacroBar label="Carbs" grams={recipe.carbsG} kcalPerGram={4} totalCalories={recipe.calories} color={COLORS.carbs} />}
              {recipe.fatG != null && <MacroBar label="Fat" grams={recipe.fatG} kcalPerGram={9} totalCalories={recipe.calories} color={COLORS.fat} />}
            </View>
          )}

          <Text style={styles.detailHeading}>Ingredients</Text>
          {(recipe.ingredients || []).map((ing, i) => (
            <Pressable
              key={i}
              style={styles.ingredientRow}
              onPress={() => toggleIngredient(i)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!checked[i] }}
              accessibilityLabel={ing}
            >
              <View style={[styles.ingredientCheck, checked[i] && styles.ingredientCheckActive]}>
                {!!checked[i] && <Feather name="check" size={11} color={COLORS.onFill} />}
              </View>
              <Text style={[styles.ingredientText, checked[i] && styles.ingredientTextChecked]}>{ing}</Text>
            </Pressable>
          ))}

          <Text style={[styles.detailHeading, { marginTop: 18 }]}>Steps</Text>
          {(recipe.steps || []).map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  recipe: {
    backgroundColor: COLORS.surface, borderLeftWidth: 4, borderRadius: 20, borderCurve: 'continuous',
    padding: 16, marginBottom: 14, boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
  },
  recipeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  recipeTitle: { fontFamily: FONTS.displaySemiBold, fontSize: 17, color: COLORS.ink },
  recipeMeta: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.inkMuted, marginTop: 4 },
  matchBadge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  matchBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11.5, color: COLORS.onFill },

  usesBlock: { marginTop: 14 },
  usesLabelRow: { marginBottom: 7 },
  usesNumber: { fontFamily: FONTS.displaySemiBold, fontSize: 15, color: COLORS.ink },
  usesNumberMuted: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.inkMuted },
  usesTrack: { height: 8, borderRadius: 999, backgroundColor: COLORS.hairline, overflow: 'hidden' },
  usesFill: { height: '100%', width: '100%', borderRadius: 999, transformOrigin: 'left' },

  missingLine: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.inkMuted, marginTop: 10 },

  macroChips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  macroChip: { flex: 1, backgroundColor: COLORS.surfaceRaised, borderRadius: 12, borderCurve: 'continuous', padding: 8, alignItems: 'flex-start' },
  macroDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  macroChipLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5, color: COLORS.inkMuted },
  macroChipValue: { fontFamily: FONTS.displaySemiBold, fontSize: 13, color: COLORS.ink, marginTop: 2 },
  expandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  recipeDetail: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.hairline },
  fullMacros: { marginBottom: 20 },
  detailHeading: { fontFamily: FONTS.bodyBold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: COLORS.inkMuted, marginBottom: 8 },

  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, marginBottom: 6 },
  ingredientCheck: {
    width: 20, height: 20, borderWidth: 1.5, borderColor: COLORS.hairline, borderRadius: 6, borderCurve: 'continuous',
    backgroundColor: COLORS.surfaceRaised, alignItems: 'center', justifyContent: 'center',
  },
  ingredientCheckActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  ingredientText: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  ingredientTextChecked: { color: COLORS.inkMuted, textDecorationLine: 'line-through' },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  stepNumber: { width: 22, height: 22, marginTop: 1, borderRadius: 8, borderCurve: 'continuous', backgroundColor: `${COLORS.primary}22`, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.primary },
  stepText: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 14, color: COLORS.ink, lineHeight: 21 },
});
