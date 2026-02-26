import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';

interface UserListItemProps {
  name: string;
  subtitle?: string;
  avatar: string;
  onPress?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  rightVariant?: 'primary' | 'outline';
  showOnline?: boolean;
  unreadCount?: number;
  timestamp?: string;
  /** İsim rengi (varsayılan: theme text) */
  nameColor?: string;
  /** Alt yazı rengi (varsayılan: theme textSecondary) */
  subtitleColor?: string;
  /** Sağ buton border rengi (outline variant için) */
  rightButtonBorderColor?: string;
  /** Sağ buton yazı rengi (outline variant için) */
  rightButtonTextColor?: string;
}

export const UserListItem: React.FC<UserListItemProps> = ({
  name,
  subtitle,
  avatar,
  onPress,
  rightLabel,
  onRightPress,
  rightVariant = 'outline',
  showOnline = false,
  unreadCount,
  timestamp,
  nameColor,
  subtitleColor,
  rightButtonBorderColor,
  rightButtonTextColor,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const finalNameColor = nameColor ?? colors.text;
  const finalSubtitleColor = subtitleColor ?? colors.textSecondary;
  const outlineBorderColor = rightButtonBorderColor ?? colors.border;
  const outlineTextColor = rightButtonTextColor ?? colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { paddingVertical: spacing.md }]}
      disabled={!onPress}
    >
      <Avatar source={avatar} size="md" showOnline={showOnline} />
      <View style={[styles.content, { marginLeft: spacing.md }]}>
        <View style={styles.nameRow}>
          <Text style={[typography.bodySmallBold, { color: finalNameColor, flex: 1 }]} numberOfLines={1}>{name}</Text>
          {timestamp && (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>{timestamp}</Text>
          )}
        </View>
        {subtitle && (
          <Text style={[typography.caption, { color: finalSubtitleColor, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightLabel && (
        <TouchableOpacity
          onPress={onRightPress}
          style={[
            styles.rightButton,
            {
              backgroundColor: rightVariant === 'primary' ? colors.primary : 'transparent',
              borderWidth: rightVariant === 'outline' ? 1 : 0,
              borderColor: rightVariant === 'outline' ? outlineBorderColor : colors.border,
              borderRadius: radius.full,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              typography.captionBold,
              { color: rightVariant === 'primary' ? colors.textInverse : outlineTextColor },
            ]}
          >
            {rightLabel}
          </Text>
        </TouchableOpacity>
      )}
      {unreadCount !== undefined && unreadCount > 0 && (
        <Badge count={unreadCount} variant="primary" size="sm" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightButton: {
    marginLeft: 12,
  },
});
