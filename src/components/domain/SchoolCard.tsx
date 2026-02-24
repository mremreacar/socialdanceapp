import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../ui/Icon';
import { School } from '../../types/models';

interface SchoolCardProps {
  school: School;
  onPress: () => void;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({ school, onPress }) => {
  const { colors, spacing, radius, shadows, typography } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          ...shadows.sm,
        },
      ]}
    >
      <Image source={{ uri: school.image }} style={[styles.image, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]} />
      <View style={{ padding: spacing.md }}>
        <Text style={[typography.bodyBold, { color: colors.text }]} numberOfLines={1}>{school.name}</Text>
        <View style={[styles.row, { marginTop: spacing.xs }]}>
          <Icon name="map-marker-outline" size={14} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 4, flex: 1 }]} numberOfLines={1}>
            {school.location} • {school.distance}
          </Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
          <View style={styles.row}>
            <Icon name="star" size={14} color="#eab308" />
            <Text style={[typography.captionBold, { color: colors.text, marginLeft: 4 }]}>
              {school.rating}
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: 2 }]}>
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
              <View key={idx} style={[styles.tag, { backgroundColor: colors.primaryAlpha10, borderRadius: radius.full }]}>
                <Text style={[{ fontSize: 10, fontWeight: '600', color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
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
});
