import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Image, Platform, KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFonts, SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { WorkSans_400Regular, WorkSans_600SemiBold, WorkSans_700Bold } from '@expo-google-fonts/work-sans';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

// Point this at your deployed backend (see server/README.md).
// Never call the Anthropic API directly from the app — the key must stay server-side.
const API_BASE_URL = 'https://shelf-backend-97bp.onrender.com';

const STORAGE_KEY = 'shelf-pantry-items';
const DIETS = [
  { v: 'none', label: 'No restriction' },
  { v: 'vegetarian', label: 'Vegetarian' },
  { v: 'vegan', label: 'Vegan' },
  { v: 'gluten-free', label: 'Gluten-free' },
  { v: 'dairy-free', label: 'Dairy-free' },
];
const TIMES = [
  { v: 'any', label: 'Any' },
  { v: '15', label: 'Under 15 min' },
  { v: '30', label: 'Under 30 min' },
  { v: '60', label: 'Under 1 hour' },
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

  const [pantry, setPantry] = useState([]);
  const [inputText, setInputText] = useState('');
  const [diet, setDiet] = useState('none');
  const [time, setTime] = useState('any');
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPantry(JSON.parse(raw));
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const savePantry = useCallback(async (items) => {
    setPantry(items);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) { /* ignore */ }
  }, []);

  const addFromText = () => {
    if (!inputText.trim()) return;
    const parts = inputText.split(',').map(s => s.trim()).filter(Boolean);
    const next = [...pantry];
    parts.forEach(p => {
      if (!next.some(x => x.toLowerCase() === p.toLowerCase())) next.push(p);
    });
    savePantry(next);
    setInputText('');
  };

  const removeItem = (idx) => {
    const next = pantry.filter((_, i) => i !== idx);
    savePantry(next);
  };

  const pickPhoto = async () => {
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
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/identify-ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: asset.base64, mediaType: 'image/jpeg' }),
      });
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length) {
        const next = [...pantry];
        data.items.forEach(it => {
          if (!next.some(x => x.toLowerCase() === String(it).toLowerCase())) next.push(it);
        });
        savePantry(next);
      } else {
        setError("Couldn't identify anything in that photo — try typing instead.");
      }
    } catch (e) {
      setError('Photo reading failed. Check your connection and try again.');
    }
    setPhotoLoading(false);
  };

  const findRecipes = async () => {
    if (pantry.length === 0) {
      setError('Add a few ingredients first — even a short list works.');
      return;
    }
    setError('');
    setRecipes([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/find-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pantry, diet, time, mood }),
      });
      const data = await res.json();
      if (Array.isArray(data.recipes)) {
        setRecipes(data.recipes);
      } else {
        setError('Something went wrong generating recipes. Try again.');
      }
    } catch (e) {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setLoading(false);
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#C1442A" />
      </SafeAreaView>
    );
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
                placeholderTextColor="rgba(38,41,34,0.4)"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={addFromText}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addBtn} onPress={addFromText}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} disabled={photoLoading}>
              {photoLoading
                ? <ActivityIndicator color="#262922" />
                : <Text style={styles.photoBtnText}>📷  Or snap a photo of your shelf</Text>}
            </TouchableOpacity>

            <View style={styles.tags}>
              {pantry.map((item, i) => (
                <View key={item + i} style={styles.tag}>
                  <Text style={styles.tagText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeItem(i)}>
                    <Text style={styles.tagRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {pantry.length === 0 && <Text style={styles.emptyNote}>Nothing added yet — start typing above.</Text>}
          </View>

          <SectionLabel text="Filters" />
          <View style={styles.card}>
            <FilterBlock title="Diet">
              <ChipRow options={DIETS} value={diet} onChange={setDiet} />
            </FilterBlock>
            <FilterBlock title="Time" style={{ marginTop: 16 }}>
              <ChipRow options={TIMES} value={time} onChange={setTime} />
            </FilterBlock>
            <FilterBlock title="Mood (optional)" style={{ marginTop: 16 }}>
              <TextInput
                style={styles.input}
                placeholder="e.g. cozy, spicy, Italian, quick weeknight"
                placeholderTextColor="rgba(38,41,34,0.4)"
                value={mood}
                onChangeText={setMood}
              />
            </FilterBlock>
          </View>

          <TouchableOpacity style={styles.cta} onPress={findRecipes} disabled={loading}>
            <Text style={styles.ctaText}>{loading ? 'Looking…' : 'Find recipes'}</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator style={{ marginTop: 14 }} color="#C1442A" />}
          {!!error && (
            <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
          )}

          <View style={{ marginTop: 20 }}>
            {recipes.map((r, i) => (
              <RecipeCard
                key={i}
                recipe={r}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </View>

          <Text style={styles.footer}>SHELF · COOK FROM WHAT'S ALREADY THERE</Text>
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
      {options.map(opt => (
        <TouchableOpacity
          key={opt.v}
          style={[styles.chip, value === opt.v && styles.chipActive]}
          onPress={() => onChange(opt.v)}
        >
          <Text style={[styles.chipText, value === opt.v && styles.chipTextActive]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function RecipeCard({ recipe, open, onToggle }) {
  const missing = recipe.missing || [];
  const ready = missing.length === 0;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onToggle} style={[styles.recipe, !ready && styles.recipeNeedsBuy]}>
      <View style={styles.recipeTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.recipeMeta}>{recipe.time} · {recipe.difficulty}</Text>
        </View>
        <View style={[styles.matchBadge, !ready && styles.matchBadgePartial]}>
          <Text style={[styles.matchBadgeText, !ready && styles.matchBadgeTextPartial]}>
            {ready ? 'Ready now' : `Needs ${missing.length} item${missing.length > 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      {!ready && (
        <Text style={styles.missingLine}>Pick up: <Text style={{ fontWeight: '700', color: '#C1442A' }}>{missing.join(', ')}</Text></Text>
      )}

      <Text style={styles.expandHint}>{open ? 'Tap to collapse ▴' : 'Tap for full recipe ▾'}</Text>

      {open && (
        <View style={styles.recipeDetail}>
          <Text style={styles.detailHeading}>Ingredients</Text>
          {(recipe.ingredients || []).map((ing, i) => (
            <Text key={i} style={styles.detailLine}>·  {ing}</Text>
          ))}
          <Text style={[styles.detailHeading, { marginTop: 12 }]}>Steps</Text>
          {(recipe.steps || []).map((s, i) => (
            <Text key={i} style={styles.detailLine}>{i + 1}.  {s}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E7DEC6' },
  wrap: { paddingHorizontal: 18, paddingBottom: 60 },
  header: { paddingTop: 24, paddingBottom: 10 },
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: 2, borderColor: '#C1442A', borderRadius: 2,
    paddingHorizontal: 10, paddingVertical: 3, transform: [{ rotate: '-2deg' }],
  },
  stampText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, letterSpacing: 2, color: '#C1442A' },
  h1: { fontFamily: 'SpecialElite_400Regular', fontSize: 42, color: '#262922', marginTop: 12 },
  tagline: { fontFamily: 'WorkSans_400Regular', fontSize: 15, color: 'rgba(38,41,34,0.65)', marginTop: 6, lineHeight: 21 },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 10, gap: 10 },
  sectionLabelText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, letterSpacing: 2, color: '#2F4A3C', textTransform: 'uppercase' },
  sectionLabelLine: { flex: 1, height: 1, backgroundColor: 'rgba(38,41,34,0.18)' },

  card: { backgroundColor: '#F6F1E3', borderWidth: 1, borderColor: 'rgba(38,41,34,0.18)', borderRadius: 3, padding: 16 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, fontFamily: 'WorkSans_400Regular', fontSize: 15, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: 'rgba(38,41,34,0.18)', borderRadius: 3, backgroundColor: '#fff', color: '#262922',
  },
  addBtn: { backgroundColor: '#2F4A3C', paddingHorizontal: 18, justifyContent: 'center', borderRadius: 3 },
  addBtnText: { fontFamily: 'WorkSans_600SemiBold', fontSize: 15, color: '#F6F1E3' },

  photoBtn: {
    marginTop: 10, borderWidth: 1.5, borderColor: 'rgba(38,41,34,0.25)', borderStyle: 'dashed',
    borderRadius: 3, paddingVertical: 12, alignItems: 'center',
  },
  photoBtnText: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: '#262922' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    borderWidth: 1, borderColor: 'rgba(38,41,34,0.18)', borderRadius: 2, paddingVertical: 6, paddingHorizontal: 10,
  },
  tagText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: '#262922' },
  tagRemove: { color: '#C1442A', fontWeight: '700' },
  emptyNote: { fontFamily: 'WorkSans_400Regular', fontStyle: 'italic', fontSize: 13, color: 'rgba(38,41,34,0.45)', marginTop: 14 },

  filterTitle: { fontFamily: 'WorkSans_600SemiBold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#2F4A3C', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: 'rgba(38,41,34,0.18)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#D8A23A', borderColor: '#D8A23A' },
  chipText: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: '#262922' },
  chipTextActive: { fontFamily: 'WorkSans_600SemiBold' },

  cta: { marginTop: 26, backgroundColor: '#C1442A', borderRadius: 3, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontFamily: 'SpecialElite_400Regular', fontSize: 17, letterSpacing: 1, color: '#F6F1E3', textTransform: 'uppercase' },

  errorBox: { marginTop: 14, backgroundColor: '#fbe9e5', borderWidth: 1, borderColor: '#C1442A', borderRadius: 3, padding: 12 },
  errorText: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: '#7a2a17' },

  recipe: { backgroundColor: '#F6F1E3', borderWidth: 1, borderColor: 'rgba(38,41,34,0.18)', borderLeftWidth: 4, borderLeftColor: '#2F4A3C', borderRadius: 2, padding: 16, marginBottom: 12 },
  recipeNeedsBuy: { borderLeftColor: '#D8A23A' },
  recipeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  recipeTitle: { fontFamily: 'SpecialElite_400Regular', fontSize: 19, color: '#262922' },
  recipeMeta: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: 'rgba(38,41,34,0.6)', marginTop: 4, textTransform: 'uppercase' },
  matchBadge: { backgroundColor: '#2F4A3C', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 9 },
  matchBadgePartial: { backgroundColor: '#D8A23A' },
  matchBadgeText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: '#F6F1E3' },
  matchBadgeTextPartial: { color: '#262922' },
  missingLine: { fontFamily: 'WorkSans_400Regular', fontSize: 13, color: 'rgba(38,41,34,0.75)', marginTop: 10 },
  expandHint: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: 'rgba(38,41,34,0.4)', marginTop: 8 },
  recipeDetail: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(38,41,34,0.18)', borderStyle: 'dashed' },
  detailHeading: { fontFamily: 'WorkSans_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#2F4A3C', marginBottom: 6 },
  detailLine: { fontFamily: 'WorkSans_400Regular', fontSize: 14, color: '#262922', lineHeight: 21 },

  footer: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: 'rgba(38,41,34,0.4)', textAlign: 'center', marginTop: 36, letterSpacing: 0.5 },
});
