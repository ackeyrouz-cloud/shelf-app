import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, Pressable,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { PrimaryButton } from '../../components/PrimaryButton';
import { estimateMeal, foodFromEstimate } from '../../lib/mealEstimate';

// Fast, single-pass estimation — not a chat. At most one clarifying
// question is ever asked (see /estimate-meal's mustEstimate contract); the
// moment an estimate comes back, this hands off to the same FoodDetailScreen
// quantity/unit picker and logMeal() path search and barcode scanning use.
export function DescribeMealScreen({ navigation }) {
  const { colors } = useTheme();
  const common = useCommonStyles();

  const [description, setDescription] = useState('');
  const [clarifyingQuestion, setClarifyingQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const isAnswering = !!clarifyingQuestion;
    const text = (isAnswering ? answer : description).trim();
    if (!text) return;

    setError('');
    setLoading(true);
    const combinedDescription = isAnswering ? `${description.trim()} — ${text}` : text;
    const result = await estimateMeal(combinedDescription, { mustEstimate: isAnswering });
    setLoading(false);

    if (result.error) {
      setError(
        result.error === 'timeout' ? 'This is taking longer than expected — try again.'
          : result.error === 'overloaded' ? 'The estimator is briefly overloaded — try again in a moment.'
          : "Couldn't estimate that. Try rephrasing, or check your connection."
      );
      return;
    }
    if (result.needsClarification) {
      setClarifyingQuestion(result.question);
      setAnswer('');
      return;
    }
    const food = foodFromEstimate(result.estimate);
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
            <Text style={[common.h1, { marginTop: 0 }]}>Describe a meal</Text>
          </View>

          {!clarifyingQuestion ? (
            <>
              <Text style={common.tagline}>Describe what you ate — Claude will estimate the nutrition. A specific description (dish, rough portion) gets a better estimate.</Text>
              <View style={[common.card, { marginTop: 20 }]}>
                <TextInput
                  style={[common.input, { minHeight: 100, textAlignVertical: 'top', paddingTop: 14 }]}
                  placeholder="e.g. grilled chicken caesar salad, regular portion"
                  placeholderTextColor={colors.inkMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  accessibilityLabel="Meal description"
                  autoFocus
                />
              </View>
            </>
          ) : (
            <>
              <Text style={common.tagline}>One quick question first:</Text>
              <View style={[common.card, { marginTop: 20 }]}>
                <Text style={[common.filterTitle, { marginBottom: 10 }]}>{clarifyingQuestion}</Text>
                <TextInput
                  style={common.input}
                  placeholder="Your answer"
                  placeholderTextColor={colors.inkMuted}
                  value={answer}
                  onChangeText={setAnswer}
                  accessibilityLabel="Answer"
                  autoFocus
                  onSubmitEditing={submit}
                  returnKeyType="done"
                />
              </View>
            </>
          )}

          <PrimaryButton label={loading ? 'Estimating…' : 'Estimate nutrition'} onPress={submit} disabled={loading} />

          {loading && <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />}
          {!!error && (
            <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
