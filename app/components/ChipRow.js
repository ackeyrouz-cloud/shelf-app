import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCommonStyles } from '../context/ThemeContext';

export function ChipRow({ options, value, onChange }) {
  const common = useCommonStyles();
  return (
    <View style={common.chipRow}>
      {options.map(opt => {
        const active = value === opt.v;
        return (
          <Pressable
            key={opt.v}
            style={({ pressed }) => [common.chip, active && common.chipActive, pressed && { opacity: 0.8 }]}
            onPress={() => { Haptics.selectionAsync(); onChange(opt.v); }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[common.chipText, active && common.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MultiChipRow({ options, values, onToggle }) {
  const common = useCommonStyles();
  return (
    <View style={common.chipRow}>
      {options.map(opt => {
        const active = values.includes(opt.v);
        return (
          <Pressable
            key={opt.v}
            style={({ pressed }) => [common.chip, active && common.chipActive, pressed && { opacity: 0.8 }]}
            onPress={() => { Haptics.selectionAsync(); onToggle(opt.v); }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[common.chipText, active && common.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
