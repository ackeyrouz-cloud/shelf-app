import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { usePantry } from '../../context/PantryContext';
import { parseLocalDate } from '../../lib/mealLogs';
import { getMealPlansForWeek } from '../../lib/mealPlans';
import { getShoppingListForWeek, generateShoppingList, toggleShoppingListItem } from '../../lib/shoppingList';

export function ShoppingListScreen({ navigation, route }) {
  const { weekStartDate } = route.params;
  const { userId } = useAuth();
  const { pantry } = usePantry();
  const { colors } = useTheme();
  const common = useCommonStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [hasGeneratedBefore, setHasGeneratedBefore] = useState(true);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const { data } = await getShoppingListForWeek(weekStartDate);
    setItems(data);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate]);

  useFocusEffect(useCallback(() => { fetchList(); }, [fetchList]));

  const handleGenerate = async () => {
    Haptics.selectionAsync();
    setGenerating(true);
    setError('');
    const { data: plans } = await getMealPlansForWeek(parseLocalDate(weekStartDate));
    const { data, error: genError, empty } = await generateShoppingList({
      userId, weekStartDate, plans, pantry: pantry.map((p) => p.name),
    });
    setGenerating(false);
    if (genError) {
      setError(
        genError === 'timeout' ? 'This is taking longer than expected — try again.'
          : genError === 'overloaded' ? 'The list builder is briefly overloaded — try again in a moment.'
          : "Couldn't generate a shopping list. Try again."
      );
      return;
    }
    if (empty) {
      setHasGeneratedBefore(false);
      setItems([]);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHasGeneratedBefore(true);
    setItems(data);
  };

  const handleToggle = (item) => {
    Haptics.selectionAsync();
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    toggleShoppingListItem(item.id, !item.checked);
  };

  const uncheckedCount = items.filter((i) => !i.checked).length;

  return (
    <SafeAreaView style={common.safe}>
      <ScrollView contentContainerStyle={common.wrap}>
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={common.eyebrow}>SHOPPING LIST</Text>
            <Text style={[common.h1, { marginTop: 0 }]}>This week</Text>
          </View>
        </View>

        <Pressable onPress={handleGenerate} disabled={generating} style={[styles.generateBtn, generating && { opacity: 0.6 }]}>
          {generating ? <ActivityIndicator color={colors.onFill} /> : (
            <>
              <Feather name="refresh-cw" size={16} color={colors.onFill} />
              <Text style={styles.generateBtnText}>{items.length ? 'Refresh list' : 'Generate list'}</Text>
            </>
          )}
        </Pressable>
        {items.length > 0 && (
          <Text style={[common.tagline, { textAlign: 'center', marginTop: 8 }]}>Regenerating may reset some checked items.</Text>
        )}

        {!!error && (
          <View style={common.errorBox}><Text style={common.errorText}>{error}</Text></View>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.success} />
        ) : items.length === 0 ? (
          <Text style={[common.tagline, { textAlign: 'center', marginTop: 24 }]}>
            {hasGeneratedBefore
              ? 'No shopping list yet — generate one from this week\'s planned recipes.'
              : "This week doesn't have any generated recipes planned yet — assign some from Plan my week, then come back to build a list."}
          </Text>
        ) : (
          <View style={{ marginTop: 20 }}>
            <Text style={common.filterTitle}>{uncheckedCount} of {items.length} left</Text>
            <View style={[common.card, { marginTop: 8, paddingVertical: 4 }]}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleToggle(item)}
                  style={styles.itemRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                  accessibilityLabel={item.item_name}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxActive]}>
                    {!!item.checked && <Feather name="check" size={13} color={colors.onFill} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>{item.item_name}</Text>
                    {!!item.item_note && <Text style={styles.itemNote}>{item.item_note}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.success, borderRadius: 999, borderCurve: 'continuous', minHeight: 48,
  },
  generateBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: colors.onFill },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 6 },
  checkbox: {
    width: 22, height: 22, borderWidth: 1.5, borderColor: colors.hairline, borderRadius: 7, borderCurve: 'continuous',
    backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.success, borderColor: colors.success },
  itemName: { fontFamily: FONTS.bodySemiBold, fontSize: 14.5, color: colors.ink },
  itemNameChecked: { color: colors.inkMuted, textDecorationLine: 'line-through' },
  itemNote: { fontFamily: FONTS.bodyRegular, fontSize: 11.5, color: colors.inkMuted, marginTop: 1 },
}); }
