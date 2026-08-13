import React from 'react';
import { SafeAreaView, View, Text } from 'react-native';
import { common } from '../theme/common';
import { PrimaryButton } from '../components/PrimaryButton';
import { useProfile } from '../context/ProfileContext';

export function ProfileErrorScreen() {
  const { profileError, loadProfile } = useProfile();
  return (
    <SafeAreaView style={[common.safe, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
      <View style={common.errorBox}><Text style={common.errorText}>{profileError}</Text></View>
      <PrimaryButton label="Try again" onPress={loadProfile} style={{ marginTop: 16, alignSelf: 'stretch' }} />
    </SafeAreaView>
  );
}
