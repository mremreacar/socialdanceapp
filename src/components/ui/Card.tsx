import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  variant?: 'default' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padded = true,
  variant = 'default',
}) => {
  const { colors, radius, shadows, spacing, borders } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.cardBg,
          borderRadius: radius.xl,
          borderWidth: borders.thin,
          borderColor: colors.cardBorder,
          ...(padded ? { padding: spacing.lg } : {}),
          ...(variant === 'default' ? shadows.sm : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
