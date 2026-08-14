import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../theme/fonts';
import { useTheme } from '../context/ThemeContext';
import { updateMealLogServings, deleteMealLog } from '../lib/mealLogs';

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Tap-to-expand editing (servings adjust + delete), consistent with the
// tap-to-expand pattern used everywhere else in the app, rather than a
// swipe gesture — more discoverable and more accessible.
export function MealLogEntry({ log, onChanged }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [servings, setServings] = useState(log.servings_logged);
  const [saving, setSaving] = useState(false);

  const toggle = () => {
    Haptics.selectionAsync();
    setServings(log.servings_logged);
    setExpanded((e) => !e);
  };

  const stepServings = (delta) => {
    Haptics.selectionAsync();
    setServings((s) => Math.max(0.5, Math.round((s + delta) * 100) / 100));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await updateMealLogServings(log.id, servings);
    setSaving(false);
    if (!error) {
      setExpanded(false);
      onChanged();
    }
  };

  const confirmDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete this entry?',
      `Remove "${log.recipe_title}" from today's log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteMealLog(log.id);
            if (!error) onChanged();
          },
        },
      ],
    );
  };

  const totalCalories = Math.round(log.calories_per_serving * log.servings_logged);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={toggle} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{log.recipe_title}</Text>
          <Text style={styles.meta}>
            {log.servings_logged} serving{log.servings_logged === 1 ? '' : 's'} · {formatTime(log.logged_at)}
          </Text>
        </View>
        <Text style={styles.calories}>{totalCalories} kcal</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.inkMuted} />
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

          <View style={styles.actions}>
            <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
              <Feather name="trash-2" size={14} color={colors.destructive} />
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving || servings === log.servings_logged}
              style={[styles.saveBtn, (saving || servings === log.servings_logged) && { opacity: 0.5 }]}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  wrap: { backgroundColor: colors.surfaceRaised, borderRadius: 14, borderCurve: 'continuous', marginBottom: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  title: { fontFamily: FONTS.bodyBold, fontSize: 14, color: colors.ink },
  meta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  calories: { fontFamily: FONTS.displaySemiBold, fontSize: 13, color: colors.ink },

  panel: { paddingHorizontal: 12, paddingBottom: 14, paddingTop: 2 },
  panelLabel: { fontFamily: FONTS.bodyBold, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.inkMuted, marginBottom: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 10, borderCurve: 'continuous', backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: { fontFamily: FONTS.displaySemiBold, fontSize: 17, color: colors.ink, minWidth: 36, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  deleteBtn: {
    flex: 1, flexDirection: 'row', gap: 6, minHeight: 38, alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, borderCurve: 'continuous', borderWidth: 1.5, borderColor: `${colors.destructive}40`,
  },
  deleteText: { fontFamily: FONTS.bodyBold, fontSize: 12.5, color: colors.destructive },
  saveBtn: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderCurve: 'continuous', backgroundColor: colors.primary },
  saveText: { fontFamily: FONTS.bodyBold, fontSize: 12.5, color: colors.onFill },
}); }
