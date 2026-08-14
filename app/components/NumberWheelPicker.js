import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../theme/fonts';
import { useTheme } from '../context/ThemeContext';

const ITEM_HEIGHT = 46;
const VISIBLE_COUNT = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

function WheelItem({ label, index, scrollY, styles }) {
  const style = useAnimatedStyle(() => {
    const distance = (scrollY.value - index * ITEM_HEIGHT) / ITEM_HEIGHT;
    return {
      opacity: interpolate(distance, [-2, -1, 0, 1, 2], [0.2, 0.5, 1, 0.5, 0.2], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distance, [-2, -1, 0, 1, 2], [0.8, 0.9, 1, 0.9, 0.8], Extrapolation.CLAMP) }],
    };
  });
  return (
    <View style={styles.item}>
      <Animated.Text style={[styles.itemText, style]}>{label}</Animated.Text>
    </View>
  );
}

// Custom tactile scroll-wheel — snapping FlatList driven by Reanimated rather
// than a native picker component, so it can be styled to match Shelf's
// identity instead of inheriting OS chrome. Exposes an "adjustable"
// accessibility role with increment/decrement actions so it's still operable
// without a precise drag gesture (VoiceOver/TalkBack, switch control).
export function NumberWheelPicker({ value, onChange, min, max, step = 1, unit, formatValue, accentColor }) {
  const { colors } = useTheme();
  const resolvedAccentColor = accentColor || colors.primary;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const items = useMemo(() => {
    const out = [];
    for (let v = min; v <= max + 1e-6; v = Math.round((v + step) * 1000) / 1000) out.push(Math.round(v * 1000) / 1000);
    return out;
  }, [min, max, step]);

  const indexOf = (v) => {
    const idx = Math.round((v - min) / step);
    return Math.max(0, Math.min(items.length - 1, idx));
  };

  const listRef = useRef(null);
  const scrollY = useSharedValue(indexOf(value) * ITEM_HEIGHT);

  useEffect(() => {
    const idx = indexOf(value);
    scrollY.value = idx * ITEM_HEIGHT;
    listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
    // Only re-sync on identity changes to min/max/step; user-driven scroll
    // already keeps scrollY and `value` in lockstep via onMomentumScrollEnd.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, step]);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const commitFromOffset = (offsetY) => {
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
    const next = items[idx];
    if (next !== value) {
      Haptics.selectionAsync();
      onChange(next);
    }
  };

  const step_ = (dir) => {
    const next = Math.max(min, Math.min(max, Math.round((value + dir * step) * 1000) / 1000));
    if (next !== value) {
      onChange(next);
      const idx = indexOf(next);
      listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: true });
    }
  };

  const display = (v) => (formatValue ? formatValue(v) : String(v));

  return (
    <View
      style={styles.wrap}
      accessibilityRole="adjustable"
      accessibilityLabel={unit ? `${unit} picker` : 'Value picker'}
      // accessibilityValue.now/min/max must be integers — React Native's New
      // Architecture throws "Loss of precision during arithmetic conversion"
      // when a fractional number (e.g. a 0.5kg-step weight like 74.5) is
      // passed here (facebook/react-native#47635). Use the integer step
      // index instead and let `text` carry the exact decimal value.
      accessibilityValue={{ min: 0, max: items.length - 1, now: indexOf(value), text: `${display(value)}${unit ? ` ${unit}` : ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step_(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <View pointerEvents="none" style={[styles.selectionWindow, { borderColor: resolvedAccentColor, backgroundColor: `${resolvedAccentColor}14` }]} />
      <Animated.FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => String(item)}
        renderItem={({ item, index }) => <WheelItem label={display(item)} index={index} scrollY={scrollY} styles={styles} />}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => commitFromOffset(e.nativeEvent.contentOffset.y)}
        contentContainerStyle={{ paddingVertical: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2 }}
        style={{ height: CONTAINER_HEIGHT }}
        importantForAccessibility="no-hide-descendants"
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
      />
      {!!unit && <Text style={styles.unit}>{unit}</Text>}
    </View>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  wrap: { height: CONTAINER_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  selectionWindow: {
    position: 'absolute',
    top: (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2,
    height: ITEM_HEIGHT,
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontFamily: FONTS.displayExtraBold, fontSize: 26, color: colors.ink },
  unit: {
    position: 'absolute', right: 28, top: '50%', marginTop: -8,
    fontFamily: FONTS.bodySemiBold, fontSize: 12, color: colors.inkMuted,
  },
}); }
