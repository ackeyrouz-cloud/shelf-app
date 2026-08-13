import React from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { common } from '../../theme/common';
import { MacroRing } from '../../components/MacroRing';
import { MacroBar } from '../../components/MacroBar';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

// Permanent, MFP-style targets dashboard. Note: Shelf only stores daily
// *targets* — there's no food-logging/diary feature, so this shows the
// target breakdown itself (bold numbers + color-coded bars), not a
// "consumed vs. target" progress view the way MFP's own dashboard works.
// Editing these values in place is tracked as follow-up work, not done here.
export function ProfileScreen() {
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const hasTargets = profile?.target_calories != null;

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap}>
        <View style={common.header}>
          <Text style={common.eyebrow}>PROFILE</Text>
          <Text style={common.h1}>Your targets</Text>
          <Text style={common.tagline}>Your daily calorie and macro targets.</Text>
        </View>

        {hasTargets && (
          <>
            <View style={[common.card, { alignItems: 'center', paddingVertical: 24 }]}>
              <MacroRing calories={profile.target_calories} />
            </View>

            <View style={[common.card, { marginTop: 14 }]}>
              <Text style={common.filterTitle}>Daily macros</Text>
              <View style={{ marginTop: 4 }}>
                <MacroBar label="Protein" grams={profile.target_protein_g} kcalPerGram={4} totalCalories={profile.target_calories} color={COLORS.protein} />
                <MacroBar label="Carbs" grams={profile.target_carbs_g} kcalPerGram={4} totalCalories={profile.target_calories} color={COLORS.carbs} />
                <MacroBar label="Fat" grams={profile.target_fat_g} kcalPerGram={9} totalCalories={profile.target_calories} color={COLORS.fat} />
              </View>
              {profile.target_fiber_g != null && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={common.filterTitle}>Fiber</Text>
                  <Text style={{ fontFamily: FONTS.displaySemiBold, fontSize: 13, color: COLORS.ink }}>{Math.round(profile.target_fiber_g)}g</Text>
                </View>
              )}
            </View>
          </>
        )}

        <Pressable onPress={() => { Haptics.selectionAsync(); signOut(); }} style={{ marginTop: 28, alignItems: 'center' }}>
          <Text style={common.expandHint}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
