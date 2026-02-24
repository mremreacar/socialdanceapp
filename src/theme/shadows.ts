import { Platform, ViewStyle } from 'react-native';

type ShadowPreset = ViewStyle;

const createShadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number
): ShadowPreset => ({
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
  }),
});

export const shadows = {
  none: createShadow(0, 0, 0, 0),
  sm: createShadow(1, 2, 0.05, 1),
  md: createShadow(2, 4, 0.08, 3),
  lg: createShadow(4, 8, 0.1, 5),
  xl: createShadow(8, 16, 0.15, 8),
  xxl: createShadow(12, 24, 0.2, 12),
} as const;

export const coloredShadow = (color: string, elevation: number = 5): ViewStyle => ({
  ...Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    android: {
      elevation,
    },
  }),
});

export type Shadows = typeof shadows;
