import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from './Icon';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  style,
}) => {
  const { colors, radius, spacing, shadows } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderRadius: radius.full,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderWidth: selected ? 0 : 1,
          borderColor: colors.border,
          ...(selected ? shadows.md : {}),
        },
        style,
      ]}
    >
      {icon && (
        <Icon
          name={selected ? 'check' : icon}
          size={16}
          color={selected ? colors.textInverse : colors.textSecondary}
          style={{ marginRight: spacing.xs }}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: selected ? colors.textInverse : colors.textSecondary,
            fontSize: 14,
            fontWeight: selected ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {},
});
