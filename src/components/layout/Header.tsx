import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../ui/Icon';

const headerLogo = require('../../../assets/header-logo.png');

interface HeaderProps {
  title: string;
  /** Başlık yerine logo göster (ana sayfalar için) */
  showLogo?: boolean;
  showBack?: boolean;
  /** Geri butonuna özel davranış (verilmezse navigation.goBack()) */
  onBackPress?: () => void;
  showMenu?: boolean;
  onMenuPress?: () => void;
  showNotification?: boolean;
  onNotificationPress?: () => void;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
  transparent?: boolean;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showLogo = false,
  showBack = true,
  onBackPress,
  showMenu = false,
  onMenuPress,
  showNotification = false,
  onNotificationPress,
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
                backgroundColor: 'transparent',
                borderRadius: radius.full,
                borderWidth: 0.5,
                borderColor: '#9CA3AF',
              },
            ]}
          >
            <Icon name="menu" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        {showBack && (
          <TouchableOpacity
            onPress={onBackPress ?? (() => navigation.goBack())}
            style={[
              styles.iconButton,
              {
                backgroundColor: 'transparent',
                borderRadius: radius.full,
                borderWidth: 0.5,
                borderColor: '#9CA3AF',
              },
            ]}
          >
            <Icon name="chevron-left" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {showLogo ? (
        <View style={styles.headerLogoWrap}>
          <Image source={headerLogo} style={styles.headerLogo} resizeMode="contain" />
        </View>
      ) : (
        <Text style={[typography.h4, { color: colors.headerText ?? colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      )}

      <View style={styles.right}>
        {showNotification && onNotificationPress && (
          <TouchableOpacity
            onPress={onNotificationPress}
            style={[
              styles.iconButton,
              {
                backgroundColor: 'transparent',
                borderRadius: radius.full,
                borderWidth: 0.5,
                borderColor: '#9CA3AF',
              },
            ]}
          >
            <Icon name="bell-outline" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        {rightComponent}
        {rightIcon && onRightPress && (
          <TouchableOpacity
            onPress={onRightPress}
            style={[
              styles.iconButton,
              {
                backgroundColor: 'transparent',
                borderRadius: radius.full,
                borderWidth: 0.5,
                borderColor: '#9CA3AF',
              },
            ]}
          >
            <Icon name={rightIcon} size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        {!rightComponent && !rightIcon && !showNotification && <View style={styles.spacer} />}
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
  headerLogoWrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerLogo: {
    height: 50,
    width: 140,
  },
});
