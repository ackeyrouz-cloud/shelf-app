import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform, KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './lib/supabase';
import { useFonts, SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { WorkSans_400Regular, WorkSans_600SemiBold, WorkSans_700Bold } from '@expo-google-fonts/work-sans';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

// Point this at your deployed backend (see server/README.md).
// Never call the Anthropic API directly from the app — the key must stay server-side.
const API_BASE_URL = 'https://shelf-backend-97bp.onrender.com';
// Longer than the server's own 45s Anthropic timeout, so a graceful timeout response
// from the server has time to arrive before the client gives up on its own.
const REQUEST_TIMEOUT_MS = 55000;
const TIMEOUT_MESSAGE = 'This is taking longer than expected — please try again.';
const OVERLOADED_MESSAGE = 'The recipe service is briefly overloaded — please try again in a moment.';

const COLORS = {
  kraft: '#E7DEC6',
  cream: '#F6F1E3',
  ink: '#262922',
  inkMuted: '#5F6256',
  red: '#C1442A',
  redDark: '#7a2a17',
  forest: '#2F4A3C',
  gold: '#D8A23A',
  white: '#FFFFFF',
  hairline: 'rgba(38,41,34,0.18)',
};

const DIETS = [
  { v: 'none', label: 'No restriction' },
  { v: 'vegetarian', label: 'Vegetarian' },
  { v: 'vegan', label: 'Vegan' },
  { v: 'pescatarian', label: 'Pescatarian' },
  { v: 'gluten-free', label: 'Gluten-free' },
  { v: 'dairy-free', label: 'Dairy-free' },
  { v: 'nut-free', label: 'Nut-free' },
  { v: 'keto', label: 'Keto' },
  { v: 'low-carb', label: 'Low-carb' },
  { v: 'paleo', label: 'Paleo' },
  { v: 'high-protein', label: 'High-protein' },
  { v: 'halal', label: 'Halal' },
];
// Diets that are logically incompatible — e.g. pescatarian (eats fish) directly
// contradicts vegan/vegetarian (no fish). Not an exhaustive nutrition-logic matrix —
// just the unambiguous cases where two selections can't both be true at once.
const DIET_CONFLICTS = {
  vegan: ['pescatarian'],
  vegetarian: ['pescatarian'],
  pescatarian: ['vegan', 'vegetarian'],
};
const dietLabel = (v) => (DIETS.find(d => d.v === v) || {}).label || v;

// Case-insensitively filters candidate names down to ones not already in the pantry
// (and not duplicated within the candidates themselves). Shared by addFromText and
// the photo-scan merge, since both need the same "is this already here" rule.
function dedupeNewItems(candidates, existingPantry) {
  const existingLower = existingPantry.map(p => p.name.toLowerCase());
  const result = [];
  candidates.forEach(raw => {
    const name = String(raw).trim();
    if (!name) return;
    const lower = name.toLowerCase();
    if (existingLower.includes(lower)) return;
    if (result.some(n => n.toLowerCase() === lower)) return;
    result.push(name);
  });
  return result;
}

const TIMES = [
  { v: 'any', label: 'Any' },
  { v: '15', label: 'Under 15 min' },
  { v: '30', label: 'Under 30 min' },
  { v: '60', label: 'Under 1 hour' },
];
const SERVINGS = [
  { v: '1', label: '1' },
  { v: '2', label: '2' },
  { v: '4', label: '4' },
  { v: '6+', label: '6+' },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    SpecialElite_400Regular,
    WorkSans_400Regular,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  // undefined = session not checked yet, null = signed out, object = signed in
  const [session, setSession] = useState(undefined);
  const userId = session?.user?.id;

  // pantry items are { id, name } — id is the pantry_items row id, needed for delete
  const [pantry, setPantry] = useState([]);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [pantryBusy, setPantryBusy] = useState(false);
  const [pantryError, setPantryError] = useState('');
  const [inputText, setInputText] = useState('');
  const [diets, setDiets] = useState(['none']);
  const [time, setTime] = useState('any');
  const [servings, setServings] = useState('2');
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipeServings, setRecipeServings] = useState('2');
  const [openIndex, setOpenIndex] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setPantry([]);
    setPantryError('');
    setPantryLoading(true);
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('pantry_items')
        .select('id, name')
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (fetchError) {
        setPantryError("Couldn't load your pantry. Check your connection and try again.");
      } else {
        setPantry(data || []);
      }
      setPantryLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const addFromText = async () => {
    if (!inputText.trim() || pantryBusy) return;
    const parts = inputText.split(',').map(s => s.trim()).filter(Boolean);
    const newNames = dedupeNewItems(parts, pantry);
    if (newNames.length === 0) {
      setInputText('');
      return;
    }
    setPantryError('');
    setPantryBusy(true);
    const { data, error: insertError } = await supabase
      .from('pantry_items')
      .insert(newNames.map(name => ({ user_id: userId, name })))
      .select('id, name');
    if (insertError) {
      setPantryError("Couldn't add that to your pantry. Check your connection and try again.");
    } else {
      setPantry(prev => [...prev, ...(data || [])]);
      setInputText('');
    }
    setPantryBusy(false);
  };

  const removeItem = async (id) => {
    if (pantryBusy) return;
    setPantryError('');
    setPantryBusy(true);
    const { error: deleteError } = await supabase.from('pantry_items').delete().eq('id', id);
    if (deleteError) {
      setPantryError("Couldn't remove that item. Check your connection and try again.");
    } else {
      setPantry(prev => prev.filter(p => p.id !== id));
    }
    setPantryBusy(false);
  };

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

  const pickPhoto = async () => {
    setError('');
    let timeoutId;
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera access needed', 'Enable camera access in Settings to scan your shelf.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.6,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];

      setPhotoLoading(true);
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(`${API_BASE_URL}/identify-ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: asset.base64, mediaType: 'image/jpeg' }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.timeout) {
        setError(TIMEOUT_MESSAGE);
      } else if (data.overloaded) {
        setError(OVERLOADED_MESSAGE);
      } else if (data.notFood) {
        setError("That doesn't look like food — try another photo.");
      } else if (Array.isArray(data.items) && data.items.length) {
        const newNames = dedupeNewItems(data.items, pantry);
        if (newNames.length > 0) {
          const { data: inserted, error: insertError } = await supabase
            .from('pantry_items')
            .insert(newNames.map(name => ({ user_id: userId, name })))
            .select('id, name');
          if (insertError) {
            setError("Identified items, but couldn't save them to your pantry. Try again.");
          } else {
            setPantry(prev => [...prev, ...(inserted || [])]);
          }
        }
      } else {
        setError("Couldn't identify anything in that photo — try typing instead.");
      }
    } catch (e) {
      setError(e.name === 'AbortError' ? TIMEOUT_MESSAGE : 'Photo reading failed. Check your connection and try again.');
    } finally {
      clearTimeout(timeoutId);
      setPhotoLoading(false);
    }
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

  if (!fontsLoaded || session === undefined) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.red} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <View style={styles.stamp}><Text style={styles.stampText}>USE WHAT YOU HAVE</Text></View>
            <Text style={styles.h1}>Shelf</Text>
            <Text style={styles.tagline}>Tell it what's in your fridge and pantry. It finds recipes that need the least extra shopping.</Text>
          </View>

          <SectionLabel text="Your shelf" />
          <View style={styles.card}>
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. chicken thighs, rice, half an onion"
                placeholderTextColor={COLORS.inkMuted}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={addFromText}
                returnKeyType="done"
                maxLength={120}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addFromText} disabled={pantryBusy}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} disabled={photoLoading}>
              {photoLoading
                ? <ActivityIndicator color={COLORS.ink} />
                : <Text style={styles.photoBtnText}>Or snap a photo of your shelf</Text>}
            </TouchableOpacity>

            {pantryLoading ? (
              <ActivityIndicator style={{ marginTop: 14 }} color={COLORS.red} />
            ) : (
              <>
                <View style={styles.tags}>
                  {pantry.map((item) => (
                    <View key={item.id} style={styles.tag}>
                      <Text style={styles.tagText}>{item.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeItem(item.id)}
                        disabled={pantryBusy}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.tagRemoveHit}
                      >
                        <Text style={styles.tagRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                {pantry.length === 0 && <Text style={styles.emptyNote}>Nothing added yet — start typing above.</Text>}
              </>
            )}
            {!!pantryError && (
              <View style={styles.errorBox}><Text style={styles.errorText}>{pantryError}</Text></View>
            )}
          </View>

          <SectionLabel text="Filters" />
          <View style={styles.card}>
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
                style={styles.input}
                placeholder="e.g. cozy, spicy, Italian, quick weeknight"
                placeholderTextColor={COLORS.inkMuted}
                value={mood}
                onChangeText={setMood}
              />
            </FilterBlock>
          </View>

          <TouchableOpacity style={styles.cta} onPress={findRecipes} disabled={loading}>
            <Text style={styles.ctaText}>{loading ? 'Looking…' : 'Find recipes'}</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator style={{ marginTop: 14 }} color={COLORS.red} />}
          {!!error && (
            <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
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

          <Text style={styles.footer}>SHELF · COOK FROM WHAT'S ALREADY THERE</Text>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={styles.expandHint}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) {
          setError(signUpError.message);
        } else if (!data.session) {
          // No session back means email confirmation is required before sign-in works.
          // If confirmation is off, data.session is already set and onAuthStateChange
          // will transition straight into the app — no message needed.
          setMessage('Check your email to confirm your account, then sign in.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) setError(signInError.message);
      }
    } catch (e) {
      setError('Something went wrong. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.wrap, { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.stamp}><Text style={styles.stampText}>USE WHAT YOU HAVE</Text></View>
            <Text style={styles.h1}>Shelf</Text>
            <Text style={styles.tagline}>
              {mode === 'signup' ? 'Create an account to save your pantry and preferences.' : 'Sign in to pick up where you left off.'}
            </Text>
          </View>

          <View style={styles.card}>
            <FilterBlock title="Email">
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.inkMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </FilterBlock>
            <FilterBlock title="Password" style={{ marginTop: 16 }}>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.inkMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </FilterBlock>
          </View>

          <TouchableOpacity style={styles.cta} onPress={submit} disabled={loading}>
            <Text style={styles.ctaText}>{loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator style={{ marginTop: 14 }} color={COLORS.red} />}
          {!!error && (
            <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
          )}
          {!!message && (
            <View style={styles.errorBox}><Text style={styles.errorText}>{message}</Text></View>
          )}

          <TouchableOpacity
            style={{ marginTop: 20, alignItems: 'center' }}
            onPress={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage(''); }}
          >
            <Text style={styles.expandHint}>
              {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionLabel({ text }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabelText}>{text}</Text>
      <View style={styles.sectionLabelLine} />
    </View>
  );
}

function FilterBlock({ title, children, style }) {
  return (
    <View style={style}>
      <Text style={styles.filterTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChipRow({ options, value, onChange }) {
  return (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const active = value === opt.v;
        return (
          <TouchableOpacity
            key={opt.v}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt.v)}
          >
            <View style={[styles.chipCheck, active && styles.chipCheckActive]} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChipRow({ options, values, onToggle }) {
  return (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const active = values.includes(opt.v);
        return (
          <TouchableOpacity
            key={opt.v}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(opt.v)}
          >
            <View style={[styles.chipCheck, active && styles.chipCheckActive]} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function RecipeCard({ recipe, servings, open, onToggle }) {
  const missing = recipe.missing || [];
  const usesFromShelf = recipe.usesFromShelf || [];
  const totalRelevant = usesFromShelf.length + missing.length;
  const ready = missing.length === 0;
  const [checked, setChecked] = useState({});
  const toggleIngredient = (i) => setChecked(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onToggle} style={[styles.recipe, !ready && styles.recipeNeedsBuy]}>
      <View style={styles.recipeTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.recipeMeta}>{recipe.time} · {recipe.difficulty} · Serves {servings}</Text>
        </View>
        <View style={[styles.matchBadge, !ready && styles.matchBadgePartial]}>
          <Text style={[styles.matchBadgeText, !ready && styles.matchBadgeTextPartial]}>
            {ready ? 'Ready now' : `Needs ${missing.length} item${missing.length > 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      {totalRelevant > 0 && (
        <Text style={styles.usesLine}>Uses {usesFromShelf.length} of {totalRelevant} ingredients you have</Text>
      )}

      {!ready && (
        <Text style={styles.missingLine}>Pick up: <Text style={{ fontWeight: '700', color: COLORS.red }}>{missing.join(', ')}</Text></Text>
      )}

      <Text style={styles.expandHint}>{open ? 'Tap to collapse ▴' : 'Tap for full recipe ▾'}</Text>

      {open && (
        <View style={styles.recipeDetail}>
          <Text style={styles.detailHeading}>Ingredients</Text>
          {(recipe.ingredients || []).map((ing, i) => (
            <TouchableOpacity
              key={i}
              style={styles.ingredientRow}
              activeOpacity={0.6}
              onPress={() => toggleIngredient(i)}
            >
              <View style={[styles.ingredientCheck, checked[i] && styles.ingredientCheckActive]} />
              <Text style={[styles.ingredientText, checked[i] && styles.ingredientTextChecked]}>{ing}</Text>
            </TouchableOpacity>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.kraft },
  wrap: { paddingHorizontal: 18, paddingBottom: 60 },
  header: { paddingTop: 24, paddingBottom: 12 },
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: 2, borderColor: COLORS.red, borderRadius: 2,
    paddingHorizontal: 10, paddingVertical: 3, transform: [{ rotate: '-2deg' }],
  },
  stampText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, letterSpacing: 2, color: COLORS.red },
  h1: { fontFamily: 'SpecialElite_400Regular', fontSize: 42, color: COLORS.ink, marginTop: 12 },
  tagline: { fontFamily: 'WorkSans_400Regular', fontSize: 15, color: COLORS.inkMuted, marginTop: 6, lineHeight: 21 },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 12, gap: 10 },
  sectionLabelText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, letterSpacing: 2, color: COLORS.forest, textTransform: 'uppercase' },
  sectionLabelLine: { flex: 1, height: 1, backgroundColor: COLORS.hairline },

  card: { backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.hairline, borderRadius: 3, padding: 16 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, fontFamily: 'WorkSans_400Regular', fontSize: 15, paddingVertical: 12, paddingHorizontal: 14,
    minHeight: 44,
    borderWidth: 1.5, borderColor: COLORS.hairline, borderRadius: 3, backgroundColor: COLORS.white, color: COLORS.ink,
  },
  addBtn: { backgroundColor: COLORS.forest, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', borderRadius: 3 },
  addBtnText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 15, color: COLORS.cream },

  photoBtn: {
    marginTop: 12, borderWidth: 1.5, borderColor: 'rgba(38,41,34,0.25)', borderStyle: 'dashed',
    borderRadius: 3, paddingVertical: 13, minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  photoBtnText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 11.5, letterSpacing: 1,
    textTransform: 'uppercase', color: COLORS.ink,
  },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.hairline, borderRadius: 2, paddingVertical: 6, paddingHorizontal: 10,
  },
  tagText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: COLORS.ink },
  tagRemoveHit: { minWidth: 20, minHeight: 20, alignItems: 'center', justifyContent: 'center' },
  tagRemove: { color: COLORS.red, fontWeight: '700' },
  emptyNote: { fontFamily: 'WorkSans_400Regular', fontStyle: 'italic', fontSize: 13, color: COLORS.inkMuted, marginTop: 14 },

  filterTitle: { fontFamily: 'WorkSans_600SemiBold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.forest, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44,
    borderWidth: 1.5, borderColor: COLORS.hairline, borderRadius: 2,
    paddingVertical: 11, paddingHorizontal: 12, backgroundColor: COLORS.cream,
  },
  chipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipCheck: { width: 10, height: 10, borderWidth: 1.5, borderColor: COLORS.ink, borderRadius: 1 },
  chipCheckActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { fontFamily: 'WorkSans_400Regular', fontSize: 12, color: COLORS.ink },
  chipTextActive: { fontFamily: 'WorkSans_600SemiBold', color: COLORS.cream },

  cta: { marginTop: 24, backgroundColor: COLORS.red, borderRadius: 3, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: 'SpecialElite_400Regular', fontSize: 17, letterSpacing: 1, color: COLORS.cream, textTransform: 'uppercase' },

  errorBox: { marginTop: 16, backgroundColor: '#fbe9e5', borderWidth: 1, borderColor: COLORS.red, borderRadius: 3, padding: 12 },
  errorText: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: COLORS.redDark },

  recipe: { backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.hairline, borderLeftWidth: 4, borderLeftColor: COLORS.forest, borderRadius: 3, padding: 16, marginBottom: 12 },
  recipeNeedsBuy: { borderLeftColor: COLORS.gold },
  recipeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  recipeTitle: { fontFamily: 'SpecialElite_400Regular', fontSize: 19, color: COLORS.ink },
  recipeMeta: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: COLORS.inkMuted, marginTop: 4, textTransform: 'uppercase' },
  matchBadge: { backgroundColor: COLORS.forest, borderRadius: 2, paddingVertical: 5, paddingHorizontal: 9 },
  matchBadgePartial: { backgroundColor: COLORS.gold },
  matchBadgeText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, letterSpacing: 0.3, color: COLORS.cream },
  matchBadgeTextPartial: { color: COLORS.ink },
  usesLine: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: COLORS.inkMuted, marginTop: 10 },
  missingLine: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: 'rgba(38,41,34,0.75)', marginTop: 10 },
  expandHint: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: COLORS.inkMuted, marginTop: 8 },
  recipeDetail: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.hairline, borderStyle: 'dashed' },
  detailHeading: { fontFamily: 'WorkSans_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.forest, marginBottom: 8 },

  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3, marginBottom: 6 },
  ingredientCheck: { width: 14, height: 14, borderWidth: 1.5, borderColor: COLORS.ink, borderRadius: 2, backgroundColor: COLORS.cream },
  ingredientCheckActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  ingredientText: { flex: 1, fontFamily: 'WorkSans_400Regular', fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  ingredientTextChecked: { color: COLORS.inkMuted, textDecorationLine: 'line-through' },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  stepNumber: { width: 20, height: 20, marginTop: 1, borderWidth: 1.5, borderColor: COLORS.forest, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, color: COLORS.forest },
  stepText: { flex: 1, fontFamily: 'WorkSans_400Regular', fontSize: 14, color: COLORS.ink, lineHeight: 21 },

  footer: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: COLORS.inkMuted, textAlign: 'center', marginTop: 32, letterSpacing: 0.5 },
});
