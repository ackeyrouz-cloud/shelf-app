import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { COLORS } from '../theme/colors';
import { common } from '../theme/common';
import { FilterBlock } from '../components/FilterBlock';
import { PrimaryButton } from '../components/PrimaryButton';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) {
          setError(signUpError.message);
        } else if (!data.session) {
          // No session back means email confirmation is required before sign-in works.
          // If confirmation is off, data.session is already set and onAuthStateChange
          // will transition straight into the app — no message needed.
          setMessage('Check your email to confirm your account, then sign in.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) setError(signInError.message);
      }
    } catch (e) {
      setError('Something went wrong. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[common.wrap, { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={common.header}>
            <Text style={common.eyebrow}>SHELF</Text>
            <Text style={common.h1}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Text>
            <Text style={common.tagline}>
              {mode === 'signup' ? 'Create an account to save your pantry and preferences.' : 'Sign in to pick up where you left off.'}
            </Text>
          </View>

          <View style={common.card}>
            <FilterBlock title="Email">
              <TextInput
                style={common.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.inkMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                accessibilityLabel="Email address"
              />
            </FilterBlock>
            <FilterBlock title="Password" style={{ marginTop: 16 }}>
              <TextInput
                style={common.input}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.inkMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Password"
              />
            </FilterBlock>
          </View>

          <PrimaryButton
            label={loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            onPress={submit}
            disabled={loading}
          />

          {loading && <ActivityIndicator style={{ marginTop: 14 }} color={COLORS.primary} />}
          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}
          {!!message && (
            <View style={common.errorBox}><Text style={common.errorText}>{message}</Text></View>
          )}

          <Pressable
            style={{ marginTop: 20, alignItems: 'center' }}
            onPress={() => { Haptics.selectionAsync(); setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage(''); }}
          >
            <Text style={common.expandHint}>
              {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
