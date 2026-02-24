import React from 'react';
import { View, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  statusBarStyle?: 'light-content' | 'dark-content';
  backgroundColor?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  edges = ['top'],
  statusBarStyle,
  backgroundColor,
}) => {
  const { colors, isDark } = useTheme();
  const bgColor = backgroundColor || colors.background;
  const barStyle = statusBarStyle || (isDark ? 'light-content' : 'dark-content');

  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: bgColor }, style]}
    >
      <StatusBar barStyle={barStyle} backgroundColor={bgColor} />
      {children}
    </SafeAreaView>
  );
};
