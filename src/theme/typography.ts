import { TextStyle } from 'react-native';

export const fontFamily = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  bold: 'Poppins_700Bold',
} as const;

export const typography = {
  h1: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 36,
  },
  h2: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 30,
  },
  h3: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 26,
  },
  h4: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodyLight: {
    fontFamily: 'Poppins_300Light',
    fontSize: 16,
    fontWeight: '300' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  bodySmallLight: {
    fontFamily: 'Poppins_300Light',
    fontSize: 14,
    fontWeight: '300' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  bodySmallMedium: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  bodySmallBold: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  captionBold: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  label: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  button: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  buttonSmall: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 18,
  },
} as const;

export type Typography = typeof typography;
