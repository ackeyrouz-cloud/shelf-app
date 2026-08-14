import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../theme/fonts';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { logMeal } from '../lib/mealLogs';

// One tap opens an inline servings-adjust panel (not instant-log-on-tap) so
// a mis-tap on a recipe card can't silently pollute the daily total, and so
// there's somewhere for the required serving-multiplier adjustment to live.
// Values logged are always exactly (per-serving macro) x (servings) — never
// re-estimated, never manually typed.
export function LogMealButton({ recipe }) {
  const { userId } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [servings, setServings] = useState(1);
  const [saving, setSaving] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [error, setError] = useState('');

  // Only offered once all four core macros are present — a log missing
  // protein/carbs/fat would defeat the point of a macro tracker, so partial
  // data blocks logging entirely rather than logging an incomplete entry.
  const canLog = recipe.calories != null && recipe.proteinG != null && recipe.carbsG != null && recipe.fatG != null;
  if (!canLog) return null;

  const stepServings = (delta) => {
    Haptics.selectionAsync();
    setServings((s) => Math.max(0.5, Math.round((s + delta) * 100) / 100));
  };

  const toggleExpanded = () => {
    Haptics.selectionAsync();
    setError('');
    setExpanded((e) => !e);
  };

  const confirm = async () => {
    setSaving(true);
    setError('');
    const { error: err } = await logMeal({
      userId,
      recipeTitle: recipe.title,
      servings,
      macros: {
        calories: recipe.calories,
        proteinG: recipe.proteinG,
        carbsG: recipe.carbsG,
        fatG: recipe.fatG,
        fiberG: recipe.fiberG,
      },
    });
    setSaving(false);
    if (err) {
      setError("Couldn't log this meal. Try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setExpanded(false);
    setServings(1);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 1800);
  };

  const scaled = (perServing) => Math.round(perServing * servings);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={toggleExpanded} style={[styles.button, justLogged && styles.buttonDone]}>
        <Feather name={justLogged ? 'check-circle' : 'plus-circle'} size={16} color={colors.onFill} />
        <Text style={styles.buttonText}>{justLogged ? 'Logged!' : 'Log this meal'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Servings eaten</Text>
          <View style={styles.stepperRow}>
            <Pressable onPress={() => stepServings(-0.5)} style={styles.stepperBtn} accessibilityLabel="Decrease servings">
              <Feather name="minus" size={16} color={colors.ink} />
            </Pressable>
            <Text style={styles.stepperValue}>{servings}</Text>
            <Pressable onPress={() => stepServings(0.5)} style={styles.stepperBtn} accessibilityLabel="Increase servings">
              <Feather name="plus" size={16} color={colors.ink} />
            </Pressable>
          </View>

          <Text style={styles.preview}>
            {scaled(recipe.calories)} kcal · P {scaled(recipe.proteinG)}g · C {scaled(recipe.carbsG)}g · F {scaled(recipe.fatG)}g
            {recipe.fiberG != null ? ` · Fiber ${scaled(recipe.fiberG)}g` : ''}
          </Text>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable onPress={toggleExpanded} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirm} disabled={saving} style={[styles.confirmBtn, saving && { opacity: 0.6 }]}>
              <Text style={styles.confirmText}>{saving ? 'Logging…' : 'Confirm'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  wrap: { marginTop: 12 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.success, borderRadius: 999, borderCurve: 'continuous', minHeight: 44, paddingHorizontal: 16,
  },
  buttonDone: { backgroundColor: colors.premium },
  buttonText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: colors.onFill },

  panel: {
    marginTop: 10, backgroundColor: colors.surfaceRaised, borderRadius: 16, borderCurve: 'continuous', padding: 14,
  },
  panelLabel: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.inkMuted, marginBottom: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: { fontFamily: FONTS.displaySemiBold, fontSize: 20, color: colors.ink, minWidth: 40, textAlign: 'center' },

  preview: { fontFamily: FONTS.bodySemiBold, fontSize: 12.5, color: colors.inkMuted, textAlign: 'center', marginTop: 14 },
  error: { fontFamily: FONTS.bodySemiBold, fontSize: 12.5, color: colors.errorText, textAlign: 'center', marginTop: 8 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderCurve: 'continuous', borderWidth: 1.5, borderColor: colors.hairline },
  cancelText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: colors.inkMuted },
  confirmBtn: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderCurve: 'continuous', backgroundColor: colors.primary },
  confirmText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: colors.onFill },
}); }
