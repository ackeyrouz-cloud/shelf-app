import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS } from '../theme/colors';
import { makeCommonStyles } from '../theme/common';

const STORAGE_KEY = 'shelf.themeMode';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  // Starts on the app's established default (dark) and swaps in the stored
  // preference once AsyncStorage resolves, rather than blocking the first
  // render on it — a brief dark->light swap for light-mode users is less
  // disruptive than a blank screen for everyone on every launch.
  const [mode, setMode] = useState('dark');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') setMode(stored);
    })();
  }, []);

  const setThemeMode = (next) => {
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const toggleMode = () => setThemeMode(mode === 'dark' ? 'light' : 'dark');

  const value = useMemo(() => ({
    mode,
    colors: mode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
    isDark: mode === 'dark',
    setThemeMode,
    toggleMode,
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

export function useCommonStyles() {
  const { colors } = useTheme();
  return useMemo(() => makeCommonStyles(colors), [colors]);
}
