import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { passwordResetRedirectUrl } from '../lib/deepLinks';
import { useTheme, useCommonStyles } from '../context/ThemeContext';
import { FilterBlock } from '../components/FilterBlock';
import { PrimaryButton } from '../components/PrimaryButton';

// mode: 'signin' | 'signup' | 'forgot'
export function AuthScreen() {
  const { colors } = useTheme();
  const common = useCommonStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const switchMode = (next) => {
    Haptics.selectionAsync();
    setMode(next);
    setError('');
    setMessage('');
  };

  const submit = async () => {
    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Enter your email.');
        return;
      }
      setError('');
      setMessage('');
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordResetRedirectUrl(),
      });
      setLoading(false);
      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage("If that email has an account, we've sent a link to reset your password.");
      }
      return;
    }

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

  const titles = {
    signin: ['Welcome back', 'Sign in to pick up where you left off.'],
    signup: ['Create your account', 'Create an account to save your pantry and preferences.'],
    forgot: ['Reset your password', "Enter your email and we'll send you a link to reset it."],
  };
  const [title, tagline] = titles[mode];

  const ctaLabel = loading
    ? 'Please wait…'
    : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in';

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[common.wrap, { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={common.header}>
            <Text style={common.eyebrow}>SHELF</Text>
            <Text style={common.h1}>{title}</Text>
            <Text style={common.tagline}>{tagline}</Text>
          </View>

          <View style={common.card}>
            <FilterBlock title="Email">
              <TextInput
                style={common.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.inkMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                accessibilityLabel="Email address"
              />
            </FilterBlock>
            {mode !== 'forgot' && (
              <FilterBlock title="Password" style={{ marginTop: 16 }}>
                <TextInput
                  style={common.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.inkMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  accessibilityLabel="Password"
                />
              </FilterBlock>
            )}
          </View>

          {mode === 'signin' && (
            <Pressable style={{ marginTop: 12, alignItems: 'flex-end' }} onPress={() => switchMode('forgot')}>
              <Text style={common.expandHint}>Forgot password?</Text>
            </Pressable>
          )}

          <PrimaryButton label={ctaLabel} onPress={submit} disabled={loading} />

          {loading && <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />}
          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}
          {!!message && (
            <View style={common.errorBox}><Text style={common.errorText}>{message}</Text></View>
          )}

          <Pressable
            style={{ marginTop: 20, alignItems: 'center' }}
            onPress={() => switchMode(mode === 'signup' ? 'signin' : mode === 'forgot' ? 'signin' : 'signup')}
          >
            <Text style={common.expandHint}>
              {mode === 'signup' ? 'Already have an account? Sign in'
                : mode === 'forgot' ? '‹ Back to sign in'
                : "Don't have an account? Create one"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
