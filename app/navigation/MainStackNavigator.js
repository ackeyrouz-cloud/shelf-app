import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { OnboardingNavigator } from './OnboardingNavigator';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ChangePasswordScreen } from '../screens/settings/ChangePasswordScreen';
import { DeleteAccountScreen } from '../screens/settings/DeleteAccountScreen';
import { LogMealMethodScreen } from '../screens/logging/LogMealMethodScreen';
import { LogMealScreen } from '../screens/logging/LogMealScreen';
import { FoodSearchScreen } from '../screens/logging/FoodSearchScreen';
import { FoodDetailScreen } from '../screens/logging/FoodDetailScreen';

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
      {/* LogMealMethod is the sole modal entry point for logging a meal —
          FoodSearch/FoodDetail/LogMeal are reached only by pushing from
          within it, and continue inside that same modal card rather than
          each presenting their own. */}
      <Stack.Screen
        name="LogMealMethod"
        component={LogMealMethodScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="LogMeal" component={LogMealScreen} />
      <Stack.Screen name="FoodSearch" component={FoodSearchScreen} />
      <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
    </Stack.Navigator>
  );
}
