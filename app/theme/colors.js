// "Dashboard" — MyFitnessPal/Liftoff-inspired direction. A real multi-accent
// palette (not one hue doing every job), rounded pill controls. Two complete,
// independently-designed token sets — light is not a naive inversion of dark,
// each accent is deepened/re-hued so it holds contrast on its own background.
export const DARK_COLORS = {
  bg: '#0B0F17',            // page background
  surface: '#151B26',       // cards, recipe cards, tab bar
  surfaceRaised: '#1E2A3F', // inputs, pantry tags, icon badges — one step lighter than surface

  ink: '#EEF1F6',           // primary text/foreground
  inkMuted: '#8B95A8',      // secondary text
  chipInactiveText: '#C7CEDB', // unselected chip/filter label — brighter than inkMuted since it's interactive

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

  // Water — sky blue, deliberately distinct from primary's blue (the
  // calorie ring already uses primary) and from carbs' teal, so water
  // reads as its own thing next to both on the Profile dashboard.
  water: '#38BDF8',

  // Primary/success/premium/macro fills are all light-ish saturated tones,
  // so text/icons painted on top of a solid fill need a dark foreground
  // rather than `ink`, which is light in this theme.
  onFill: '#0B0F17',

  hairline: 'rgba(238,241,246,0.10)',
  errorBg: 'rgba(248,113,113,0.14)',
  errorText: '#FCA5A5',
};

export const LIGHT_COLORS = {
  bg: '#F7F8FC',            // soft cool off-white, not stark white
  surface: '#FFFFFF',
  surfaceRaised: '#EEF1FA',

  ink: '#151B26',
  inkMuted: '#6B7280',
  chipInactiveText: '#3F4757', // unselected chip/filter label — darker than inkMuted since it's interactive

  primary: '#2563EB',
  success: '#059669',
  premium: '#D97706',

  protein: '#EA580C',
  carbs: '#0D9488',
  fat: '#9333EA',
  fiber: '#65A30D',

  destructive: '#DC2626',

  water: '#0284C7',

  // Fills are now the darker, saturated element, so foreground text/icons
  // painted on top need to be white rather than `ink`.
  onFill: '#FFFFFF',

  hairline: 'rgba(21,27,38,0.08)',
  errorBg: 'rgba(220,38,38,0.08)',
  errorText: '#B91C1C',
};
