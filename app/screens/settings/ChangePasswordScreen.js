import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { FilterBlock } from '../../components/FilterBlock';
import { PrimaryButton } from '../../components/PrimaryButton';

export function ChangePasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const common = useCommonStyles();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

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
    setDone(true);
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">
          <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
              <Feather name="chevron-left" size={24} color={colors.ink} />
            </Pressable>
            <Text style={[common.h1, { marginTop: 0 }]}>Change Password</Text>
          </View>

          {done ? (
            <View style={[common.card, { marginTop: 20, alignItems: 'center', paddingVertical: 28 }]}>
              <Feather name="check-circle" size={32} color={colors.success} />
              <Text style={[common.tagline, { marginTop: 12, textAlign: 'center' }]}>Your password has been updated.</Text>
              <PrimaryButton label="Done" onPress={() => navigation.goBack()} style={{ marginTop: 20, alignSelf: 'stretch' }} />
            </View>
          ) : (
            <>
              <View style={[common.card, { marginTop: 20 }]}>
                <FilterBlock title="New password">
                  <TextInput
                    style={common.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.inkMuted}
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
                    placeholderTextColor={colors.inkMuted}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                    accessibilityLabel="Confirm new password"
                  />
                </FilterBlock>
              </View>

              <PrimaryButton label={saving ? 'Saving…' : 'Update password'} onPress={submit} disabled={saving} />

              {saving && <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />}
              {!!error && (
                <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
