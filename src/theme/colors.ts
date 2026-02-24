export const palette = {
  primary: '#ee2bee',
  primaryDark: '#c923c9',
  primaryLight: '#f55ef5',
  primaryAlpha10: 'rgba(238, 43, 238, 0.1)',
  primaryAlpha20: 'rgba(238, 43, 238, 0.2)',
  primaryAlpha30: 'rgba(238, 43, 238, 0.3)',

  white: '#FFFFFF',
  black: '#000000',

  zinc50: '#fafafa',
  zinc100: '#f4f4f5',
  zinc200: '#e4e4e7',
  zinc300: '#d4d4d8',
  zinc400: '#a1a1aa',
  zinc500: '#71717a',
  zinc600: '#52525b',
  zinc700: '#3f3f46',
  zinc800: '#27272a',
  zinc900: '#18181b',

  red50: '#fef2f2',
  red500: '#ef4444',
  red900: 'rgba(127, 29, 29, 0.3)',

  green500: '#22c55e',
  green50: '#f0fdf4',
  greenAlpha10: 'rgba(34, 197, 94, 0.1)',

  blue500: '#3b82f6',
  blueAlpha10: 'rgba(59, 130, 246, 0.1)',

  orange500: '#f97316',
  orangeAlpha10: 'rgba(249, 115, 22, 0.1)',
  orangeAlpha20: 'rgba(249, 115, 22, 0.2)',

  purple500: '#a855f7',
  purpleAlpha10: 'rgba(168, 85, 247, 0.1)',

  teal500: '#14b8a6',
  tealAlpha10: 'rgba(20, 184, 166, 0.1)',

  yellow500: '#eab308',
  yellowAlpha10: 'rgba(234, 179, 8, 0.1)',

  pink500: '#ec4899',

  transparent: 'transparent',
} as const;

export type ThemeColors = Record<keyof typeof lightTheme, string>;

export const lightTheme = {
  background: '#f8f8fa',
  surface: palette.white,
  surfaceSecondary: palette.zinc100,

  text: palette.zinc900,
  textSecondary: palette.zinc500,
  textTertiary: palette.zinc400,
  textInverse: palette.white,

  primary: palette.primary,
  primaryDark: palette.primaryDark,
  primaryLight: palette.primaryLight,
  primaryAlpha10: palette.primaryAlpha10,
  primaryAlpha20: palette.primaryAlpha20,
  primaryAlpha30: palette.primaryAlpha30,

  border: palette.zinc200,
  borderLight: palette.zinc100,

  icon: palette.zinc900,
  iconSecondary: palette.zinc400,

  success: palette.green500,
  successBg: palette.green50,
  successAlpha: palette.greenAlpha10,

  error: palette.red500,
  errorBg: palette.red50,
  errorBorder: palette.red900,

  warning: palette.orange500,
  warningAlpha: palette.orangeAlpha10,

  info: palette.blue500,
  infoAlpha: palette.blueAlpha10,

  purple: palette.purple500,
  purpleAlpha: palette.purpleAlpha10,

  teal: palette.teal500,
  tealAlpha: palette.tealAlpha10,

  yellow: palette.yellow500,
  yellowAlpha: palette.yellowAlpha10,

  orange: palette.orange500,
  orangeAlpha: palette.orangeAlpha10,

  pink: palette.pink500,

  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.05)',

  skeleton: palette.zinc200,

  tabBarBg: palette.white,
  tabBarBorder: palette.zinc200,
  tabBarInactive: palette.zinc400,
  tabBarActive: palette.primary,

  inputBg: palette.zinc50,
  inputBorder: palette.zinc200,
  inputPlaceholder: palette.zinc400,

  cardBg: palette.white,
  cardBorder: palette.zinc100,

  headerBg: 'rgba(248, 248, 250, 0.95)',
};

export const darkTheme: ThemeColors = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceSecondary: palette.zinc800,

  text: palette.white,
  textSecondary: palette.zinc400,
  textTertiary: palette.zinc500,
  textInverse: palette.zinc900,

  primary: palette.primary,
  primaryDark: palette.primaryDark,
  primaryLight: palette.primaryLight,
  primaryAlpha10: palette.primaryAlpha10,
  primaryAlpha20: palette.primaryAlpha20,
  primaryAlpha30: palette.primaryAlpha30,

  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.04)',

  icon: palette.white,
  iconSecondary: palette.zinc500,

  success: palette.green500,
  successBg: 'rgba(34,197,94,0.1)',
  successAlpha: palette.greenAlpha10,

  error: palette.red500,
  errorBg: 'rgba(239,68,68,0.1)',
  errorBorder: palette.red900,

  warning: palette.orange500,
  warningAlpha: palette.orangeAlpha10,

  info: palette.blue500,
  infoAlpha: palette.blueAlpha10,

  purple: palette.purple500,
  purpleAlpha: palette.purpleAlpha10,

  teal: palette.teal500,
  tealAlpha: palette.tealAlpha10,

  yellow: palette.yellow500,
  yellowAlpha: palette.yellowAlpha10,

  orange: palette.orange500,
  orangeAlpha: palette.orangeAlpha10,

  pink: palette.pink500,

  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(255,255,255,0.05)',

  skeleton: palette.zinc700,

  tabBarBg: '#1e1e1e',
  tabBarBorder: 'rgba(255,255,255,0.05)',
  tabBarInactive: palette.zinc500,
  tabBarActive: palette.primary,

  inputBg: palette.zinc800,
  inputBorder: 'rgba(255,255,255,0.08)',
  inputPlaceholder: palette.zinc500,

  cardBg: '#1e1e1e',
  cardBorder: 'rgba(255,255,255,0.05)',

  headerBg: 'rgba(18, 18, 18, 0.95)',
};
