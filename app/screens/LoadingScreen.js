import React from 'react';
import { SafeAreaView, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme/colors';
import { common } from '../theme/common';

export function LoadingScreen() {
  return (
    <SafeAreaView style={[common.safe, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={COLORS.primary} />
    </SafeAreaView>
  );
}
