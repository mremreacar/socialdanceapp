import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { MyEventCard } from '../../components/domain/MyEventCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockFavoritesEvents } from '../../constants/mockData';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const MyEventsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const [events] = useState(mockFavoritesEvents);
  const [favoritedIds, setFavoritedIds] = useState<Set<number>>(
    () => new Set(events.filter((e) => e.isFavorite).map((e) => e.id as number))
  );

  const toggleFavorite = (id: number) => {
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => events.filter((e) => e.isPast), [events]);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Etkinliklerim',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
        }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
      >
        <View style={{ marginTop: -56 }}>
        <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          {filtered.length} Etkinlik Bulundu
        </Text>

        {filtered.length > 0 ? (
          filtered.map((event) => (
            <View key={event.id} style={{ marginBottom: spacing.lg }}>
              <MyEventCard
                event={{
                  id: event.id,
                  title: event.title,
                  location: event.location,
                  date: event.date,
                  day: event.day,
                  month: event.month,
                    image: event.image ?? '',
                  isFavorite: favoritedIds.has(event.id as number),
                  isPopular: event.isPopular,
                  attendees: event.attendees,
                  attendeeAvatars: event.attendeeAvatars,
                  isDanceStar: event.isDanceStar,
                }}
                onPress={() => navigation.navigate('EventDetails', { id: String(event.id), fromFavorites: true })}
                onFavoritePress={() => toggleFavorite(event.id as number)}
                onReservationPress={() =>
                  navigation.navigate('EventDetails', { id: String(event.id), fromFavorites: true })
                }
                onAvatarPress={(index, avatarUri) =>
                  (navigation.getParent() as any)?.navigate('UserProfile', {
                    userId: `ev-${event.id}-${index}`,
                    name: `Dansçı ${index + 1}`,
                    avatar: avatarUri,
                  })
                }
              />
              {event.isDanceStar && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('DanceStar', {
                      eventId: String(event.id),
                      eventTitle: event.title,
                      attendees: (event.attendeeAvatars ?? []).map((avatar, index) => ({
                        id: `ev-${event.id}-${index}`,
                        name: `Dansçı ${index + 1}`,
                        avatar,
                      })),
                    })
                  }
                  style={[styles.dqBtn, { backgroundColor: colors.purple, marginTop: spacing.sm }]}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>DanceStar ⭐</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <EmptyState icon="calendar-blank-outline" title="Bu filtreye uygun etkinlik yok." />
        )}
        </View>
      </CollapsingHeaderScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dqBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
});
