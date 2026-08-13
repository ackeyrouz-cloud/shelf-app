import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/fonts';

// Decorative framing arc, not a data-encoded "progress" value — there's no
// consumption to compare against, only the target/estimate itself. The
// a11y-critical value is the number rendered in the center.
const DECORATIVE_ARC_FRACTION = 0.82;

export function MacroRing({ calories, size = 148, label = 'KCAL / DAY' }) {
  const stroke = Math.max(6, Math.round(size * 0.08));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - DECORATIVE_ARC_FRACTION);
  const valueFontSize = Math.round(size * 0.2);
  const labelFontSize = Math.max(8, Math.round(size * 0.068));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={COLORS.hairline} strokeWidth={stroke} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={COLORS.primary} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { fontSize: valueFontSize }]}>{Math.round(calories)}</Text>
        <Text style={[styles.label, { fontSize: labelFontSize }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  value: { fontFamily: FONTS.displayExtraBold, color: COLORS.ink },
  label: { fontFamily: FONTS.bodyBold, letterSpacing: 1.2, color: COLORS.inkMuted, marginTop: 2 },
});
