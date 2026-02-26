import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../ui/Icon';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  onMenuPress?: () => void;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
  transparent?: boolean;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = true,
  showMenu = false,
  onMenuPress,
  rightIcon,
  onRightPress,
  rightComponent,
  transparent = false,
  style,
}) => {
  const navigation = useNavigation();
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: transparent ? 'transparent' : colors.headerBg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        style,
      ]}
    >
      <View style={styles.left}>
        {showMenu && (
          <TouchableOpacity
            onPress={onMenuPress}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon name="menu" size={22} color={colors.icon} />
          </TouchableOpacity>
        )}
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon name="chevron-left" size={22} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[typography.h4, { color: colors.headerText ?? colors.text }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>
        {rightComponent}
        {rightIcon && onRightPress && (
          <TouchableOpacity
            onPress={onRightPress}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon name={rightIcon} size={22} color={colors.icon} />
          </TouchableOpacity>
        )}
        {!rightComponent && !rightIcon && <View style={styles.spacer} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    width: 80,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 40,
  },
});
