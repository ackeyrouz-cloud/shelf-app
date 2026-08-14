import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS } from '../theme/colors';
import { makeCommonStyles } from '../theme/common';

const STORAGE_KEY = 'shelf.themeMode';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  // Starts on the default for new users (light) and swaps in the stored
  // preference once AsyncStorage resolves, rather than blocking the first
  // render on it — a brief light->dark swap for dark-mode users is less
  // disruptive than a blank screen for everyone on every launch.
  const [mode, setMode] = useState('light');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') setMode(stored);
    })();
  }, []);

  // Ties native chrome (keyboard appearance, alerts/action sheets, date
  // pickers) to the app's own toggle rather than the device's system
  // setting — app.json's userInterfaceStyle is left as "automatic" so this
  // runtime override isn't fighting a hardcoded native declaration.
  useEffect(() => {
    Appearance.setColorScheme(mode);
  }, [mode]);

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
