import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface BadgeProps {
  count?: number;
  label?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  count,
  label,
  variant = 'primary',
  size = 'sm',
  style,
}) => {
  const { colors, radius, spacing } = useTheme();

  const variantColors: Record<string, { bg: string; text: string }> = {
    primary: { bg: colors.primary, text: colors.textInverse },
    success: { bg: colors.success, text: colors.textInverse },
    warning: { bg: colors.warning, text: colors.textInverse },
    error: { bg: colors.error, text: colors.textInverse },
    info: { bg: colors.info, text: colors.textInverse },
  };

  const v = variantColors[variant];
  const isSmall = size === 'sm';
  const displayText = label || (count !== undefined ? String(count) : '');

  if (!displayText && count === undefined) {
    return (
      <View
        style={[
          {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: v.bg,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: v.bg,
          borderRadius: radius.full,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md,
          height: isSmall ? 20 : 24,
          minWidth: isSmall ? 20 : 24,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: v.text,
            fontSize: isSmall ? 10 : 12,
          },
        ]}
      >
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
