import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';

function InfoSection({ styles, colors, icon, iconColor, title, children }) {
  return (
    <View style={[styles.card, { marginTop: 16 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <View style={[styles.icon, { backgroundColor: `${iconColor}22` }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

export function PrivacyInfoScreen({ navigation }) {
  const { colors } = useTheme();
  const common = useCommonStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap}>
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={colors.ink} />
          </Pressable>
          <Text style={[common.h1, { marginTop: 0, fontSize: 26 }]}>Privacy & Data</Text>
        </View>

        <InfoSection styles={styles} colors={colors} icon="database" iconColor={colors.primary} title="What we collect">
          Your account email, profile stats (weight, height, age, activity level, goals), pantry items, meal and water
          logs, and any custom foods you create. That's it — no location, contacts, or device tracking beyond what's
          needed to run the app.
        </InfoSection>

        <InfoSection styles={styles} colors={colors} icon="share-2" iconColor={colors.fat} title="How it's used">
          Nutrition targets and progress are calculated from your profile stats. Recipe generation and AI-estimated
          nutrition (voice, text, and photo logging) send the relevant text or photo to Anthropic to produce a result
          — nothing else about your account goes with it. Food lookups are sent to Open Food Facts and the USDA
          FoodData Central database. Everything you enter is stored in our Supabase database, accessible only to
          your own account.
        </InfoSection>

        <InfoSection styles={styles} colors={colors} icon="trash-2" iconColor={colors.destructive} title="Account deletion">
          Deleting your account (Settings → Delete Account) permanently and immediately removes your profile,
          pantry, meal logs, water logs, custom foods, and meal plans. This happens automatically as part of
          deleting the account itself — there's no separate cleanup step, and no way to recover the data
          afterward.
        </InfoSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: 18, borderCurve: 'continuous',
    padding: 16, borderWidth: 1, borderColor: colors.hairline,
  },
  icon: { width: 28, height: 28, borderRadius: 9, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONTS.bodyBold, fontSize: 14, color: colors.ink },
  body: { fontFamily: FONTS.bodyRegular, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted },
}); }
