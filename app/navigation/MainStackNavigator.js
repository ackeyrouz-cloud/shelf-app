import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { OnboardingNavigator } from './OnboardingNavigator';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ChangePasswordScreen } from '../screens/settings/ChangePasswordScreen';
import { DeleteAccountScreen } from '../screens/settings/DeleteAccountScreen';

const Stack = createNativeStackNavigator();

// Wraps the tab bar so Settings and the reused onboarding flow (for editing
// targets) can push/present over it — a flat Tab.Navigator has nowhere for
// those to live otherwise.
export function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen
        name="EditTargets"
        component={OnboardingNavigator}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
