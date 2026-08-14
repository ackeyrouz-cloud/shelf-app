import React from 'react';
import { View, Text } from 'react-native';
import { useCommonStyles } from '../context/ThemeContext';

export function FilterBlock({ title, children, style }) {
  const common = useCommonStyles();
  return (
    <View style={style}>
      <Text style={common.filterTitle}>{title}</Text>
      {children}
    </View>
  );
}
