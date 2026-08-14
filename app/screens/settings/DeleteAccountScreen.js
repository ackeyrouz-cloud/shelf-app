import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../theme/colors';
import { FONTS } from '../../theme/fonts';
import { common } from '../../theme/common';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { deleteAccount } from '../../lib/account';

const CONFIRM_PHRASE = 'DELETE';

// Deliberately more friction than a native two-button Alert: the delete
// action stays disabled until the exact phrase is typed, the same pattern
// GitHub uses for repo deletion — appropriate given this permanently
// destroys real data (profile, pantry, meal logs) with no undo.
export function DeleteAccountScreen({ navigation }) {
  const { signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const canDelete = confirmText.trim() === CONFIRM_PHRASE;

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setError('');
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      // No further navigation needed — signOut clears the session, and
      // RootNavigator's own gate switches to the Auth screen automatically.
    } catch (e) {
      setDeleting(false);
      setError(e.message || 'Something went wrong. Check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={COLORS.ink} />
          </Pressable>
          <Text style={[common.h1, { marginTop: 0, fontSize: 26 }]}>Delete Account</Text>
        </View>

        <View style={[common.card, { marginTop: 20, borderColor: `${COLORS.destructive}40`, borderWidth: 1.5 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Feather name="alert-triangle" size={20} color={COLORS.destructive} />
            <Text style={[common.filterTitle, { color: COLORS.destructive, marginBottom: 0 }]}>This cannot be undone</Text>
          </View>
          <Text style={common.tagline}>
            Deleting your account permanently removes your profile, pantry, and every logged meal. There is no way to recover this data afterward.
          </Text>
        </View>

        <View style={[common.card, { marginTop: 16 }]}>
          <Text style={common.filterTitle}>Type {CONFIRM_PHRASE} to confirm</Text>
          <TextInput
            style={common.input}
            placeholder={CONFIRM_PHRASE}
            placeholderTextColor={COLORS.inkMuted}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel={`Type ${CONFIRM_PHRASE} to confirm account deletion`}
          />
        </View>

        <Pressable
          onPress={handleDelete}
          disabled={!canDelete || deleting}
          style={{
            marginTop: 24, borderRadius: 999, minHeight: 52, alignItems: 'center', justifyContent: 'center',
            backgroundColor: COLORS.destructive, opacity: canDelete && !deleting ? 1 : 0.4,
          }}
        >
          <Text style={{ fontFamily: FONTS.displayExtraBold, fontSize: 16, color: COLORS.onFill }}>
            {deleting ? 'Deleting…' : 'Permanently Delete My Account'}
          </Text>
        </Pressable>

        {deleting && <ActivityIndicator style={{ marginTop: 14 }} color={COLORS.destructive} />}
        {!!error && (
          <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
