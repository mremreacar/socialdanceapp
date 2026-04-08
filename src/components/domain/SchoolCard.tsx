import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import { Icon } from '../ui/Icon';
import { School } from '../../types/models';

interface SchoolCardProps {
  school: School;
  onPress: () => void;
  variant?: 'featured' | 'list';
  /** Koyu kart rengi (örn. #281328). Verilirse yazılar açık renk kullanılır. */
  cardBackgroundColor?: string;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({ school, onPress, variant = 'featured', cardBackgroundColor }) => {
  const { colors, spacing, radius, shadows, typography } = useTheme();
  const isDark = Boolean(cardBackgroundColor);
  const bgColor = cardBackgroundColor ?? colors.cardBg;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : colors.cardBorder;
  const textColor = isDark ? '#FFFFFF' : colors.text;
  const textSecondaryColor = isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const textTertiaryColor = isDark ? 'rgba(255,255,255,0.6)' : colors.textTertiary;
  const accentColor = isDark ? '#EE2AEE' : colors.primary;
  const hasImage = Boolean(school.image && school.image.trim().length > 0);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const schoolImageSource = hasImage && !imageLoadFailed
    ? { uri: school.image.trim() }
    : require('../../../assets/social_dance.png');

  useEffect(() => {
    setImageLoadFailed(false);
  }, [school.image]);

  if (variant === 'list') {
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
            borderColor,
            padding: spacing.md,
            ...shadows.sm,
          },
        ]}
      >
        <Image
          source={schoolImageSource}
          style={[styles.listImage, { borderRadius: radius.lg }]}
          contentFit={hasImage && !imageLoadFailed ? 'cover' : 'contain'}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={200}
          onError={() => setImageLoadFailed(true)}
        />
        <View style={[styles.listContent, { marginLeft: spacing.lg }]}>
          <Text style={[typography.bodyBold, { color: textColor }]} numberOfLines={1}>{school.name}</Text>
          <View style={[styles.row, { marginTop: spacing.xs }]}>
            <Icon name="map-marker-outline" size={14} color={accentColor} />
            <Text style={[typography.caption, { color: textSecondaryColor, marginLeft: 6 }]} numberOfLines={1}>
              {school.location}
              {school.distance ? ` • ${school.distance}` : ''}
            </Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
            <View style={styles.row}>
              <Icon name="star" size={14} color="#eab308" />
              <Text style={[typography.captionBold, { color: textColor, marginLeft: 4 }]}>{school.rating}</Text>
              <Text style={[typography.caption, { color: textTertiaryColor, marginLeft: 2 }]}>({school.ratingCount})</Text>
            </View>
            {school.isOpen !== undefined ? (
              <View style={[styles.attendeeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : colors.surfaceSecondary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs }]}>
                <View style={[styles.statusDot, { backgroundColor: school.isOpen ? colors.success : colors.error, marginRight: 6 }]} />
                <Text style={[typography.caption, { color: textSecondaryColor }]}>{school.isOpen ? 'Açık' : 'Kapalı'}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bgColor,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor,
          ...shadows.sm,
        },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.touchableArea}>
        <View style={styles.imageWrapper}>
          <Image
            source={schoolImageSource}
            style={[styles.image, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
            contentFit={hasImage && !imageLoadFailed ? 'cover' : 'contain'}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
            onError={() => setImageLoadFailed(true)}
          />
        </View>
        <View style={{ padding: spacing.md }}>
          <View style={[styles.rowBetween, { marginBottom: 0 }]}>
            <Text style={[typography.bodyBold, { color: textColor, flex: 1 }]} numberOfLines={1}>{school.name}</Text>
            <View style={{ width: 40, height: 40 }} />
          </View>
        <View style={[styles.row, { marginTop: spacing.xs }]}>
          <Icon name="map-marker-outline" size={14} color={isDark ? '#EE2AEE' : colors.textSecondary} />
          <Text style={[typography.caption, { color: textSecondaryColor, marginLeft: 4, flex: 1 }]} numberOfLines={1}>
            {school.location}
            {school.distance ? ` • ${school.distance}` : ''}
          </Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
          <View style={styles.row}>
            <Icon name="star" size={14} color="#eab308" />
            <Text style={[typography.captionBold, { color: textColor, marginLeft: 4 }]}>
              {school.rating}
            </Text>
            <Text style={[typography.caption, { color: textTertiaryColor, marginLeft: 2 }]}>
              ({school.ratingCount})
            </Text>
          </View>
          {school.isOpen !== undefined && (
            <View style={[styles.statusBadge, { backgroundColor: school.isOpen ? colors.successAlpha : colors.errorBg }]}>
              <View style={[styles.statusDot, { backgroundColor: school.isOpen ? colors.success : colors.error }]} />
              <Text style={[{ fontSize: 10, fontWeight: '600', color: school.isOpen ? colors.success : colors.error }]}>
                {school.isOpen ? 'Açık' : 'Kapalı'}
              </Text>
            </View>
          )}
        </View>
        {school.tags && school.tags.length > 0 && (
          <View style={[styles.tags, { marginTop: spacing.sm }]}>
            {school.tags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={[styles.tag, { backgroundColor: isDark ? 'rgba(238,43,238,0.2)' : colors.primaryAlpha10, borderRadius: radius.full }]}>
                <Text style={[{ fontSize: 10, fontWeight: '600', color: isDark ? '#EE2AEE' : colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => { if (school.phone) Linking.openURL(`tel:${school.phone}`); }}
        style={[styles.phoneIconBtn, { borderColor: '#3D2A3D', borderRadius: 100, position: 'absolute', right: spacing.md, top: 160 + spacing.md }]}
      >
        <Icon name="phone-outline" size={20} color="#F02AF0" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listImage: {
    width: 96,
    height: 96,
  },
  listContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  touchableArea: {
    flex: 1,
  },
  imageWrapper: {
    width: '100%',
    height: 160,
    backgroundColor: '#2A1630',
  },
  image: {
    width: '100%',
    height: 160,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  phoneIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
});
