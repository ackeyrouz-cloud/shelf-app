import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/fonts';

// Labeled proportional bar — grams + share of daily calories from this
// macro. Bars (not another ring/donut) for macro breakdown specifically:
// part-to-whole rings read poorly for colorblind users, bars stay legible
// with the label doing the real communicating and color as reinforcement only.
export function MacroBar({ label, grams, kcalPerGram, totalCalories, color }) {
  const kcal = grams * kcalPerGram;
  const fraction = totalCalories > 0 ? Math.max(0, Math.min(1, kcal / totalCalories)) : 0;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(fraction, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [fraction]);

  // Animate transform, not width — GPU-only, no per-frame layout pass.
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.grams}>{Math.round(grams)}g</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontFamily: FONTS.bodyBold, fontSize: 11.5, letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.inkMuted },
  grams: { fontFamily: FONTS.displaySemiBold, fontSize: 14, color: COLORS.ink },
  track: { height: 9, borderRadius: 999, backgroundColor: COLORS.hairline, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: 999, transformOrigin: 'left' },
});
