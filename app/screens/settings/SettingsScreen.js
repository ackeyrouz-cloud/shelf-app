import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

function SettingsRow({ colors, styles, icon, iconColor, label, sublabel, onPress, destructive = false }) {
  const resolvedIconColor = iconColor || colors.primary;
  const handlePress = () => { Haptics.selectionAsync(); onPress(); };
  return (
    <Pressable onPress={handlePress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${destructive ? colors.destructive : resolvedIconColor}22` }]}>
        <Feather name={icon} size={18} color={destructive ? colors.destructive : resolvedIconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, destructive && { color: colors.destructive }]}>{label}</Text>
        {!!sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <Feather name="chevron-right" size={18} color={colors.inkMuted} />
    </Pressable>
  );
}

export function SettingsScreen({ navigation }) {
  const { signOut } = useAuth();
  const { colors, isDark, toggleMode } = useTheme();
  const common = useCommonStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleToggleTheme = () => {
    Haptics.selectionAsync();
    toggleMode();
  };

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap}>
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={colors.ink} />
          </Pressable>
          <Text style={[common.h1, { marginTop: 0 }]}>Settings</Text>
        </View>

        <Text style={common.filterTitle}>Preferences</Text>
        <View style={[common.card, { paddingVertical: 4, marginBottom: 24 }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.premium}22` }]}>
              <Feather name={isDark ? 'moon' : 'sun'} size={18} color={colors.premium} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Dark Mode</Text>
              <Text style={styles.rowSublabel}>{isDark ? 'On' : 'Off'}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleTheme}
              trackColor={{ false: colors.hairline, true: colors.premium }}
              thumbColor={colors.surface}
              accessibilityLabel="Toggle dark mode"
            />
          </View>
        </View>

        <Text style={common.filterTitle}>Account</Text>
        <View style={[common.card, { paddingVertical: 4 }]}>
          <SettingsRow
            colors={colors}
            styles={styles}
            icon="target"
            label="Recalculate Targets"
            sublabel="Update your stats and daily goals"
            onPress={() => navigation.navigate('EditTargets')}
          />
          <SettingsRow
            colors={colors}
            styles={styles}
            icon="lock"
            iconColor={colors.fat}
            label="Change Password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <View style={[common.card, { paddingVertical: 4 }]}>
            <SettingsRow
              colors={colors}
              styles={styles}
              icon="log-out"
              iconColor={colors.inkMuted}
              label="Sign Out"
              onPress={() => signOut()}
            />
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={common.filterTitle}>Danger Zone</Text>
          <View style={[common.card, { paddingVertical: 4 }]}>
            <SettingsRow
              colors={colors}
              styles={styles}
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

function makeStyles(colors) { return StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: colors.ink },
  rowSublabel: { fontFamily: FONTS.bodyRegular, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
}); }
