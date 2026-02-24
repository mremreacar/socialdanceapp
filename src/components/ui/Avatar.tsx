import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from './Icon';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string;
  size?: AvatarSize;
  showBorder?: boolean;
  borderColor?: string;
  showOnline?: boolean;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 112,
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  size = 'md',
  showBorder = false,
  borderColor,
  showOnline = false,
  style,
}) => {
  const { colors, borders } = useTheme();
  const dimension = sizeMap[size];

  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              ...(showBorder
                ? {
                    borderWidth: size === 'xl' ? borders.heavy : borders.thick,
                    borderColor: borderColor || colors.border,
                  }
                : {}),
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              backgroundColor: colors.surfaceSecondary,
            },
          ]}
        >
          <Icon name="account" size={dimension * 0.6} color={colors.textTertiary} />
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: colors.success,
              borderColor: colors.surface,
              width: size === 'xs' ? 8 : 12,
              height: size === 'xs' ? 8 : 12,
              borderRadius: size === 'xs' ? 4 : 6,
              borderWidth: 2,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
