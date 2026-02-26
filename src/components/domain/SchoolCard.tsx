import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import { Icon } from '../ui/Icon';
import { School } from '../../types/models';

interface SchoolCardProps {
  school: School;
  onPress: () => void;
  /** Koyu kart rengi (örn. #281328). Verilirse yazılar açık renk kullanılır. */
  cardBackgroundColor?: string;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({ school, onPress, cardBackgroundColor }) => {
  const { colors, spacing, radius, shadows, typography } = useTheme();
  const isDark = Boolean(cardBackgroundColor);
  const bgColor = cardBackgroundColor ?? colors.cardBg;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : colors.cardBorder;
  const textColor = isDark ? '#FFFFFF' : colors.text;
  const textSecondaryColor = isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const textTertiaryColor = isDark ? 'rgba(255,255,255,0.6)' : colors.textTertiary;

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
            source={{ uri: school.image }}
            style={[styles.image, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
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
            {school.location} • {school.distance}
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
        style={[styles.phoneIconBtn, { borderColor: '#3D2A3D', borderRadius: 100, position: 'absolute', right: spacing.md, top: 140 + spacing.md }]}
      >
        <Icon name="phone-outline" size={20} color="#F02AF0" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  touchableArea: {
    flex: 1,
  },
  imageWrapper: {
    width: '100%',
    height: 140,
    backgroundColor: '#e5e7eb',
  },
  image: {
    width: '100%',
    height: 140,
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
