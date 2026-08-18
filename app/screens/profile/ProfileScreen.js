import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { MacroRing } from '../../components/MacroRing';
import { NutrientProgressBar } from '../../components/NutrientProgressBar';
import { MealLogEntry } from '../../components/MealLogEntry';
import { useProfile } from '../../context/ProfileContext';
import { getMealLogsForDate, localDateString } from '../../lib/mealLogs';
import {
  getWaterUnitSystem, quickAddAmounts, mlToDisplay, displayToMl, displayUnitLabel,
  getWaterForDate, addWater, resetWaterForDate,
} from '../../lib/water';
import { getLoggingStreak } from '../../lib/streak';

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

  const [waterMl, setWaterMl] = useState(0);
  const [waterLoading, setWaterLoading] = useState(true);
  const [waterBusy, setWaterBusy] = useState(false);
  const [customWaterOpen, setCustomWaterOpen] = useState(false);
  const [customWaterText, setCustomWaterText] = useState('');

  const [streak, setStreak] = useState(0);

  // Restrained target-hit celebration: a haptic + a brief scale pulse on
  // the ring/bar itself, once per (metric, day) — not confetti, not a
  // full-screen takeover. Each ref holds the date string it was last
  // celebrated for for that metric, so "already celebrated today" survives
  // re-renders/refocuses without needing to persist anything, and a new
  // day (a different date string) naturally allows it to fire again.
  const caloriesCelebratedForRef = useRef(null);
  const waterCelebratedForRef = useRef(null);
  const caloriesPulse = useSharedValue(1);
  const waterPulse = useSharedValue(1);
  const caloriesPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: caloriesPulse.value }] }));
  const waterPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: waterPulse.value }] }));

  const hasTargets = profile?.target_calories != null;
  const isToday = localDateString(selectedDate) === localDateString(new Date());
  const unitSystem = useMemo(() => getWaterUnitSystem(), []);
  const waterQuickAdds = useMemo(() => quickAddAmounts(unitSystem), [unitSystem]);
  const waterTargetMl = profile?.target_water_ml ?? 2000;

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

  const fetchWater = useCallback(async () => {
    setWaterLoading(true);
    const { amountMl } = await getWaterForDate(selectedDate);
    setWaterMl(amountMl);
    setWaterLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate.getTime()]);

  // The streak reflects real-world "today", not whichever day is currently
  // selected in the date-nav — refetched on focus only, not on date change.
  const fetchStreak = useCallback(async () => {
    const { streak: value } = await getLoggingStreak();
    setStreak(value);
  }, []);

  // Refetches both on tab focus (e.g. after logging a meal from Recipes)
  // and whenever selectedDate changes, since react-navigation calls the
  // effect immediately on identity change while already focused, not just
  // on true focus transitions. The effect callback itself stays sync (fires
  // the async fetch without returning its promise) since useFocusEffect
  // expects undefined or a cleanup function back, not a Promise.
  useFocusEffect(
    useCallback(() => {
      fetchLogs();
      fetchWater();
      fetchStreak();
    }, [fetchLogs, fetchWater, fetchStreak]),
  );

  const applyWaterAdd = async (ml) => {
    Haptics.selectionAsync();
    setWaterBusy(true);
    const { amountMl, error } = await addWater(ml, selectedDate);
    setWaterBusy(false);
    if (error) {
      Alert.alert("Couldn't log that", 'Check your connection and try again.');
      return;
    }
    setWaterMl(amountMl);
  };

  const submitCustomWater = () => {
    const amount = parseFloat(customWaterText);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setCustomWaterOpen(false);
    setCustomWaterText('');
    applyWaterAdd(displayToMl(amount, unitSystem));
  };

  const confirmResetWater = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Reset today's water?",
      'This clears today\'s water total back to 0.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setWaterBusy(true);
            await resetWaterForDate(selectedDate);
            setWaterMl(0);
            setWaterBusy(false);
          },
        },
      ],
    );
  };

  const totals = useMemo(() => logs.reduce((acc, log) => {
    const s = log.servings_logged;
    acc.calories += log.calories_per_serving * s;
    acc.protein += log.protein_g_per_serving * s;
    acc.carbs += log.carbs_g_per_serving * s;
    acc.fat += log.fat_g_per_serving * s;
    acc.fiber += (log.fiber_g_per_serving || 0) * s;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }), [logs]);

  useEffect(() => {
    if (!isToday || !hasTargets) return;
    const dateStr = localDateString(selectedDate);
    if (totals.calories >= profile.target_calories && caloriesCelebratedForRef.current !== dateStr) {
      caloriesCelebratedForRef.current = dateStr;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      caloriesPulse.value = withSequence(withTiming(1.06, { duration: 180 }), withTiming(1, { duration: 220 }));
    }
  }, [totals.calories, isToday, hasTargets, profile?.target_calories, selectedDate]);

  useEffect(() => {
    if (!isToday) return;
    const dateStr = localDateString(selectedDate);
    if (waterMl > 0 && waterMl >= waterTargetMl && waterCelebratedForRef.current !== dateStr) {
      waterCelebratedForRef.current = dateStr;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      waterPulse.value = withSequence(withTiming(1.06, { duration: 180 }), withTiming(1, { duration: 220 }));
    }
  }, [waterMl, isToday, waterTargetMl, selectedDate]);

  const goPrevDay = () => { Haptics.selectionAsync(); setSelectedDate((d) => addDays(d, -1)); };
  const goNextDay = () => { if (isToday) return; Haptics.selectionAsync(); setSelectedDate((d) => addDays(d, 1)); };

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap}>
        <View style={common.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={dateNavStyles.headerRow}>
              <View style={dateNavStyles.headerIcon}>
                <Feather name="bar-chart-2" size={16} color={colors.fat} />
              </View>
              <Text style={common.eyebrow}>PROFILE</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12} accessibilityLabel="Settings">
              <Feather name="settings" size={22} color={colors.inkMuted} />
            </Pressable>
          </View>
          <Text style={common.h1}>Today's progress</Text>
          <Text style={common.tagline}>What you've logged against your daily targets.</Text>
          {streak > 0 && (
            <View style={dateNavStyles.streakPill}>
              <MaterialCommunityIcons name="fire" size={14} color={colors.premium} />
              <Text style={dateNavStyles.streakPillText}>{streak}-day streak</Text>
            </View>
          )}
        </View>

        <View style={dateNavStyles.pill}>
          <Pressable onPress={goPrevDay} hitSlop={12} style={dateNavStyles.chevron} accessibilityLabel="Previous day">
            <Feather name="chevron-left" size={18} color={colors.fat} />
          </Pressable>
          <Text style={dateNavStyles.label}>{dateLabel(selectedDate)}</Text>
          <Pressable
            onPress={goNextDay}
            hitSlop={12}
            style={[dateNavStyles.chevron, isToday && { opacity: 0.3 }]}
            disabled={isToday}
            accessibilityLabel="Next day"
          >
            <Feather name="chevron-right" size={18} color={colors.fat} />
          </Pressable>
        </View>

        {hasTargets && (
          <>
            <View style={[common.card, { alignItems: 'center', paddingVertical: 24 }]}>
              <Animated.View style={caloriesPulseStyle}>
                <MacroRing value={totals.calories} target={profile.target_calories} />
              </Animated.View>
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

        <View style={[common.card, { marginTop: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={dateNavStyles.waterIcon}>
                <Feather name="droplet" size={13} color={colors.water} />
              </View>
              <Text style={dateNavStyles.waterLabel}>Water</Text>
            </View>
            {isToday && waterMl > 0 && (
              <Pressable onPress={confirmResetWater} disabled={waterBusy} hitSlop={10}>
                <Text style={dateNavStyles.waterResetText}>Reset</Text>
              </Pressable>
            )}
          </View>

          {waterLoading ? (
            <ActivityIndicator style={{ marginTop: 14 }} color={colors.water} />
          ) : (
            <>
              <Animated.View style={[{ marginTop: 4 }, waterPulseStyle]}>
                <NutrientProgressBar
                  label="Today"
                  consumed={mlToDisplay(waterMl, unitSystem)}
                  target={mlToDisplay(waterTargetMl, unitSystem)}
                  unit={unitSystem === 'imperial' ? ' fl oz' : 'ml'}
                  color={colors.water}
                />
              </Animated.View>

              {isToday && (
                <View style={{ marginTop: 4 }}>
                  <View style={dateNavStyles.waterPillRow}>
                    {waterQuickAdds.map((opt) => (
                      <Pressable
                        key={opt.label}
                        onPress={() => applyWaterAdd(opt.ml)}
                        disabled={waterBusy}
                        style={[dateNavStyles.waterPill, waterBusy && { opacity: 0.5 }]}
                      >
                        <Feather name="plus" size={12} color={colors.water} />
                        <Text style={dateNavStyles.waterPillText}>{opt.label}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setCustomWaterOpen((v) => !v)}
                      disabled={waterBusy}
                      style={[dateNavStyles.waterPill, customWaterOpen && { backgroundColor: `${colors.water}33` }]}
                    >
                      <Text style={dateNavStyles.waterPillText}>Custom</Text>
                    </Pressable>
                  </View>

                  {customWaterOpen && (
                    <View style={dateNavStyles.waterCustomRow}>
                      <TextInput
                        style={[common.input, { flex: 1 }]}
                        placeholder={displayUnitLabel(unitSystem)}
                        placeholderTextColor={colors.inkMuted}
                        keyboardType="decimal-pad"
                        value={customWaterText}
                        onChangeText={setCustomWaterText}
                        autoFocus
                        onSubmitEditing={submitCustomWater}
                        returnKeyType="done"
                        accessibilityLabel={`Custom water amount in ${displayUnitLabel(unitSystem)}`}
                      />
                      <Pressable onPress={submitCustomWater} style={dateNavStyles.waterCustomSubmit} accessibilityLabel="Add custom amount">
                        <Feather name="check" size={18} color={colors.onFill} />
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={common.filterTitle}>{isToday ? "Today's meals" : `${dateLabel(selectedDate)}'s meals`}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!logsLoading && logs.length > 0 && (
                <View style={dateNavStyles.countPill}>
                  <Text style={dateNavStyles.countPillText}>{logs.length}</Text>
                  <Text style={dateNavStyles.countPillLabel}>LOGGED</Text>
                </View>
              )}
              <Pressable
                onPress={() => navigation.navigate('LogMealMethod')}
                hitSlop={10}
                style={dateNavStyles.addBtn}
                accessibilityRole="button"
                accessibilityLabel="Log a meal"
              >
                <Feather name="plus" size={20} color={colors.onFill} />
              </Pressable>
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            {logsLoading ? (
              <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />
            ) : logs.length === 0 ? (
              <Text style={dateNavStyles.emptyNote}>Nothing logged {isToday ? 'yet today' : 'this day'} — log a meal from a recipe's "Log this meal" button, or search or type one in with the + above.</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: {
    width: 30, height: 30, borderRadius: 10, borderCurve: 'continuous',
    backgroundColor: `${colors.fat}22`, alignItems: 'center', justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20,
    alignSelf: 'center', backgroundColor: colors.surfaceRaised, borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 10, marginTop: 4, marginBottom: 4,
  },
  chevron: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: FONTS.displaySemiBold, fontSize: 15, color: colors.ink, minWidth: 90, textAlign: 'center' },
  emptyNote: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: colors.inkMuted, marginTop: 6, lineHeight: 19 },
  countPill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    backgroundColor: `${colors.fat}22`, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11,
  },
  countPillText: { fontFamily: FONTS.displaySemiBold, fontSize: 13, color: colors.fat },
  countPillLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5, color: colors.fat },
  addBtn: {
    width: 36, height: 36, borderRadius: 12, borderCurve: 'continuous',
    backgroundColor: colors.fat, alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 3px 8px ${colors.fat}55`,
  },
  waterIcon: {
    width: 22, height: 22, borderRadius: 8, borderCurve: 'continuous',
    backgroundColor: `${colors.water}22`, alignItems: 'center', justifyContent: 'center',
  },
  waterLabel: { fontFamily: FONTS.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: colors.inkMuted },
  waterResetText: { fontFamily: FONTS.bodySemiBold, fontSize: 12.5, color: colors.destructive },
  waterPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  waterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36,
    borderRadius: 999, borderCurve: 'continuous', backgroundColor: `${colors.water}18`,
    paddingHorizontal: 13,
  },
  waterPillText: { fontFamily: FONTS.bodyBold, fontSize: 12.5, color: colors.water },
  waterCustomRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  waterCustomSubmit: {
    width: 48, height: 48, borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.water, alignItems: 'center', justifyContent: 'center',
  },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: `${colors.premium}1A`, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, marginTop: 10,
  },
  streakPillText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: colors.premium },
}); }
