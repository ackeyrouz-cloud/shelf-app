import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import { common } from '../../theme/common';
import { FilterBlock } from '../../components/FilterBlock';
import { ChipRow, MultiChipRow } from '../../components/ChipRow';
import { RecipeCard } from '../../components/RecipeCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { usePantry } from '../../context/PantryContext';
import { DIETS, DIET_CONFLICTS, TIMES, SERVINGS, dietLabel } from '../../lib/diets';
import { API_BASE_URL, REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE, OVERLOADED_MESSAGE } from '../../lib/config';

export function RecipesScreen() {
  const { pantry } = usePantry();

  const [diets, setDiets] = useState(['none']);
  const [time, setTime] = useState('any');
  const [servings, setServings] = useState('2');
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipeServings, setRecipeServings] = useState('2');
  const [openIndex, setOpenIndex] = useState(null);
  const [error, setError] = useState('');

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE_URL}/find-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">

          <View style={common.header}>
            <Text style={common.eyebrow}>RECIPES</Text>
            <Text style={common.h1}>Find something to cook</Text>
            <Text style={common.tagline}>Set your filters, then find recipes ranked by how little extra shopping they need.</Text>
          </View>

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
                placeholderTextColor={COLORS.inkMuted}
                value={mood}
                onChangeText={setMood}
                accessibilityLabel="Mood or style"
              />
            </FilterBlock>
          </View>

          <PrimaryButton label={loading ? 'Looking…' : 'Find Recipes'} onPress={findRecipes} disabled={loading} />

          {loading && <ActivityIndicator style={{ marginTop: 14 }} color={COLORS.primary} />}
          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}

          <View style={{ marginTop: 20 }}>
            {recipes.map((r, i) => (
              <RecipeCard
                key={`${r.title}-${i}`}
                recipe={r}
                servings={recipeServings}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
