import React, { createContext, useContext, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { dedupeNewItems } from '../lib/dedupe';
import { API_BASE_URL, REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE, OVERLOADED_MESSAGE } from '../lib/config';

const PantryContext = createContext(undefined);

export function PantryProvider({ children }) {
  const { userId } = useAuth();
  // pantry items are { id, name } — id is the pantry_items row id, needed for delete
  const [pantry, setPantry] = useState([]);
  const [pantryLoading, setPantryLoading] = useState(true);
  const [pantryBusy, setPantryBusy] = useState(false);
  const [pantryError, setPantryError] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');

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

  const addFromText = async (inputText) => {
    if (!inputText.trim() || pantryBusy) return;
    const parts = inputText.split(',').map(s => s.trim()).filter(Boolean);
    const newNames = dedupeNewItems(parts, pantry);
    if (newNames.length === 0) return;
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

  const pickPhoto = async () => {
    setPhotoError('');
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
        setPhotoError(TIMEOUT_MESSAGE);
      } else if (data.overloaded) {
        setPhotoError(OVERLOADED_MESSAGE);
      } else if (data.notFood) {
        setPhotoError("That doesn't look like food — try another photo.");
      } else if (Array.isArray(data.items) && data.items.length) {
        const newNames = dedupeNewItems(data.items, pantry);
        if (newNames.length > 0) {
          const { data: inserted, error: insertError } = await supabase
            .from('pantry_items')
            .insert(newNames.map(name => ({ user_id: userId, name })))
            .select('id, name');
          if (insertError) {
            setPhotoError("Identified items, but couldn't save them to your pantry. Try again.");
          } else {
            setPantry(prev => [...prev, ...(inserted || [])]);
          }
        }
      } else {
        setPhotoError("Couldn't identify anything in that photo — try typing instead.");
      }
    } catch (e) {
      setPhotoError(e.name === 'AbortError' ? TIMEOUT_MESSAGE : 'Photo reading failed. Check your connection and try again.');
    } finally {
      clearTimeout(timeoutId);
      setPhotoLoading(false);
    }
  };

  const value = {
    pantry,
    pantryLoading,
    pantryBusy,
    pantryError,
    photoLoading,
    photoError,
    addFromText,
    removeItem,
    pickPhoto,
  };

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}

export function usePantry() {
  const ctx = useContext(PantryContext);
  if (ctx === undefined) throw new Error('usePantry must be used within a PantryProvider');
  return ctx;
}
