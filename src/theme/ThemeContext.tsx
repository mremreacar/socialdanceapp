import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, ThemeColors } from './colors';
import { typography, Typography } from './typography';
import { spacing, radius, Spacing, Radius } from './spacing';
import { shadows, coloredShadow, Shadows } from './shadows';
import { borders, Borders } from './borders';

export interface Theme {
  colors: ThemeColors;
  typography: Typography;
  spacing: Spacing;
  radius: Radius;
  shadows: Shadows;
  borders: Borders;
  isDark: boolean;
  coloredShadow: typeof coloredShadow;
}

interface ThemeContextValue extends Theme {
  toggleTheme: () => void;
  setTheme: (mode: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: 'light' | 'dark' | 'system';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'system',
}) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>(initialMode);

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemColorScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemColorScheme]);

  const theme = useMemo<ThemeContextValue>(() => ({
    colors: isDark ? darkTheme : lightTheme,
    typography,
    spacing,
    radius,
    shadows,
    borders,
    isDark,
    coloredShadow,
    toggleTheme: () => setMode(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'dark';
      return isDark ? 'light' : 'dark';
    }),
    setTheme: setMode,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
