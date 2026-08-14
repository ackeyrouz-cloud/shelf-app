import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable, Image,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { FilterBlock } from '../../components/FilterBlock';
import { PrimaryButton } from '../../components/PrimaryButton';
import { estimateMealPhoto, foodFromPhotoEstimate } from '../../lib/mealEstimate';

// The least reliable of the five logging methods — no portion-size
// reference, hidden ingredients (oil, dressing) usually aren't visible —
// so failure is treated as a real, expected outcome with a clear path to
// "Describe a meal" instead, not just a generic error retry loop.
export function PhotoMealScreen({ navigation }) {
  const { colors } = useTheme();
  const common = useCommonStyles();

  const [photo, setPhoto] = useState(null); // { uri, base64 }
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');

  const takePhoto = async () => {
    setError('');
    setFailed(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Enable camera access in Settings to photograph a meal.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, allowsEditing: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPhoto({ uri: asset.uri, base64: asset.base64 });
  };

  const retake = () => {
    setPhoto(null);
    setCaption('');
    setFailed(false);
    setError('');
  };

  const submit = async () => {
    if (!photo) return;
    setError('');
    setFailed(false);
    setLoading(true);
    const result = await estimateMealPhoto(photo.base64, 'image/jpeg', caption);
    setLoading(false);

    if (result.error) {
      setError(
        result.error === 'timeout' ? 'This is taking longer than expected — try again.'
          : result.error === 'overloaded' ? 'The estimator is briefly overloaded — try again in a moment.'
          : "Couldn't reach the server. Check your connection and try again."
      );
      return;
    }
    if (!result.canEstimate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFailed(true);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const food = foodFromPhotoEstimate(result.estimate);
    navigation.navigate('FoodDetail', {
      food, defaultQuantity: result.estimate.estimatedGrams, defaultUnit: 'g',
    });
  };

  return (
    <SafeAreaView style={common.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={common.wrap} keyboardShouldPersistTaps="handled">
          <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Close">
              <Feather name="x" size={24} color={colors.ink} />
            </Pressable>
            <Text style={[common.h1, { marginTop: 0 }]}>Photo estimate</Text>
          </View>
          <Text style={common.tagline}>
            Snap a photo of your meal and Claude will estimate the nutrition. This is the least precise logging
            method — portion size and hidden ingredients (oil, dressing, sauce) can only be guessed from a photo.
          </Text>

          {!photo ? (
            <Pressable onPress={takePhoto} style={[common.card, { marginTop: 20, alignItems: 'center', paddingVertical: 32 }]}>
              <View style={{
                width: 56, height: 56, borderRadius: 18, borderCurve: 'continuous',
                backgroundColor: `${colors.carbs}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Feather name="camera" size={26} color={colors.carbs} />
              </View>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: colors.ink }}>Take a photo</Text>
            </Pressable>
          ) : (
            <View style={[common.card, { marginTop: 20 }]}>
              <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 200, borderRadius: 14, borderCurve: 'continuous' }} />
              <Pressable onPress={retake} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <Text style={common.expandHint}>Retake photo</Text>
              </Pressable>

              {!failed && (
                <View style={{ marginTop: 14 }}>
                  <FilterBlock title="Anything to add? (optional)">
                    <TextInput
                      style={common.input}
                      placeholder="e.g. no dressing, half portion"
                      placeholderTextColor={colors.inkMuted}
                      value={caption}
                      onChangeText={setCaption}
                      accessibilityLabel="Optional note about the photo"
                    />
                  </FilterBlock>
                </View>
              )}
            </View>
          )}

          {failed && (
            <View style={[common.card, { marginTop: 14, alignItems: 'center' }]}>
              <Feather name="alert-circle" size={22} color={colors.premium} />
              <Text style={[common.tagline, { marginTop: 8, textAlign: 'center' }]}>
                Couldn't get a clear enough read on that photo to estimate.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable onPress={retake} style={{
                  minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderCurve: 'continuous',
                  paddingHorizontal: 16, backgroundColor: colors.surfaceRaised,
                }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: colors.ink }}>Try another photo</Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.replace('DescribeMeal')}
                  style={{
                    minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderCurve: 'continuous',
                    paddingHorizontal: 16, backgroundColor: colors.primary,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: colors.onFill }}>Describe it instead</Text>
                </Pressable>
              </View>
            </View>
          )}

          {photo && !failed && (
            <PrimaryButton label={loading ? 'Estimating…' : 'Estimate nutrition'} onPress={submit} disabled={loading} />
          )}

          {loading && <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />}
          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
