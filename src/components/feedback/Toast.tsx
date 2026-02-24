import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

interface ToastProps {
  message: string;
  image?: string;
  onClose: () => void;
  onClick?: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  image,
  onClose,
  onClick,
  duration = 5000,
}) => {
  const { colors, spacing, radius, shadows } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onClose());
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          marginHorizontal: spacing.lg,
          padding: spacing.md,
          ...shadows.xl,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={onClick}
        activeOpacity={0.8}
      >
        {image && (
          <View style={{ marginRight: spacing.md }}>
            <Avatar source={image} size="sm" />
            <View
              style={[
                styles.notifDot,
                { backgroundColor: colors.primary, borderColor: colors.surface },
              ]}
            />
          </View>
        )}
        <Text
          style={[
            styles.message,
            { color: colors.text, flex: 1 },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
        <TouchableOpacity onPress={onClose} style={{ marginLeft: spacing.sm }}>
          <Icon name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
