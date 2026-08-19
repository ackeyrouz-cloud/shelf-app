import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { localDateString } from '../../lib/mealLogs';
import { weekDates, getMealPlansForWeek, MEAL_SLOTS, MEAL_SLOT_LABELS, logPlannedMeal, removePlannedMeal } from '../../lib/mealPlans';

function dayLabel(date, isToday) {
  return isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' });
}

// Same completeness gate LogMealButton uses — a log missing any of the four
// core macros would violate meal_logs' NOT NULL columns.
function canLog(plan) {
  return plan.calories_per_serving != null && plan.protein_g_per_serving != null
    && plan.carbs_g_per_serving != null && plan.fat_g_per_serving != null;
}

// Rolling 7-day window starting today (see lib/mealPlans.js's weekDates),
// shown as a vertical stack of day cards rather than a one-day-at-a-time
// switcher — the point of a weekly view is seeing the whole week at a
// glance, not stepping through it.
export function WeekPlanScreen({ navigation }) {
  const { userId } = useAuth();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const common = useCommonStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const dates = useMemo(() => weekDates(), []);
  const todayKey = localDateString(new Date());

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingId, setLoggingId] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await getMealPlansForWeek(dates[0]);
    if (fetchError) setError("Couldn't load your plan. Check your connection and try again.");
    else setPlans(data);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(useCallback(() => { fetchPlans(); }, [fetchPlans]));

  const plansByKey = useMemo(() => {
    const map = {};
    for (const p of plans) map[`${p.plan_date}:${p.meal_slot}`] = p;
    return map;
  }, [plans]);

  const dayTotals = useMemo(() => {
    const totals = {};
    for (const d of dates) totals[localDateString(d)] = 0;
    for (const p of plans) {
      if (p.calories_per_serving != null) {
        totals[p.plan_date] = (totals[p.plan_date] || 0) + p.calories_per_serving * (p.servings ?? 1);
      }
    }
    return totals;
  }, [plans, dates]);

  const target = profile?.target_calories;
  const maxTotal = Math.max(target || 0, ...Object.values(dayTotals), 1);

  const handleAssign = (date, slot) => {
    Haptics.selectionAsync();
    navigation.navigate('AssignMeal', { planDate: localDateString(date), mealSlot: slot });
  };

  const handleLog = async (plan) => {
    setLoggingId(plan.id);
    const { data, error: logError } = await logPlannedMeal({ userId, plan });
    setLoggingId(null);
    if (logError) {
      setError("Couldn't log that meal. Try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPlans((prev) => prev.map((p) => (p.id === data.id ? data : p)));
  };

  const handleRemove = async (plan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error: removeError } = await removePlannedMeal(plan.id);
    if (!removeError) setPlans((prev) => prev.filter((p) => p.id !== plan.id));
  };

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap}>
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={common.eyebrow}>MEAL PLAN</Text>
            <Text style={[common.h1, { marginTop: 0 }]}>This week</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('ShoppingList', { weekStartDate: localDateString(dates[0]) })}
            hitSlop={10}
            style={styles.shopBtn}
            accessibilityRole="button"
            accessibilityLabel="Shopping list"
          >
            <Feather name="shopping-cart" size={18} color={colors.onFill} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.success} />
        ) : (
          <>
            {!!target && (
              <View style={[common.card, { marginBottom: 16 }]}>
                <Text style={common.filterTitle}>Planned calories vs. target</Text>
                <View style={styles.chartRow}>
                  {dates.map((d) => {
                    const key = localDateString(d);
                    const total = dayTotals[key] || 0;
                    const isToday = key === todayKey;
                    const heightPct = Math.min(1, total / maxTotal);
                    return (
                      <View key={key} style={styles.chartCol}>
                        <View style={styles.chartTrack}>
                          <View style={[styles.chartFill, { height: `${heightPct * 100}%`, backgroundColor: isToday ? colors.success : `${colors.success}70` }]} />
                        </View>
                        <Text style={[styles.chartLabel, isToday && { color: colors.success, fontFamily: FONTS.bodyBold }]}>
                          {dayLabel(d, isToday).slice(0, 3)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {!!error && <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>}

            {dates.map((date) => {
              const key = localDateString(date);
              const isToday = key === todayKey;
              return (
                <View key={key} style={[common.card, { marginBottom: 14 }, isToday && styles.todayCard]}>
                  <Text style={styles.dayHeading}>
                    {dayLabel(date, isToday)}
                    {!isToday ? ` · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                  </Text>
                  {MEAL_SLOTS.map((slot) => {
                    const plan = plansByKey[`${key}:${slot}`];
                    return (
                      <View key={slot} style={styles.slotRow}>
                        <Text style={styles.slotLabel}>{MEAL_SLOT_LABELS[slot]}</Text>
                        {plan ? (
                          <View style={styles.slotFilled}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.slotTitle} numberOfLines={1}>{plan.recipe_title}</Text>
                              {plan.calories_per_serving != null && (
                                <Text style={styles.slotMeta}>{Math.round(plan.calories_per_serving * (plan.servings ?? 1))} kcal</Text>
                              )}
                            </View>
                            {plan.meal_log_id ? (
                              <View style={styles.loggedBadge}>
                                <Feather name="check" size={12} color={colors.success} />
                                <Text style={styles.loggedText}>Logged</Text>
                              </View>
                            ) : canLog(plan) ? (
                              <Pressable onPress={() => handleLog(plan)} disabled={loggingId === plan.id} style={styles.logBtn}>
                                <Text style={styles.logBtnText}>{loggingId === plan.id ? '…' : 'Log'}</Text>
                              </Pressable>
                            ) : (
                              // Manual entries can be assigned without macros (a placeholder
                              // like "Mom's chili, Tuesday") — logMeal() requires all four,
                              // same gate LogMealButton already uses, so this just can't
                              // convert until it has them.
                              <Text style={styles.noMacrosText}>No nutrition info</Text>
                            )}
                            <Pressable onPress={() => handleRemove(plan)} hitSlop={10} style={{ marginLeft: 8 }} accessibilityLabel={`Remove ${plan.recipe_title}`}>
                              <Feather name="x" size={16} color={colors.inkMuted} />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable onPress={() => handleAssign(date, slot)} style={styles.addSlot} accessibilityLabel={`Add ${MEAL_SLOT_LABELS[slot]}`}>
                            <Feather name="plus" size={14} color={colors.inkMuted} />
                            <Text style={styles.addSlotText}>Add</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  shopBtn: {
    width: 40, height: 40, borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
  },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, height: 74 },
  chartCol: { alignItems: 'center', width: 28, justifyContent: 'flex-end' },
  chartTrack: { width: 14, height: 56, borderRadius: 7, backgroundColor: colors.hairline, justifyContent: 'flex-end', overflow: 'hidden' },
  chartFill: { width: '100%', borderRadius: 7 },
  chartLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 10, color: colors.inkMuted, marginTop: 6 },

  todayCard: { borderColor: colors.success, borderWidth: 1.5 },
  dayHeading: { fontFamily: FONTS.displaySemiBold, fontSize: 15, color: colors.ink, marginBottom: 8 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.hairline,
  },
  slotLabel: {
    width: 66, fontFamily: FONTS.bodyBold, fontSize: 10.5, letterSpacing: 0.4,
    textTransform: 'uppercase', color: colors.inkMuted,
  },
  slotFilled: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  slotTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 13.5, color: colors.ink },
  slotMeta: { fontFamily: FONTS.bodyRegular, fontSize: 11.5, color: colors.inkMuted, marginTop: 1 },
  loggedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.success}22`, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  loggedText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: colors.success },
  logBtn: { backgroundColor: colors.success, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  logBtnText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: colors.onFill },
  noMacrosText: { fontFamily: FONTS.bodyRegular, fontSize: 11, color: colors.inkMuted, fontStyle: 'italic' },
  addSlot: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addSlotText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: colors.inkMuted },
}); }
