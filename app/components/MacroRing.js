import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FONTS } from '../theme/fonts';
import { useTheme } from '../context/ThemeContext';

// Decorative framing arc used when there's no target to compare against
// (setting a target, or a recipe's flat per-serving calorie count) — not a
// data-encoded progress value in that case.
const DECORATIVE_ARC_FRACTION = 0.82;

// `target` is optional. Provide it (daily consumed vs. daily target) and the
// ring becomes a real progress arc with a "consumed / target" center label,
// matching the bar components below it. Omit it and the ring falls back to
// the original flat display: a single number + unit label, decorative arc.
export function MacroRing({ value, target, size = 148, unit = 'KCAL', label = 'KCAL / DAY' }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const stroke = Math.max(6, Math.round(size * 0.08));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = target > 0 ? Math.max(0, Math.min(1, value / target)) : DECORATIVE_ARC_FRACTION;
  const dashoffset = circumference * (1 - fraction);
  const valueFontSize = Math.round(size * (target > 0 ? 0.18 : 0.2));
  const labelFontSize = Math.max(8, Math.round(size * 0.068));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.hairline} strokeWidth={stroke} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.primary} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { fontSize: valueFontSize }]}>{Math.round(value)}</Text>
        {target > 0 ? (
          <Text style={[styles.label, { fontSize: labelFontSize }]}>/ {Math.round(target)} {unit}</Text>
        ) : (
          <Text style={[styles.label, { fontSize: labelFontSize }]}>{label}</Text>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  value: { fontFamily: FONTS.displayExtraBold, color: colors.ink },
  label: { fontFamily: FONTS.bodyBold, letterSpacing: 1.2, color: colors.inkMuted, marginTop: 2 },
}); }
