import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../theme/fonts';
import { useTheme, useCommonStyles } from '../context/ThemeContext';
import { MacroRing } from './MacroRing';
import { MacroBar } from './MacroBar';
import { LogMealButton } from './LogMealButton';

export function RecipeCard({ recipe, servings, open, onToggle }) {
  const { colors } = useTheme();
  const common = useCommonStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const missing = recipe.missing || [];
  const usesFromShelf = recipe.usesFromShelf || [];
  const totalRelevant = usesFromShelf.length + missing.length;
  const ready = missing.length === 0;
  const matchColor = ready ? colors.success : colors.premium;
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
        <Text style={styles.missingLine}>Pick up: <Text style={{ fontFamily: FONTS.bodyBold, color: colors.premium }}>{missing.join(', ')}</Text></Text>
      )}

      {/* Collapsed compact macro view — hidden once expanded, where the
          fuller ring+bars section below covers the same data. */}
      {!open && recipe.calories != null && (
        <View style={styles.macroChips}>
          <View style={styles.macroChip}>
            <Text style={styles.macroChipLabel}>KCAL</Text>
            <Text style={styles.macroChipValue}>{Math.round(recipe.calories)}</Text>
          </View>
          {recipe.proteinG != null && (
            <View style={styles.macroChip}>
              <View style={[styles.macroDot, { backgroundColor: colors.protein }]} />
              <Text style={styles.macroChipLabel}>PROTEIN</Text>
              <Text style={styles.macroChipValue}>{Math.round(recipe.proteinG)}g</Text>
            </View>
          )}
          {recipe.carbsG != null && (
            <View style={styles.macroChip}>
              <View style={[styles.macroDot, { backgroundColor: colors.carbs }]} />
              <Text style={styles.macroChipLabel}>CARBS</Text>
              <Text style={styles.macroChipValue}>{Math.round(recipe.carbsG)}g</Text>
            </View>
          )}
          {recipe.fatG != null && (
            <View style={styles.macroChip}>
              <View style={[styles.macroDot, { backgroundColor: colors.fat }]} />
              <Text style={styles.macroChipLabel}>FAT</Text>
              <Text style={styles.macroChipValue}>{Math.round(recipe.fatG)}g</Text>
            </View>
          )}
          {recipe.fiberG != null && (
            <View style={styles.macroChip}>
              <View style={[styles.macroDot, { backgroundColor: colors.fiber }]} />
              <Text style={styles.macroChipLabel}>FIBER</Text>
              <Text style={styles.macroChipValue}>{Math.round(recipe.fiberG)}g</Text>
            </View>
          )}
        </View>
      )}

      {!open && <LogMealButton recipe={recipe} />}

      <View style={styles.expandRow}>
        <Text style={common.expandHint}>{open ? 'Tap to collapse' : 'Tap for full recipe'}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.inkMuted} />
      </View>

      {open && (
        <View style={styles.recipeDetail}>
          {recipe.calories != null && (
            <View style={styles.fullMacros}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <MacroRing value={recipe.calories} size={104} label="KCAL / SERVING" />
              </View>
              {recipe.proteinG != null && <MacroBar label="Protein" grams={recipe.proteinG} kcalPerGram={4} totalCalories={recipe.calories} color={colors.protein} />}
              {recipe.carbsG != null && <MacroBar label="Carbs" grams={recipe.carbsG} kcalPerGram={4} totalCalories={recipe.calories} color={colors.carbs} />}
              {recipe.fatG != null && <MacroBar label="Fat" grams={recipe.fatG} kcalPerGram={9} totalCalories={recipe.calories} color={colors.fat} />}
              {/* Fiber has no separate calorie share to fill a composition
                  bar with (it's already counted inside carbs) — a plain
                  stat is the honest treatment here, not a bar stuck at 0%. */}
              {recipe.fiberG != null && (
                <View style={styles.fiberStat}>
                  <View style={[styles.macroDot, { backgroundColor: colors.fiber, marginBottom: 0 }]} />
                  <Text style={styles.fiberStatLabel}>FIBER</Text>
                  <Text style={styles.fiberStatValue}>{Math.round(recipe.fiberG)}g</Text>
                </View>
              )}
              <LogMealButton recipe={recipe} />
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
                {!!checked[i] && <Feather name="check" size={11} color={colors.onFill} />}
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

function makeStyles(colors) { return StyleSheet.create({
  recipe: {
    backgroundColor: colors.surface, borderLeftWidth: 4, borderRadius: 20, borderCurve: 'continuous',
    padding: 16, marginBottom: 14, boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
  },
  recipeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  recipeTitle: { fontFamily: FONTS.displaySemiBold, fontSize: 17, color: colors.ink },
  recipeMeta: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: colors.inkMuted, marginTop: 4 },
  matchBadge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  matchBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11.5, color: colors.onFill },

  usesBlock: { marginTop: 14 },
  usesLabelRow: { marginBottom: 7 },
  usesNumber: { fontFamily: FONTS.displaySemiBold, fontSize: 15, color: colors.ink },
  usesNumberMuted: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: colors.inkMuted },
  usesTrack: { height: 8, borderRadius: 999, backgroundColor: colors.hairline, overflow: 'hidden' },
  usesFill: { height: '100%', width: '100%', borderRadius: 999, transformOrigin: 'left' },

  missingLine: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: colors.inkMuted, marginTop: 10 },

  macroChips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  macroChip: { flex: 1, backgroundColor: colors.surfaceRaised, borderRadius: 12, borderCurve: 'continuous', padding: 8, alignItems: 'flex-start' },
  macroDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  macroChipLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5, color: colors.inkMuted },
  macroChipValue: { fontFamily: FONTS.displaySemiBold, fontSize: 13, color: colors.ink, marginTop: 2 },
  fiberStat: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  fiberStatLabel: { fontFamily: FONTS.bodyBold, fontSize: 11.5, letterSpacing: 0.6, color: colors.inkMuted },
  fiberStatValue: { fontFamily: FONTS.displaySemiBold, fontSize: 14, color: colors.ink, marginLeft: 'auto' },
  expandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  recipeDetail: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.hairline },
  fullMacros: { marginBottom: 20 },
  detailHeading: { fontFamily: FONTS.bodyBold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkMuted, marginBottom: 8 },

  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, marginBottom: 6 },
  ingredientCheck: {
    width: 20, height: 20, borderWidth: 1.5, borderColor: colors.hairline, borderRadius: 6, borderCurve: 'continuous',
    backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center',
  },
  ingredientCheckActive: { backgroundColor: colors.success, borderColor: colors.success },
  ingredientText: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 14, color: colors.ink, lineHeight: 20 },
  ingredientTextChecked: { color: colors.inkMuted, textDecorationLine: 'line-through' },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  stepNumber: { width: 22, height: 22, marginTop: 1, borderRadius: 8, borderCurve: 'continuous', backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: colors.primary },
  stepText: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 14, color: colors.ink, lineHeight: 21 },
}); }
