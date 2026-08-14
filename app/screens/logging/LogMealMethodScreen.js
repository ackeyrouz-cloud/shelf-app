import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONTS } from '../../theme/fonts';
import { useTheme, useCommonStyles } from '../../context/ThemeContext';

const ICON_SETS = { Feather, MaterialCommunityIcons };

// Hub for how to log a meal — Search, Enter Manually, Scan Barcode, Describe
// a Meal, Photo Estimate.
function MethodRow({ colors, styles, icon, iconFamily = 'Feather', iconColor, label, sublabel, onPress }) {
  const IconComponent = ICON_SETS[iconFamily];
  const handlePress = () => { Haptics.selectionAsync(); onPress(); };
  return (
    <Pressable onPress={handlePress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}22` }]}>
        <IconComponent name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSublabel}>{sublabel}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.inkMuted} />
    </Pressable>
  );
}

export function LogMealMethodScreen({ navigation }) {
  const { colors } = useTheme();
  const common = useCommonStyles();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={common.safe}>
      <View style={[common.wrap, { flex: 1 }]}>
        <View style={[common.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Close">
            <Feather name="x" size={24} color={colors.ink} />
          </Pressable>
          <Text style={[common.h1, { marginTop: 0 }]}>Log a meal</Text>
        </View>
        <Text style={common.tagline}>How do you want to log this?</Text>

        <View style={[common.card, { marginTop: 20, paddingVertical: 4 }]}>
          <MethodRow
            colors={colors}
            styles={styles}
            icon="search"
            iconColor={colors.primary}
            label="Search foods"
            sublabel="Find a food or product to log"
            onPress={() => navigation.navigate('FoodSearch')}
          />
          <MethodRow
            colors={colors}
            styles={styles}
            icon="edit-3"
            iconColor={colors.fat}
            label="Enter manually"
            sublabel="Type in the nutrition info directly"
            onPress={() => navigation.navigate('LogMeal')}
          />
          <MethodRow
            colors={colors}
            styles={styles}
            icon="barcode-scan"
            iconFamily="MaterialCommunityIcons"
            iconColor={colors.success}
            label="Scan barcode"
            sublabel="Scan a product's barcode to log it"
            onPress={() => navigation.navigate('BarcodeScanner')}
          />
          <MethodRow
            colors={colors}
            styles={styles}
            icon="mic"
            iconColor={colors.premium}
            label="Describe a meal"
            sublabel="Describe what you ate, get an estimate"
            onPress={() => navigation.navigate('DescribeMeal')}
          />
          <MethodRow
            colors={colors}
            styles={styles}
            icon="camera"
            iconColor={colors.carbs}
            label="Photo estimate"
            sublabel="Snap a photo, get a rough estimate"
            onPress={() => navigation.navigate('PhotoMeal')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: FONTS.bodyBold, fontSize: 16, color: colors.ink },
  rowSublabel: { fontFamily: FONTS.bodyRegular, fontSize: 12.5, color: colors.inkMuted, marginTop: 2 },
}); }
