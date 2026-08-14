import React from 'react';
import { SafeAreaView, ActivityIndicator } from 'react-native';
import { useTheme, useCommonStyles } from '../context/ThemeContext';

export function LoadingScreen() {
  const { colors } = useTheme();
  const common = useCommonStyles();
  return (
    <SafeAreaView style={[common.safe, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={colors.primary} />
    </SafeAreaView>
  );
}
