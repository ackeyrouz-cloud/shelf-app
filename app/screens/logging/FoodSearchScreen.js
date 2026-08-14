import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView, StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { searchFoods, foodFromRecentLog } from '../../lib/foodSearch';
import { getRecentFoods, logMeal } from '../../lib/mealLogs';

const DEBOUNCE_MS = 350;

function ResultRow({ colors, styles, food, onPress }) {
  const isCustom = food.source === 'custom';
  return (
    <Pressable onPress={() => onPress(food)} style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={styles.rowName} numberOfLines={1}>{food.name}</Text>
          {isCustom && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>YOURS</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}{Math.round(food.caloriesPer100)} kcal / 100{food.isBeverage ? 'ml' : 'g'}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.inkMuted} />
    </Pressable>
  );
}

function RecentRow({ colors, styles, log, onPress, busy }) {
  const totalCalories = Math.round(log.calories_per_serving * log.servings_logged);
  return (
    <Pressable onPress={() => onPress(log)} style={styles.row} disabled={busy}>
      <View style={styles.recentIcon}>
        <Feather name="clock" size={14} color={colors.inkMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{log.recipe_title}</Text>
        <Text style={styles.rowMeta}>{totalCalories} kcal</Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="plus-circle" size={20} color={colors.success} />}
    </Pressable>
  );
}

export function FoodSearchScreen({ navigation }) {
  const { userId } = useAuth();
  const { colors } = useTheme();
  const common = useCommonStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [sourceStatus, setSourceStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [relogBusyId, setRelogBusyId] = useState(null);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    getRecentFoods().then(({ data }) => {
      setRecent(data);
      setRecentLoading(false);
    });
  }, []);

  const runSearch = useCallback(async (text) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const { results: hits, sources } = await searchFoods(text, { signal: controller.signal });
      setResults(hits);
      setSourceStatus(sources);
    } catch (e) {
      if (e.name === 'AbortError') return; // superseded by a newer keystroke — ignore
      setError('Search failed. Check your connection and try again.');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  const onChangeQuery = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      setError('');
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(text), DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  const openDetail = (food) => {
    Haptics.selectionAsync();
    navigation.navigate('FoodDetail', { food });
  };

  const relogRecent = async (log) => {
    const food = foodFromRecentLog(log);
    if (food) {
      // Has a per-100 base — open the quantity picker pre-filled with what
      // was logged last time, rather than assuming the same amount today.
      Haptics.selectionAsync();
      navigation.navigate('FoodDetail', {
        food, defaultQuantity: log.quantity, defaultUnit: log.quantity_unit,
      });
      return;
    }
    // No base to rescale (a manual entry) — one-tap re-log at the exact same values.
    setRelogBusyId(log.id);
    const { error: logError } = await logMeal({
      userId,
      recipeTitle: log.recipe_title,
      servings: 1,
      macros: {
        calories: log.calories_per_serving,
        proteinG: log.protein_g_per_serving,
        carbsG: log.carbs_g_per_serving,
        fatG: log.fat_g_per_serving,
        fiberG: log.fiber_g_per_serving,
      },
      source: 'manual',
    });
    setRelogBusyId(null);
    if (logError) {
      setError("Couldn't log this meal. Try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.popToTop();
  };

  const showRecent = !query.trim();

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={colors.ink} />
          </Pressable>
          <Text style={[common.h1, { marginTop: 0 }]}>Search foods</Text>
        </View>

        <View style={{ paddingHorizontal: 18, marginTop: 14 }}>
          <View style={styles.searchBar}>
            <Feather name="search" size={17} color={colors.inkMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. Chobani vanilla yogurt"
              placeholderTextColor={colors.inkMuted}
              value={query}
              onChangeText={onChangeQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              accessibilityLabel="Search foods"
            />
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {showRecent ? (
            <View style={{ marginTop: 20 }}>
              <Text style={common.filterTitle}>Recent</Text>
              {recentLoading ? (
                <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />
              ) : recent.length === 0 ? (
                <Text style={styles.emptyNote}>Foods you log outside of a recipe will show up here for quick re-logging.</Text>
              ) : (
                <View style={[common.card, { paddingVertical: 4, marginTop: 8 }]}>
                  {recent.map((log) => (
                    <RecentRow key={log.id} colors={colors} styles={styles} log={log} onPress={relogRecent} busy={relogBusyId === log.id} />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={{ marginTop: 20 }}>
              {!!error && (
                <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
              )}
              {!loading && !error && results.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <Text style={styles.emptyNote}>No results for "{query}".</Text>
                  <Pressable
                    onPress={() => navigation.navigate('LogMeal', { createCustom: true, prefillName: query })}
                    style={styles.customCta}
                  >
                    <Feather name="plus" size={15} color={colors.onFill} />
                    <Text style={styles.customCtaText}>Create a custom food</Text>
                  </Pressable>
                </View>
              )}
              {results.length > 0 && (
                <View style={[common.card, { paddingVertical: 4 }]}>
                  {results.map((food) => (
                    <ResultRow key={food.id} colors={colors} styles={styles} food={food} onPress={openDetail} />
                  ))}
                </View>
              )}
              {results.length > 0 && sourceStatus && (sourceStatus.off === 'error' || sourceStatus.usda === 'error') && (
                <Text style={styles.degradedNote}>
                  {sourceStatus.off === 'error' && sourceStatus.usda === 'error'
                    ? 'Both food databases are having trouble right now — results may be incomplete.'
                    : `${sourceStatus.off === 'error' ? 'Open Food Facts' : 'USDA'} is having trouble right now — results may be incomplete.`}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surfaceRaised, borderRadius: 14, borderCurve: 'continuous',
    paddingHorizontal: 14, minHeight: 48,
  },
  searchInput: { flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 8 },
  recentIcon: {
    width: 28, height: 28, borderRadius: 9, borderCurve: 'continuous',
    backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center',
  },
  rowName: { fontFamily: FONTS.bodyBold, fontSize: 14.5, color: colors.ink, flexShrink: 1 },
  rowMeta: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  customBadge: { backgroundColor: `${colors.premium}22`, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 },
  customBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 8.5, letterSpacing: 0.5, color: colors.premium },
  emptyNote: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: colors.inkMuted, marginTop: 6, lineHeight: 19, textAlign: 'center' },
  degradedNote: { fontFamily: FONTS.bodyRegular, fontSize: 11.5, color: colors.inkMuted, marginTop: 10, textAlign: 'center' },
  customCta: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14,
    backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18,
  },
  customCtaText: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: colors.onFill },
}); }
