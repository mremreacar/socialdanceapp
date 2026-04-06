import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { MyEventCard } from '../../components/domain/MyEventCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';
import { ApiError, hasSupabaseConfig } from '../../services/api/apiClient';
import { listAllSchoolEvents } from '../../services/api/schoolEvents';
import { schoolEventAttendeesService } from '../../services/api/schoolEventAttendees';
import { storage } from '../../services/storage';
import type { MyEventCardData } from '../../components/domain/MyEventCard';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const MyEventsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const [events, setEvents] = useState<MyEventCardData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(() => new Set());
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(() => new Set());
  const [reservingId, setReservingId] = useState<string | null>(null);

  const toggleFavorite = (id: string) => {
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReservation = async (eventId: string) => {
    if (!hasSupabaseConfig()) {
      Alert.alert('Bağlantı', 'Bu özellik için uygulama yapılandırması gerekir.');
      return;
    }
    const token = await storage.getAccessToken();
    if (!token) {
      Alert.alert('Giriş gerekli', 'Rezervasyon için lütfen giriş yapın.');
      return;
    }
    setReservingId(eventId);
    try {
      await schoolEventAttendeesService.join(eventId);
      setJoinedEventIds((prev) => new Set(prev).add(eventId));
      Alert.alert('Rezervasyon', 'Etkinliğe katılımınız kaydedildi.');
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Kayıt yapılamadı.';
      Alert.alert('Rezervasyon', msg);
    } finally {
      setReservingId(null);
    }
  };

  const loadEvents = useCallback(async () => {
    const rows = await listAllSchoolEvents(100);
    const mapped = rows
      .map((row) => {
        const startsAt = new Date(row.starts_at);
        if (Number.isNaN(startsAt.getTime())) return null;
        return {
          id: row.id,
          title: row.title?.trim() || 'Etkinlik',
          location: row.location?.trim() || 'Konum yakında açıklanacak',
          date: startsAt.toLocaleString('tr-TR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          }),
          day: startsAt.toLocaleDateString('tr-TR', { day: '2-digit' }),
          month: startsAt.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase(),
          image: row.image_url?.trim() || `https://picsum.photos/seed/event-${encodeURIComponent(row.id)}/400/280`,
          isFavorite: false,
          isPopular: false,
          attendees: 0,
          attendeeAvatars: [],
          isDanceStar: false,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    setEvents(mapped);

    if (!hasSupabaseConfig() || mapped.length === 0) {
      setJoinedEventIds(new Set());
      return;
    }
    const token = await storage.getAccessToken();
    if (!token) {
      setJoinedEventIds(new Set());
      return;
    }
    try {
      const joined = await schoolEventAttendeesService.listJoinedEventIds(mapped.map((m) => String(m.id)));
      setJoinedEventIds(new Set(joined));
    } catch {
      setJoinedEventIds(new Set());
    }
  }, []);

  useEffect(() => {
    void loadEvents().catch(() => {
      setEvents([]);
      setJoinedEventIds(new Set());
    });
  }, [loadEvents]);

  const filtered = useMemo(() => events, [events]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadEvents()
      .catch(() => {
        setEvents([]);
        setJoinedEventIds(new Set());
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [loadEvents]);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Etkinlikler',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
        }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor="rgba(0,0,0,0.25)"
            progressViewOffset={80}
          />
        }
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
                  isFavorite: favoritedIds.has(String(event.id)),
                  isPopular: event.isPopular,
                  attendees: event.attendees,
                  attendeeAvatars: event.attendeeAvatars,
                  isDanceStar: event.isDanceStar,
                }}
                onPress={() => navigation.navigate('EventDetails', { id: String(event.id), fromFavorites: true })}
                onFavoritePress={() => toggleFavorite(String(event.id))}
                hasJoinedReservation={joinedEventIds.has(String(event.id))}
                reservationLoading={reservingId === String(event.id)}
                onReservationPress={() => void handleReservation(String(event.id))}
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
