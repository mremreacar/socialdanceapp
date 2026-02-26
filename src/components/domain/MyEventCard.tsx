import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';

export interface MyEventCardData {
  id: number | string;
  title: string;
  location: string;
  date: string;
  day?: string;
  month?: string;
  image: string;
  isFavorite?: boolean;
  isPopular?: boolean;
  attendees?: number;
  attendeeAvatars?: string[];
  isDanceQueen?: boolean;
}

interface MyEventCardProps {
  event: MyEventCardData;
  onPress: () => void;
  onFavoritePress?: () => void;
  onReservationPress?: () => void;
}

const CARD_BG = '#331C3C';
const POPULAR_BG = '#6B2D7A';
const SEPARATOR = 'rgba(255,255,255,0.12)';

export const MyEventCard: React.FC<MyEventCardProps> = ({
  event,
  onPress,
  onFavoritePress,
  onReservationPress,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const avatars = event.attendeeAvatars ?? [
    'https://i.pravatar.cc/150?u=21',
    'https://i.pravatar.cc/150?u=22',
  ];
  const extraCount = event.attendees != null ? Math.max(0, event.attendees - avatars.length) : 24;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={[styles.card, { backgroundColor: CARD_BG, borderRadius: radius.xl }]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: event.image }}
          style={[styles.image, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={200}
        />
        {event.isPopular && (
          <View style={[styles.popularBadge, { backgroundColor: POPULAR_BG, borderRadius: radius.full }]}>
            <Icon name="fire" size={12} color="#FFF" />
            <Text style={styles.popularText}>Popüler</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onFavoritePress?.();
          }}
          style={styles.favButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name={event.isFavorite ? 'heart' : 'heart-outline'} size={22} color={event.isFavorite ? '#EE2AEE' : '#FFF'} />
        </TouchableOpacity>
      </View>

      <View style={[styles.body, { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }]}>
        <Text style={[typography.h4, { color: '#FFF', marginBottom: spacing.xs }]} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.row}>
          <Icon name="calendar-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', marginLeft: 6 }]}>{event.date}</Text>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Icon name="map-marker-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)', marginLeft: 6 }]} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: SEPARATOR, marginHorizontal: spacing.lg }]} />

      <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }]}>
        <View style={styles.avatarsRow}>
          {avatars.slice(0, 2).map((uri, i) => (
            <Avatar key={i} source={uri} size="sm" showBorder borderColor={CARD_BG} style={i === 1 ? styles.avatarOverlap : undefined} />
          ))}
          {extraCount > 0 && (
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', marginLeft: 6 }]}>+{extraCount}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onReservationPress?.();
          }}
          activeOpacity={0.9}
          style={styles.reservationBtn}
        >
          <LinearGradient
            colors={[colors.primary, colors.purple ?? '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.reservationGradient, { borderRadius: radius.lg }]}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFF' }]}>Rezervasyon Yap</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  popularText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  favButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  reservationBtn: {
    overflow: 'hidden',
  },
  reservationGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
