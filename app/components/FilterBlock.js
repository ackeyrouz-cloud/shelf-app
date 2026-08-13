import React from 'react';
import { View, Text } from 'react-native';
import { common } from '../theme/common';

export function FilterBlock({ title, children, style }) {
  return (
    <View style={style}>
      <Text style={common.filterTitle}>{title}</Text>
      {children}
    </View>
  );
}
