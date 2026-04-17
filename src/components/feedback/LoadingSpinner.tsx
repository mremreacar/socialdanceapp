import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  fullScreen = false,
  color,
}) => {
  const { colors, spacing, typography } = useTheme();
  const indicatorColor = color ?? colors.primary;

  const content = (
    <View style={styles.inner}>
      <ActivityIndicator size="large" color={indicatorColor} />
      {message && (
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.md }]}>
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
