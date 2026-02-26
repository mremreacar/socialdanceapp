import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import { Icon } from '../ui/Icon';
import { Event } from '../../types/models';

interface EventCardProps {
  event: Event;
  onPress: () => void;
  variant?: 'list' | 'compact';
  /** Keşfet sayfası için koyu kart rengi (örn. #341A32). Verilirse yazı/ikon renkleri açık kullanılır. */
  cardBackgroundColor?: string;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, variant = 'list', cardBackgroundColor }) => {
  const { colors, spacing, radius, shadows, typography } = useTheme();
  const isDarkCard = Boolean(cardBackgroundColor);
  const bgColor = cardBackgroundColor ?? colors.cardBg;
  const borderColor = cardBackgroundColor ? 'rgba(255,255,255,0.1)' : colors.cardBorder;
  const textColor = isDarkCard ? '#FFFFFF' : colors.text;
  const textSecondaryColor = isDarkCard ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const iconColor = isDarkCard ? '#EE2AEE' : colors.primary;

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={[
          styles.compactCard,
          {
            backgroundColor: bgColor,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: borderColor,
            ...shadows.sm,
          },
        ]}
      >
        <View style={[styles.dateBadge, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }]}>
          <Text style={[{ fontSize: 20, fontWeight: '700', color: colors.primary }]}>{event.date.split(',')[0]?.slice(-2) || '01'}</Text>
          <Text style={[typography.label, { color: colors.textTertiary }]}>
            {event.date.split(',')[0]?.slice(0, 3)?.toUpperCase() || 'OCA'}
          </Text>
        </View>
        <View style={styles.compactContent}>
<Text style={[typography.bodySmallBold, { color: textColor }]} numberOfLines={1}>{event.title}</Text>
        <View style={styles.row}>
            <Icon name="map-marker-outline" size={12} color={iconColor} />
            <Text style={[typography.caption, { color: textSecondaryColor, marginLeft: 4 }]} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.listCard,
        {
          backgroundColor: bgColor,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: borderColor,
          padding: spacing.md,
          ...shadows.sm,
        },
      ]}
    >
      <Image
        source={{ uri: event.image }}
        style={[styles.image, { borderRadius: radius.lg }]}
        contentFit="cover"
        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        transition={200}
      />
      <View style={[styles.listContent, { marginLeft: spacing.lg }]}>
        <Text style={[typography.bodyBold, { color: textColor }]} numberOfLines={1}>{event.title}</Text>
        <View style={[styles.row, { marginTop: spacing.xs }]}>
          <Icon name="calendar-outline" size={14} color={iconColor} />
          <Text style={[typography.caption, { color: textSecondaryColor, marginLeft: 6, fontWeight: '500' }]}>
            {event.date}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Icon name="map-marker-outline" size={14} color={iconColor} />
          <Text style={[typography.caption, { color: textSecondaryColor, marginLeft: 6 }]} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
          <Text style={[typography.bodySmallBold, { color: iconColor }]}>{event.price}</Text>
          {event.attendees !== undefined && (
            <View style={[styles.attendeeBadge, { backgroundColor: isDarkCard ? 'rgba(255,255,255,0.12)' : colors.surfaceSecondary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs }]}>
              <Icon name="account-group-outline" size={12} color={textSecondaryColor} />
              <Text style={[{ fontSize: 10, color: textSecondaryColor, marginLeft: 4 }]}>{event.attendees} Katılımcı</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 96,
    height: 96,
  },
  listContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dateBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  compactContent: {
    flex: 1,
    gap: 4,
  },
});
