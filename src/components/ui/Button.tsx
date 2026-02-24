import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const { colors, typography, radius, shadows, spacing } = useTheme();

  const sizeStyles: Record<ButtonSize, { height: number; paddingH: number; fontSize: number; iconSize: number }> = {
    sm: { height: 36, paddingH: spacing.lg, fontSize: 12, iconSize: 16 },
    md: { height: 48, paddingH: spacing.xl, fontSize: 14, iconSize: 18 },
    lg: { height: 56, paddingH: spacing.xxl, fontSize: 16, iconSize: 20 },
  };

  const s = sizeStyles[size];

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: colors.primary, ...shadows.lg },
          text: { color: colors.textInverse },
          iconColor: colors.textInverse,
        };
      case 'secondary':
        return {
          container: { backgroundColor: colors.surfaceSecondary },
          text: { color: colors.text },
          iconColor: colors.text,
        };
      case 'outline':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
          text: { color: colors.text },
          iconColor: colors.text,
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: colors.primary },
          iconColor: colors.primary,
        };
      case 'danger':
        return {
          container: { backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder },
          text: { color: colors.error },
          iconColor: colors.error,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingH,
          borderRadius: radius.xl,
          opacity: disabled ? 0.5 : 1,
        },
        variantStyles.container,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={s.iconSize} color={variantStyles.iconColor} style={{ marginRight: spacing.sm }} />}
          <Text style={[{ fontSize: s.fontSize, fontWeight: '700' }, variantStyles.text, textStyle]}>
            {title}
          </Text>
          {iconRight && <Icon name={iconRight} size={s.iconSize} color={variantStyles.iconColor} style={{ marginLeft: spacing.sm }} />}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
