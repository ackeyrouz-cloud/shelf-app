import React from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { common } from '../../theme/common';
import { useAuth } from '../../context/AuthContext';

function SettingsRow({ icon, iconColor = COLORS.primary, label, sublabel, onPress, destructive = false }) {
  const handlePress = () => { Haptics.selectionAsync(); onPress(); };
  return (
    <Pressable onPress={handlePress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${destructive ? COLORS.destructive : iconColor}22` }]}>
        <Feather name={icon} size={18} color={destructive ? COLORS.destructive : iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, destructive && { color: COLORS.destructive }]}>{label}</Text>
        {!!sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <Feather name="chevron-right" size={18} color={COLORS.inkMuted} />
    </Pressable>
  );
}

export function SettingsScreen({ navigation }) {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap}>
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={COLORS.ink} />
          </Pressable>
          <Text style={[common.h1, { marginTop: 0 }]}>Settings</Text>
        </View>

        <Text style={common.filterTitle}>Account</Text>
        <View style={[common.card, { paddingVertical: 4 }]}>
          <SettingsRow
            icon="target"
            label="Recalculate Targets"
            sublabel="Update your stats and daily goals"
            onPress={() => navigation.navigate('EditTargets')}
          />
          <SettingsRow
            icon="lock"
            iconColor={COLORS.fat}
            label="Change Password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <View style={[common.card, { paddingVertical: 4 }]}>
            <SettingsRow
              icon="log-out"
              iconColor={COLORS.inkMuted}
              label="Sign Out"
              onPress={() => signOut()}
            />
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={common.filterTitle}>Danger Zone</Text>
          <View style={[common.card, { paddingVertical: 4 }]}>
            <SettingsRow
              icon="trash-2"
              label="Delete Account"
              sublabel="Permanently delete your account and all data"
              destructive
              onPress={() => navigation.navigate('DeleteAccount')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.ink },
  rowSublabel: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.inkMuted, marginTop: 2 },
});
