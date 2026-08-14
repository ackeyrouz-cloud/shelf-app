import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { AuthScreen } from '../screens/AuthScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { ProfileErrorScreen } from '../screens/ProfileErrorScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainStackNavigator } from './MainStackNavigator';

const Stack = createNativeStackNavigator();

// Conditionally including a different single Screen per app state (rather than
// branching to entirely separate <Stack.Navigator> trees) lets React Navigation
// animate the Auth -> Onboarding -> Main handoff instead of hard-cutting between them.
export function RootNavigator() {
  const { session, isPasswordRecovery } = useAuth();
  const { profileLoading, profileError, needsOnboarding } = useProfile();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isPasswordRecovery ? (
        // Checked first, ahead of the normal session branching below — the
        // recovery link's code exchange produces a real session, which would
        // otherwise read as "fully signed in" and skip straight past this.
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      ) : session === undefined ? (
        <Stack.Screen name="Loading" component={LoadingScreen} />
      ) : !session ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : profileLoading ? (
        <Stack.Screen name="ProfileLoading" component={LoadingScreen} />
      ) : profileError ? (
        <Stack.Screen name="ProfileError" component={ProfileErrorScreen} />
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainStackNavigator} />
      )}
    </Stack.Navigator>
  );
}
