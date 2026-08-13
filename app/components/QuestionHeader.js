import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme/colors';
import { FONTS } from '../theme/fonts';
import { common } from '../theme/common';

const ICON_SETS = { Feather, MaterialCommunityIcons };

// Back chevron + step progress bar + title/subtitle (+ optional small colorful
// icon accent tied to the question) — shared by every onboarding screen,
// including the review screen, which otherwise diverges from
// QuestionScreenLayout's centered single-question shape.
export function QuestionHeader({ step, totalSteps, onBack, title, subtitle, icon, iconFamily = 'Feather', iconColor = COLORS.primary }) {
  const progress = useSharedValue(0);
  const IconComponent = icon ? ICON_SETS[iconFamily] : null;

  useEffect(() => {
    progress.value = withTiming(step / totalSteps, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [step, totalSteps]);

  // Animate transform, not width — avoids a per-frame layout recalculation
  // for what's otherwise a GPU-only fill animation.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 16, gap: 14 }}>
        {onBack ? (
          <Pressable
            onPress={() => { Haptics.selectionAsync(); onBack(); }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Back to previous question"
          >
            <Feather name="chevron-left" size={22} color={COLORS.ink} />
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <View
          style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.hairline, overflow: 'hidden' }}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: totalSteps, now: step }}
          accessibilityLabel={`Step ${step} of ${totalSteps}`}
        >
          <Animated.View style={[{ height: '100%', width: '100%', backgroundColor: iconColor, borderRadius: 2, transformOrigin: 'left' }, fillStyle]} />
        </View>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.inkMuted, minWidth: 30, textAlign: 'right' }}>
          {step}/{totalSteps}
        </Text>
      </View>

      <View style={{ marginTop: 26, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        {!!IconComponent && (
          <View style={{
            width: 44, height: 44, borderRadius: 14, borderCurve: 'continuous',
            backgroundColor: `${iconColor}26`, alignItems: 'center', justifyContent: 'center', marginTop: 2,
          }}>
            <IconComponent name={icon} size={22} color={iconColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={common.h1}>{title}</Text>
          {!!subtitle && <Text style={common.tagline}>{subtitle}</Text>}
        </View>
      </View>
    </>
  );
}
