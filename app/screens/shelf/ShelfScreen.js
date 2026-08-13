import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { common } from '../../theme/common';
import { usePantry } from '../../context/PantryContext';

export function ShelfScreen() {
  const { pantry, pantryLoading, pantryBusy, pantryError, photoLoading, photoError, addFromText, removeItem, pickPhoto } = usePantry();
  const [inputText, setInputText] = useState('');

  const submitText = () => {
    Haptics.selectionAsync();
    addFromText(inputText);
    setInputText('');
  };

  const handlePickPhoto = () => {
    Haptics.selectionAsync();
    pickPhoto();
  };

  const handleRemove = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeItem(id);
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">

          <View style={common.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="fridge-outline" size={22} color={COLORS.carbs} />
              </View>
              <Text style={common.eyebrow}>SHELF</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <Text style={[common.h1, { flex: 1 }]}>What's in your kitchen?</Text>
              {!pantryLoading && pantry.length > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{pantry.length}</Text>
                  <Text style={styles.countPillLabel}>{pantry.length === 1 ? 'ITEM' : 'ITEMS'}</Text>
                </View>
              )}
            </View>
            <Text style={common.tagline}>Tell it what's in your fridge and pantry. It finds recipes that need the least extra shopping.</Text>
          </View>

          <View style={common.card}>
            <View style={styles.addRow}>
              <TextInput
                style={common.input}
                placeholder="e.g. chicken thighs, rice, half an onion"
                placeholderTextColor={COLORS.inkMuted}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={submitText}
                returnKeyType="done"
                maxLength={120}
                accessibilityLabel="Add pantry item"
              />
              <Pressable style={styles.addBtn} onPress={submitText} disabled={pantryBusy}>
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>

            <Pressable style={styles.photoBtn} onPress={handlePickPhoto} disabled={photoLoading}>
              {photoLoading
                ? <ActivityIndicator color={COLORS.fat} />
                : (
                  <>
                    <Feather name="camera" size={16} color={COLORS.fat} />
                    <Text style={styles.photoBtnText}>Snap a photo of your shelf</Text>
                  </>
                )}
            </Pressable>

            {pantryLoading ? (
              <ActivityIndicator style={{ marginTop: 14 }} color={COLORS.primary} />
            ) : (
              <>
                <View style={styles.tags}>
                  {pantry.map((item) => (
                    <View key={item.id} style={styles.tag}>
                      <View style={styles.tagDot} />
                      <Text style={styles.tagText}>{item.name}</Text>
                      <Pressable
                        onPress={() => handleRemove(item.id)}
                        disabled={pantryBusy}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.tagRemoveHit}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.name}`}
                      >
                        <Feather name="x" size={13} color={COLORS.inkMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
                {pantry.length === 0 && <Text style={styles.emptyNote}>Nothing added yet — start typing above.</Text>}
              </>
            )}
            {!!pantryError && (
              <View style={common.errorBox}><Text style={common.errorText}>{pantryError}</Text></View>
            )}
            {!!photoError && (
              <View style={common.errorBox}><Text style={common.errorText}>{photoError}</Text></View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  headerIcon: {
    width: 30, height: 30, borderRadius: 10, borderCurve: 'continuous',
    backgroundColor: `${COLORS.carbs}22`, alignItems: 'center', justifyContent: 'center',
  },
  countPill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    backgroundColor: `${COLORS.protein}22`, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginTop: 4,
  },
  countPillText: { fontFamily: FONTS.displaySemiBold, fontSize: 15, color: COLORS.protein },
  countPillLabel: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.5, color: COLORS.protein },

  addRow: { flexDirection: 'row', gap: 8 },
  addBtn: { backgroundColor: COLORS.success, paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', borderRadius: 999 },
  addBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.onFill },

  photoBtn: {
    marginTop: 12, flexDirection: 'row', gap: 8,
    backgroundColor: `${COLORS.fat}18`,
    borderRadius: 999, paddingVertical: 13, minHeight: 48, alignItems: 'center', justifyContent: 'center',
  },
  photoBtnText: {
    fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.fat,
  },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.surfaceRaised,
    borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  tagText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.ink },
  tagRemoveHit: { minWidth: 20, minHeight: 20, alignItems: 'center', justifyContent: 'center' },
  emptyNote: { fontFamily: FONTS.bodyRegular, fontSize: 13, color: COLORS.inkMuted, marginTop: 14 },
});
