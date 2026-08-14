import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView, View, Text, Pressable, TextInput, ActivityIndicator, Linking, StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { FONTS } from '../../theme/fonts';
import { useTheme } from '../../context/ThemeContext';
import { lookupOffBarcode } from '../../lib/offLookup';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'];

export function BarcodeScannerScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();

  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  // 'idle' | 'loading' | 'notFound' | 'error'
  const [lookupState, setLookupState] = useState('idle');
  const hasScannedRef = useRef(false);

  // Reset the scan lock and any stale result state whenever this screen
  // regains focus (e.g. coming back from FoodDetail to scan another item),
  // not just on mount — the screen instance stays alive underneath the
  // stack while FoodDetail is pushed on top of it.
  useFocusEffect(
    useCallback(() => {
      hasScannedRef.current = false;
      setLookupState('idle');
      setManualMode(false);
      setManualCode('');
    }, []),
  );

  const handleLookup = async (code) => {
    setLookupState('loading');
    const result = await lookupOffBarcode(code);
    if (result.food) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('FoodDetail', { food: result.food });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLookupState(result.notFound ? 'notFound' : 'error');
  };

  const onBarcodeScanned = ({ data }) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    Haptics.selectionAsync();
    handleLookup(data);
  };

  const rescan = () => {
    hasScannedRef.current = false;
    setLookupState('idle');
  };

  const submitManual = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    hasScannedRef.current = true;
    handleLookup(trimmed);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.closeBtn} accessibilityLabel="Close">
          <Feather name="x" size={24} color={colors.ink} />
        </Pressable>
        <View style={styles.permissionBody}>
          <View style={styles.permissionIcon}>
            <Feather name="camera" size={28} color={colors.success} />
          </View>
          {permission.canAskAgain ? (
            <>
              <Text style={styles.permissionTitle}>Camera access needed</Text>
              <Text style={styles.permissionText}>Shelf needs camera access to scan a product's barcode.</Text>
              <Pressable onPress={requestPermission} style={styles.permissionBtn}>
                <Text style={styles.permissionBtnText}>Grant access</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.permissionTitle}>Camera access is off</Text>
              <Text style={styles.permissionText}>Enable camera access in Settings to scan barcodes.</Text>
              <Pressable onPress={() => Linking.openSettings()} style={styles.permissionBtn}>
                <Text style={styles.permissionBtnText}>Open Settings</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={() => navigation.navigate('FoodSearch')} style={{ marginTop: 16 }}>
            <Text style={styles.searchInsteadText}>Search for it instead</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {!manualMode && lookupState === 'idle' && (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={onBarcodeScanned}
        />
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.closeBtnOverlay} accessibilityLabel="Close">
          <Feather name="x" size={24} color="#fff" />
        </Pressable>

        {!manualMode && lookupState === 'idle' && (
          <View style={styles.scanArea} pointerEvents="none">
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Point your camera at a barcode</Text>
          </View>
        )}

        {lookupState === 'loading' && (
          <View style={styles.resultCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.resultText}>Looking it up…</Text>
          </View>
        )}

        {lookupState === 'notFound' && (
          <View style={styles.resultCard}>
            <Feather name="alert-circle" size={22} color={colors.premium} />
            <Text style={styles.resultText}>That barcode isn't in Open Food Facts' database.</Text>
            <View style={styles.resultActions}>
              <Pressable onPress={rescan} style={styles.resultBtn}>
                <Text style={styles.resultBtnText}>Scan again</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('FoodSearch')} style={[styles.resultBtn, styles.resultBtnPrimary]}>
                <Text style={[styles.resultBtnText, styles.resultBtnTextPrimary]}>Search instead</Text>
              </Pressable>
            </View>
          </View>
        )}

        {lookupState === 'error' && (
          <View style={styles.resultCard}>
            <Feather name="wifi-off" size={22} color={colors.destructive} />
            <Text style={styles.resultText}>Couldn't look that up. Check your connection.</Text>
            <View style={styles.resultActions}>
              <Pressable onPress={rescan} style={[styles.resultBtn, styles.resultBtnPrimary]}>
                <Text style={[styles.resultBtnText, styles.resultBtnTextPrimary]}>Try again</Text>
              </Pressable>
            </View>
          </View>
        )}

        {manualMode && lookupState === 'idle' ? (
          <View style={styles.manualCard}>
            <Text style={styles.manualLabel}>Enter barcode number</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="e.g. 0123456789012"
                placeholderTextColor={colors.inkMuted}
                keyboardType="number-pad"
                value={manualCode}
                onChangeText={setManualCode}
                accessibilityLabel="Barcode number"
                autoFocus
              />
              <Pressable onPress={submitManual} style={styles.manualSubmit} accessibilityLabel="Look up barcode">
                <Feather name="arrow-right" size={18} color={colors.onFill} />
              </Pressable>
            </View>
            <Pressable onPress={() => setManualMode(false)}>
              <Text style={styles.manualToggle}>Use camera instead</Text>
            </Pressable>
          </View>
        ) : lookupState === 'idle' && (
          <Pressable onPress={() => setManualMode(true)} style={styles.manualToggleWrap}>
            <Text style={styles.manualToggle}>Enter barcode number manually</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors) { return StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  closeBtn: {
    position: 'absolute', top: 16, left: 16, zIndex: 1,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnOverlay: {
    width: 40, height: 40, borderRadius: 20, margin: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  scanFrame: {
    width: 260, height: 150, borderRadius: 20, borderCurve: 'continuous',
    borderWidth: 3, borderColor: colors.primary,
  },
  scanHint: {
    marginTop: 20, fontFamily: FONTS.bodySemiBold, fontSize: 14, color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
    overflow: 'hidden',
  },
  manualToggleWrap: { alignItems: 'center', paddingBottom: 24 },
  manualToggle: {
    fontFamily: FONTS.bodyBold, fontSize: 13, color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
    overflow: 'hidden',
  },
  manualCard: {
    backgroundColor: colors.surface, borderRadius: 20, borderCurve: 'continuous',
    padding: 18, margin: 16,
  },
  manualLabel: { fontFamily: FONTS.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: colors.inkMuted, marginBottom: 10 },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 16, color: colors.ink,
    backgroundColor: colors.surfaceRaised, borderRadius: 14, borderCurve: 'continuous',
    paddingHorizontal: 16, minHeight: 48,
  },
  manualSubmit: {
    width: 48, height: 48, borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  resultCard: {
    alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 20, borderCurve: 'continuous',
    padding: 22, margin: 16, marginTop: 'auto', marginBottom: 'auto',
  },
  resultText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: colors.ink, textAlign: 'center' },
  resultActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  resultBtn: {
    minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderCurve: 'continuous',
    paddingHorizontal: 16, backgroundColor: colors.surfaceRaised,
  },
  resultBtnPrimary: { backgroundColor: colors.primary },
  resultBtnText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: colors.ink },
  resultBtnTextPrimary: { color: colors.onFill },
  permissionScreen: { flex: 1, backgroundColor: colors.bg },
  permissionBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  permissionIcon: {
    width: 56, height: 56, borderRadius: 18, borderCurve: 'continuous',
    backgroundColor: `${colors.success}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  permissionTitle: { fontFamily: FONTS.displaySemiBold, fontSize: 19, color: colors.ink, textAlign: 'center' },
  permissionText: { fontFamily: FONTS.bodyRegular, fontSize: 14, color: colors.inkMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  permissionBtn: {
    marginTop: 20, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 28,
  },
  permissionBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14.5, color: colors.onFill },
  searchInsteadText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: colors.primary },
}); }
