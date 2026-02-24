import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from '../ui/Icon';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.surfaceSecondary,
            borderRadius: radius.full,
            padding: spacing.lg,
          },
        ]}
      >
        <Icon name={icon} size={32} color={colors.textTertiary} />
      </View>
      <Text style={[typography.bodySmallBold, { color: colors.textSecondary, marginTop: spacing.md }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'center' }]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="ghost"
          size="sm"
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 4,
  },
});
