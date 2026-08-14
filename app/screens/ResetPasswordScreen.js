import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme/colors';
import { common } from '../theme/common';
import { FilterBlock } from '../components/FilterBlock';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

// Shown whenever AuthContext's isPasswordRecovery is true — reached only by
// opening the link from a password-reset email, regardless of whatever
// session state that link's code exchange produced. After a successful
// change we sign out deliberately (rather than continuing into the app on
// the recovery session) so the user proves the new password actually works
// by signing in with it fresh.
export function ResetPasswordScreen() {
  const { clearPasswordRecovery, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    clearPasswordRecovery();
    await signOut();
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[common.wrap, { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={common.header}>
            <Text style={common.eyebrow}>SHELF</Text>
            <Text style={common.h1}>Set a new password</Text>
            <Text style={common.tagline}>Choose a new password for your account.</Text>
          </View>

          <View style={common.card}>
            <FilterBlock title="New password">
              <TextInput
                style={common.input}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.inkMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="New password"
              />
            </FilterBlock>
            <FilterBlock title="Confirm password" style={{ marginTop: 16 }}>
              <TextInput
                style={common.input}
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.inkMuted}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Confirm new password"
              />
            </FilterBlock>
          </View>

          <PrimaryButton label={saving ? 'Saving…' : 'Save new password'} onPress={submit} disabled={saving} />

          {saving && <ActivityIndicator style={{ marginTop: 14 }} color={COLORS.primary} />}
          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
