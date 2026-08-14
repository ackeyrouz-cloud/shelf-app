// "Dashboard" — MyFitnessPal/Liftoff-inspired direction. Dark navy surfaces,
// a real multi-accent palette (not one hue doing every job), rounded pill
// controls. Replaces the kraft-paper/stamp and Night Kitchen identities
// entirely — see the design review for the base-token provenance (dashboard
// + fitness-app rows from the UI/UX Pro Max color database).
export const COLORS = {
  bg: '#0B0F17',            // page background
  surface: '#151B26',       // cards, recipe cards, tab bar
  surfaceRaised: '#1E2A3F', // inputs, pantry tags, icon badges — one step lighter than surface

  ink: '#EEF1F6',           // primary text/foreground
  inkMuted: '#8B95A8',      // secondary text

  primary: '#3B82F6',       // CTA, links, Shelf tab
  success: '#34D399',       // "ready to cook", positive states, Recipes tab
  premium: '#F5B93F',       // secondary/gold accent

  // Macro colors — fixed mapping, used identically everywhere a macro
  // appears (recipe cards, recipe detail, Profile dashboard). Never swap
  // these per-screen.
  protein: '#FB923C',
  carbs: '#2DD4BF',
  fat: '#C084FC',           // also the Profile tab's color
  fiber: '#A3E635',         // lime — distinct from success-green and premium-gold

  destructive: '#F87171',

  // Primary/success/premium/macro fills are all light-ish saturated tones,
  // so text/icons painted on top of a solid fill need a dark foreground
  // rather than `ink`, which is light in this theme.
  onFill: '#0B0F17',

  hairline: 'rgba(238,241,246,0.10)',
  errorBg: 'rgba(248,113,113,0.14)',
  errorText: '#FCA5A5',
};
