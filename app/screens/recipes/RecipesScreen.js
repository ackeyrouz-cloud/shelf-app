import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { FilterBlock } from '../../components/FilterBlock';
import { ChipRow, MultiChipRow } from '../../components/ChipRow';
import { RecipeCard } from '../../components/RecipeCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { usePantry } from '../../context/PantryContext';
import { getAuthHeaders } from '../../lib/supabase';
import { DIETS, DIET_CONFLICTS, TIMES, SERVINGS, dietLabel } from '../../lib/diets';
import { API_BASE_URL, REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE, OVERLOADED_MESSAGE } from '../../lib/config';

// onAssign, when provided, switches every RecipeCard into meal-planning
// picker mode (see RecipeCard.js) — the search/filter/results UI itself is
// otherwise unchanged. Used both as the plain Recipes tab (no onAssign) and
// reused directly inside AssignMealScreen's "Generate recipes" path.
export function RecipesScreen({ navigation, onAssign }) {
  const { pantry } = usePantry();
  const { colors } = useTheme();
  const common = useCommonStyles();

  const [diets, setDiets] = useState(['none']);
  const [time, setTime] = useState('any');
  const [servings, setServings] = useState('2');
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [recipeServings, setRecipeServings] = useState('2');
  const [openIndex, setOpenIndex] = useState(null);
  const [error, setError] = useState('');
  const loadingTimers = useRef([]);

  useEffect(() => () => loadingTimers.current.forEach(clearTimeout), []);

  const toggleDiet = (v) => {
    if (v === 'none') {
      setDiets(['none']);
      setError('');
      return;
    }
    const withoutNone = diets.filter(d => d !== 'none');
    if (withoutNone.includes(v)) {
      const next = withoutNone.filter(d => d !== v);
      setDiets(next.length ? next : ['none']);
      setError('');
      return;
    }
    const conflicts = DIET_CONFLICTS[v] || [];
    const conflicting = withoutNone.filter(d => conflicts.includes(d));
    if (conflicting.length) {
      setDiets([...withoutNone.filter(d => !conflicting.includes(d)), v]);
      setError(`${dietLabel(v)} can't be combined with ${conflicting.map(dietLabel).join(' or ')} — swapped it in.`);
      return;
    }
    setDiets([...withoutNone, v]);
    setError('');
  };

  const findRecipes = async () => {
    if (pantry.length === 0) {
      setError('Add a few ingredients first — even a short list works.');
      return;
    }
    setError('');
    setRecipes([]);
    setLoading(true);
    // Generation realistically takes up to ~90s+ for a large pantry with 5
    // detailed recipes and full nutrition (measured, not guessed) — a static
    // "Looking…" that never changes reads as broken well before the real
    // timeout fires. Deliberately doesn't say "almost there" until genuinely
    // late, since the wait can run past a minute and a premature "almost
    // there" held for 40+ seconds reads as dishonest, not reassuring.
    setLoadingMessage("Looking through what you've got…");
    loadingTimers.current.push(
      setTimeout(() => setLoadingMessage('Still working — writing out full recipes and nutrition info can take a moment…'), 10000),
      setTimeout(() => setLoadingMessage('Detailed recipes with full nutrition take a little longer, especially with a large pantry…'), 30000),
      setTimeout(() => setLoadingMessage("Almost there — this one's taking longer than usual…"), 70000),
    );
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/find-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ pantry: pantry.map(p => p.name), diets, time, mood, servings }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.timeout) {
        setError(TIMEOUT_MESSAGE);
      } else if (data.overloaded) {
        setError(OVERLOADED_MESSAGE);
      } else if (Array.isArray(data.recipes)) {
        setRecipes(data.recipes);
        setRecipeServings(servings);
        if (data.recipes.length === 0) {
          if (data.dietMismatch) {
            const activeDietLabels = diets.filter(d => d !== 'none').map(dietLabel).join(', ');
            setError(`Your pantry doesn't have much that fits ${activeDietLabels}. Try adding more compatible ingredients or loosening your diet filter.`);
          } else if (data.generationFailed) {
            // Distinct from a real filter mismatch — the backend couldn't
            // produce a usable response at all (most often a very large
            // pantry pushing the response past its token budget), which has
            // nothing to do with which filters are selected.
            setError("Recipe generation hit a snag — this can happen with a large pantry list. Try again, or trim a few items and search once more.");
          } else {
            setError('No recipes matched every filter you chose — try loosening one and search again.');
          }
        }
      } else {
        setError('Something went wrong generating recipes. Try again.');
      }
    } catch (e) {
      setError(e.name === 'AbortError' ? TIMEOUT_MESSAGE : 'Could not reach the server. Check your connection and try again.');
    } finally {
      clearTimeout(timeoutId);
      loadingTimers.current.forEach(clearTimeout);
      loadingTimers.current = [];
      setLoading(false);
    }
  };

  // In picker mode (onAssign set), this returns just the scrollable content
  // — AssignMealScreen owns the SafeAreaView/KeyboardAvoidingView/header at
  // that point, so wrapping again here would nest both. The plain Recipes
  // tab usage (no onAssign) is completely unchanged below.
  const content = (
    <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">

          {!onAssign && (
            <>
              <View style={common.header}>
                <Text style={common.eyebrow}>RECIPES</Text>
                <Text style={common.h1}>Find something to cook</Text>
                <Text style={common.tagline}>Set your filters, then find recipes ranked by how little extra shopping they need.</Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('WeekPlan')}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: `${colors.success}18`, borderRadius: 16, borderCurve: 'continuous',
                  padding: 14, marginBottom: 20,
                }}
                accessibilityRole="button"
                accessibilityLabel="Plan my week"
              >
                <Feather name="calendar" size={18} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: colors.ink }}>Plan my week</Text>
                  <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 12, color: colors.inkMuted, marginTop: 1 }}>
                    Assign recipes to days and build a shopping list
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.inkMuted} />
              </Pressable>
            </>
          )}

          <View style={common.card}>
            <FilterBlock title="Diet">
              <MultiChipRow options={DIETS} values={diets} onToggle={toggleDiet} />
            </FilterBlock>
            <FilterBlock title="Servings" style={{ marginTop: 16 }}>
              <ChipRow options={SERVINGS} value={servings} onChange={setServings} />
            </FilterBlock>
            <FilterBlock title="Time" style={{ marginTop: 16 }}>
              <ChipRow options={TIMES} value={time} onChange={setTime} />
            </FilterBlock>
            <FilterBlock title="Mood (optional)" style={{ marginTop: 16 }}>
              <TextInput
                style={common.input}
                placeholder="e.g. cozy, spicy, Italian, quick weeknight"
                placeholderTextColor={colors.inkMuted}
                value={mood}
                onChangeText={setMood}
                accessibilityLabel="Mood or style"
              />
            </FilterBlock>
          </View>

          <PrimaryButton label={loading ? 'Looking…' : 'Find Recipes'} onPress={findRecipes} disabled={loading} />

          {loading && (
            <>
              <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />
              <Text style={[common.tagline, { textAlign: 'center', marginTop: 10 }]}>{loadingMessage}</Text>
            </>
          )}
          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}

          <View style={{ marginTop: 20 }}>
            {recipes.map((r, i) => (
              <Animated.View key={`${r.title}-${i}`} entering={FadeInUp.delay(i * 80).duration(320)}>
                <RecipeCard
                  recipe={r}
                  servings={recipeServings}
                  open={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                  onAssign={onAssign}
                />
              </Animated.View>
            ))}
          </View>
    </ScrollView>
  );

  if (onAssign) return content;

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
