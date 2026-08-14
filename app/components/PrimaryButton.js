import React from 'react';
import { Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCommonStyles } from '../context/ThemeContext';

// The primary pill CTA used across nearly every screen (onboarding Continue/
// Save, Auth sign in, Find Recipes, ...). Built once as a shared component
// so the press-scale feedback is consistent everywhere instead of each
// screen re-implementing its own TouchableOpacity.
export function PrimaryButton({ label, onPress, disabled = false, style }) {
  const common = useCommonStyles();
  const pressed = useSharedValue(0);

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => { pressed.set(withTiming(1, { duration: 100 })); })
    .onFinalize(() => { pressed.set(withTiming(0, { duration: 150 })); })
    .onEnd(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.03 }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[common.cta, animatedStyle, style]}>
        <Text style={common.ctaText}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
}
