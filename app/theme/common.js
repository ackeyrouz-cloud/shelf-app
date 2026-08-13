import { StyleSheet } from 'react-native';
import { COLORS } from './colors';
import { FONTS } from './fonts';

// Shared style atoms reused across screens: layout shells, the card surface,
// text inputs, chips/filter rows, the primary CTA, and error boxes. Screen- or
// component-specific styles (recipe card, pantry tags, etc.) live alongside
// the component that uses them instead of here.
export const common = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: { paddingHorizontal: 18, paddingBottom: 60 },
  header: { paddingTop: 24, paddingBottom: 12 },

  eyebrow: {
    fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 1.5,
    textTransform: 'uppercase', color: COLORS.primary,
  },
  h1: { fontFamily: FONTS.displayExtraBold, fontSize: 32, color: COLORS.ink, marginTop: 10, letterSpacing: -0.3 },
  tagline: { fontFamily: FONTS.bodyRegular, fontSize: 15, color: COLORS.inkMuted, marginTop: 6, lineHeight: 21 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 16,
    borderCurve: 'continuous',
    boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
    borderWidth: 1, borderColor: 'rgba(238,241,246,0.06)',
  },
  input: {
    flex: 1, fontFamily: FONTS.bodyRegular, fontSize: 15, paddingVertical: 12, paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: 14, borderCurve: 'continuous',
    backgroundColor: COLORS.surfaceRaised, color: COLORS.ink,
  },

  filterTitle: { fontFamily: FONTS.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.inkMuted, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    borderWidth: 1.5, borderColor: 'rgba(238,241,246,0.14)', borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#C7CEDB' },
  chipTextActive: { color: COLORS.onFill },

  cta: { marginTop: 24, backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 17, alignItems: 'center' },
  ctaText: { fontFamily: FONTS.displayExtraBold, fontSize: 16, letterSpacing: 0.2, color: COLORS.onFill },

  errorBox: { marginTop: 16, backgroundColor: COLORS.errorBg, borderRadius: 14, borderCurve: 'continuous', padding: 14 },
  errorText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.errorText, lineHeight: 19 },

  expandHint: { fontFamily: FONTS.bodySemiBold, fontSize: 12.5, color: COLORS.inkMuted, marginTop: 8 },

  footer: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.inkMuted, textAlign: 'center', marginTop: 32, letterSpacing: 0.5 },
});
