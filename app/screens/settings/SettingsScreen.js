import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, Switch, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { ChipRow } from '../../components/ChipRow';
import { FilterBlock } from '../../components/FilterBlock';
import { getNotificationPermissionStatus, requestNotificationPermission } from '../../lib/notifications';

const UNIT_SYSTEM_OPTIONS = [
  { v: 'metric', label: 'Metric' },
  { v: 'imperial', label: 'Imperial' },
];

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
  const { signOut, userId } = useAuth();
  const { profile, setProfile } = useProfile();
  const { colors, isDark, toggleMode } = useTheme();
  const common = useCommonStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const unitSystem = profile?.unit_system ?? 'metric';
  const [notifPermission, setNotifPermission] = useState(null); // 'granted' | 'denied' | 'undetermined' | null (loading)
  const [notifBusy, setNotifBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getNotificationPermissionStatus().then((status) => {
      if (!cancelled) setNotifPermission(status);
    });
    return () => { cancelled = true; };
  }, []);

  const handleToggleTheme = () => {
    Haptics.selectionAsync();
    toggleMode();
  };

  const handleUnitSystemChange = async (next) => {
    if (next === unitSystem) return;
    setProfile({ ...profile, unit_system: next }); // optimistic — Settings is a low-stakes write, no loading gate needed
    const { error } = await supabase.from('profiles').update({ unit_system: next }).eq('id', userId);
    if (error) {
      setProfile({ ...profile, unit_system: unitSystem }); // revert on failure
    }
  };

  // Notifications preference on: if OS permission isn't granted yet, ask for
  // it first — a saved "on" preference the OS is silently blocking would be
  // misleading. Denied-at-OS-level is reflected via notifPermission, not
  // treated as an error. Off: only clears our own DB flag — there's no API
  // to programmatically revoke OS permission, same as any other app.
  const handleToggleNotifications = async (next) => {
    Haptics.selectionAsync();
    setNotifBusy(true);
    if (next) {
      let status = notifPermission;
      if (status !== 'granted') {
        status = await requestNotificationPermission();
        setNotifPermission(status);
      }
      if (status === 'granted') {
        setProfile({ ...profile, notifications_enabled: true });
        await supabase.from('profiles').update({ notifications_enabled: true }).eq('id', userId);
      }
    } else {
      setProfile({ ...profile, notifications_enabled: false });
      await supabase.from('profiles').update({ notifications_enabled: false }).eq('id', userId);
    }
    setNotifBusy(false);
  };

  const notificationsOn = !!profile?.notifications_enabled && notifPermission === 'granted';

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

          <View style={[styles.row, { alignItems: 'flex-start', paddingTop: 14 }]}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.carbs}22` }]}>
              <Feather name="sliders" size={18} color={colors.carbs} />
            </View>
            <View style={{ flex: 1 }}>
              <FilterBlock title="Units">
                <ChipRow options={UNIT_SYSTEM_OPTIONS} value={unitSystem} onChange={handleUnitSystemChange} />
              </FilterBlock>
              <Text style={[styles.rowSublabel, { marginTop: 8 }]}>
                {unitSystem === 'imperial' ? 'lb · in · fl oz' : 'kg · cm · ml'}
              </Text>
            </View>
          </View>

          <View style={[styles.row, { paddingTop: 14 }]}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.water}22` }]}>
              <Feather name="bell" size={18} color={colors.water} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Notifications</Text>
              <Text style={styles.rowSublabel}>
                {notifPermission === 'denied' && !notificationsOn ? 'Blocked — enable in device Settings' : notificationsOn ? 'On' : 'Off'}
              </Text>
            </View>
            {notifPermission === null ? (
              <ActivityIndicator color={colors.water} />
            ) : notifPermission === 'denied' && !notificationsOn ? (
              <Pressable onPress={() => Linking.openSettings()} hitSlop={10}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, color: colors.water }}>Open Settings</Text>
              </Pressable>
            ) : (
              <Switch
                value={notificationsOn}
                onValueChange={handleToggleNotifications}
                disabled={notifBusy}
                trackColor={{ false: colors.hairline, true: colors.water }}
                thumbColor={colors.surface}
                accessibilityLabel="Toggle notifications"
              />
            )}
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
          <Text style={common.filterTitle}>About</Text>
          <View style={[common.card, { paddingVertical: 4 }]}>
            <SettingsRow
              colors={colors}
              styles={styles}
              icon="shield"
              iconColor={colors.success}
              label="Privacy & Data"
              sublabel="What we collect and how deletion works"
              onPress={() => navigation.navigate('PrivacyInfo')}
            />
          </View>
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
