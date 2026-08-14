import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { FONTS } from '../theme/fonts';
import { useTheme } from '../context/ThemeContext';

// Consumed-vs-target progress bar — distinct from MacroBar (which shows a
// macro's share of total calories, a composition view used when setting
// targets). This one is a goal-progress view: fraction = consumed/target,
// clamped at 100%. Deliberately no "over target" warning color — exceeding
// a target is desirable for some nutrients (protein, fiber) and situational
// for others (calories, carbs, fat), so a universal red/alarm treatment
// would misrepresent half of them.
export function NutrientProgressBar({ label, consumed, target, unit = 'g', color }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fraction = target > 0 ? Math.max(0, Math.min(1, consumed / target)) : 0;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(fraction, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [fraction]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(consumed)}<Text style={styles.valueMuted}> / {Math.round(target)}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  row: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  label: { fontFamily: FONTS.bodyBold, fontSize: 11.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.inkMuted },
  value: { fontFamily: FONTS.displaySemiBold, fontSize: 14, color: colors.ink },
  valueMuted: { fontFamily: FONTS.bodySemiBold, fontSize: 12.5, color: colors.inkMuted },
  track: { height: 9, borderRadius: 999, backgroundColor: colors.hairline, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: 999, transformOrigin: 'left' },
}); }
