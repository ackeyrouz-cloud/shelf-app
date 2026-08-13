import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolateColor, runOnJS,
} from 'react-native-reanimated';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/fonts';

const ICON_SETS = { Feather, MaterialCommunityIcons };

// Large tappable option card — used where a plain chip reads as too small/
// low-stakes (sex, activity level): icon + label + optional description,
// bold solid-fill selected state (not a subtle tint) plus a checkmark badge
// so selection never depends on color alone. Press feedback runs on the UI
// thread via GestureDetector rather than Pressable's JS-thread callback.
export function SelectableCard({
  icon, iconFamily = 'Feather', label, description, selected, onPress, accentColor = COLORS.primary,
}) {
  const IconComponent = ICON_SETS[iconFamily];
  const pressed = useSharedValue(0);
  const selectedProgress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected]);

  const tap = Gesture.Tap()
    .onBegin(() => { pressed.set(withTiming(1, { duration: 100 })); })
    .onFinalize(() => { pressed.set(withTiming(0, { duration: 150 })); })
    .onEnd(() => {
      runOnJS(Haptics.selectionAsync)();
      runOnJS(onPress)();
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.02 }],
    backgroundColor: interpolateColor(selectedProgress.value, [0, 1], [COLORS.surface, accentColor]),
    borderColor: interpolateColor(selectedProgress.value, [0, 1], ['rgba(238,241,246,0.10)', accentColor]),
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[styles.card, cardStyle]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={description ? `${label}. ${description}` : label}
      >
        <View style={[styles.iconBadge, { backgroundColor: selected ? 'rgba(11,15,23,0.16)' : COLORS.surfaceRaised }]}>
          <IconComponent name={icon} size={24} color={selected ? COLORS.onFill : accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: selected ? COLORS.onFill : COLORS.ink }]}>{label}</Text>
          {!!description && (
            <Text style={[styles.description, { color: selected ? 'rgba(11,15,23,0.7)' : COLORS.inkMuted }]}>{description}</Text>
          )}
        </View>
        {selected && (
          <View style={styles.checkBadge}>
            <Feather name="check" size={14} color={accentColor} />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    minHeight: 72, borderRadius: 18, borderCurve: 'continuous',
    borderWidth: 2, padding: 14,
  },
  iconBadge: {
    width: 44, height: 44, borderRadius: 14, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontFamily: FONTS.displaySemiBold, fontSize: 16 },
  description: { fontFamily: FONTS.bodyRegular, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  checkBadge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.onFill,
    alignItems: 'center', justifyContent: 'center',
  },
});
