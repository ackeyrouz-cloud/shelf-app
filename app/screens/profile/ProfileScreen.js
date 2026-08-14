import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { MacroRing } from '../../components/MacroRing';
import { NutrientProgressBar } from '../../components/NutrientProgressBar';
import { MealLogEntry } from '../../components/MealLogEntry';
import { useProfile } from '../../context/ProfileContext';
import { getMealLogsForDate, localDateString } from '../../lib/mealLogs';

function addDays(date, delta) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

function dateLabel(date) {
  const today = new Date();
  if (localDateString(date) === localDateString(today)) return 'Today';
  if (localDateString(date) === localDateString(addDays(today, -1))) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ProfileScreen({ navigation }) {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const common = useCommonStyles();
  const dateNavStyles = useMemo(() => makeDateNavStyles(colors), [colors]);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');

  const hasTargets = profile?.target_calories != null;
  const isToday = localDateString(selectedDate) === localDateString(new Date());

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    const { data, error } = await getMealLogsForDate(selectedDate);
    if (error) {
      setLogsError("Couldn't load meals for this day. Check your connection and try again.");
    } else {
      setLogs(data || []);
    }
    setLogsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate.getTime()]);

  // Refetches both on tab focus (e.g. after logging a meal from Recipes)
  // and whenever selectedDate changes, since react-navigation calls the
  // effect immediately on identity change while already focused, not just
  // on true focus transitions. The effect callback itself stays sync (fires
  // the async fetch without returning its promise) since useFocusEffect
  // expects undefined or a cleanup function back, not a Promise.
  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs]),
  );

  const totals = useMemo(() => logs.reduce((acc, log) => {
    const s = log.servings_logged;
    acc.calories += log.calories_per_serving * s;
    acc.protein += log.protein_g_per_serving * s;
    acc.carbs += log.carbs_g_per_serving * s;
    acc.fat += log.fat_g_per_serving * s;
    acc.fiber += (log.fiber_g_per_serving || 0) * s;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }), [logs]);

  const goPrevDay = () => { Haptics.selectionAsync(); setSelectedDate((d) => addDays(d, -1)); };
  const goNextDay = () => { if (isToday) return; Haptics.selectionAsync(); setSelectedDate((d) => addDays(d, 1)); };

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap}>
        <View style={common.header}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={common.eyebrow}>PROFILE</Text>
            <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12} accessibilityLabel="Settings">
              <Feather name="settings" size={22} color={colors.inkMuted} />
            </Pressable>
          </View>
          <Text style={common.h1}>Today's progress</Text>
          <Text style={common.tagline}>What you've logged against your daily targets.</Text>
        </View>

        <View style={dateNavStyles.row}>
          <Pressable onPress={goPrevDay} hitSlop={12} style={dateNavStyles.chevron} accessibilityLabel="Previous day">
            <Feather name="chevron-left" size={20} color={colors.ink} />
          </Pressable>
          <Text style={dateNavStyles.label}>{dateLabel(selectedDate)}</Text>
          <Pressable
            onPress={goNextDay}
            hitSlop={12}
            style={[dateNavStyles.chevron, isToday && { opacity: 0.3 }]}
            disabled={isToday}
            accessibilityLabel="Next day"
          >
            <Feather name="chevron-right" size={20} color={colors.ink} />
          </Pressable>
        </View>

        {hasTargets && (
          <>
            <View style={[common.card, { alignItems: 'center', paddingVertical: 24 }]}>
              <MacroRing value={totals.calories} target={profile.target_calories} />
            </View>

            <View style={[common.card, { marginTop: 14 }]}>
              <Text style={common.filterTitle}>Macros</Text>
              <View style={{ marginTop: 8 }}>
                <NutrientProgressBar label="Protein" consumed={totals.protein} target={profile.target_protein_g} color={colors.protein} />
                <NutrientProgressBar label="Carbs" consumed={totals.carbs} target={profile.target_carbs_g} color={colors.carbs} />
                <NutrientProgressBar label="Fat" consumed={totals.fat} target={profile.target_fat_g} color={colors.fat} />
                {profile.target_fiber_g != null && (
                  <NutrientProgressBar label="Fiber" consumed={totals.fiber} target={profile.target_fiber_g} color={colors.fiber} />
                )}
              </View>
            </View>
          </>
        )}

        <View style={{ marginTop: 24 }}>
          <Text style={common.filterTitle}>{isToday ? "Today's meals" : `${dateLabel(selectedDate)}'s meals`}</Text>
          <View style={{ marginTop: 8 }}>
            {logsLoading ? (
              <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />
            ) : logs.length === 0 ? (
              <Text style={dateNavStyles.emptyNote}>Nothing logged {isToday ? 'yet today' : 'this day'} — log a meal from a recipe's "Log this meal" button.</Text>
            ) : (
              logs.map((log) => <MealLogEntry key={log.id} log={log} onChanged={fetchLogs} />)
            )}
            {!!logsError && (
              <View style={common.errorBox}><Text style={common.errorText}>{logsError}</Text></View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeDateNavStyles(colors) { return StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 4, marginBottom: 4 },
  chevron: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: FONTS.displaySemiBold, fontSize: 15, color: colors.ink, minWidth: 90, textAlign: 'center' },
  emptyNote: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: colors.inkMuted, marginTop: 6, lineHeight: 19 },
}); }
