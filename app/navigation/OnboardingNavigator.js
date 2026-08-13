import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingProvider } from '../context/OnboardingContext';
import { SexScreen } from '../screens/onboarding/SexScreen';
import { AgeScreen } from '../screens/onboarding/AgeScreen';
import { HeightScreen } from '../screens/onboarding/HeightScreen';
import { WeightScreen } from '../screens/onboarding/WeightScreen';
import { ActivityScreen } from '../screens/onboarding/ActivityScreen';
import { TargetWeightScreen } from '../screens/onboarding/TargetWeightScreen';
import { TimeframeScreen } from '../screens/onboarding/TimeframeScreen';
import { TargetsReviewScreen } from '../screens/onboarding/TargetsReviewScreen';

const Stack = createNativeStackNavigator();

export function OnboardingNavigator() {
  return (
    <OnboardingProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Sex" component={SexScreen} />
        <Stack.Screen name="Age" component={AgeScreen} />
        <Stack.Screen name="Height" component={HeightScreen} />
        <Stack.Screen name="Weight" component={WeightScreen} />
        <Stack.Screen name="Activity" component={ActivityScreen} />
        <Stack.Screen name="TargetWeight" component={TargetWeightScreen} />
        <Stack.Screen name="Timeframe" component={TimeframeScreen} />
        <Stack.Screen name="Review" component={TargetsReviewScreen} />
      </Stack.Navigator>
    </OnboardingProvider>
  );
}
