import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { MyEventCard } from '../../components/domain/MyEventCard';
import { FilterBar } from '../../components/domain/FilterBar';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockFavoritesEvents } from '../../constants/mockData';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const timeFilters = ['Tüm Zamanlar', 'Bu Yıl', 'Geçen Yıl'];

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');
  const [activeTimeFilter, setActiveTimeFilter] = useState('Tüm Zamanlar');
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

  const filtered = events.filter((e) => {
    if (activeTab === 'favorites' && !favoritedIds.has(e.id as number)) return false;
    if (activeTab === 'history' && !e.isPast) return false;
    const year = new Date(e.date).getFullYear();
    if (activeTimeFilter === 'Bu Yıl' && year !== 2024) return false;
    if (activeTimeFilter === 'Geçen Yıl' && year !== 2023) return false;
    return true;
  });

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{ title: 'Etkinliklerim', showBack: false, showMenu: true, onMenuPress: openDrawer }}
        headerExtra={
          <View>
            <TabSwitch
              tabs={[
                { key: 'favorites', label: 'Favorilerim' },
                { key: 'history', label: 'Geçmiş Etkinlikler' },
              ]}
              activeTab={activeTab}
              onTabChange={(k) => setActiveTab(k as 'favorites' | 'history')}
              containerBgColor="#341A32"
              indicatorColor="#EE2AEE"
              textColor="rgba(255,255,255,0.7)"
              activeTextColor="#FFFFFF"
            />
            <View style={{ marginTop: spacing.sm }}>
              <FilterBar filters={timeFilters} activeFilter={activeTimeFilter} onFilterChange={setActiveTimeFilter} />
            </View>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
      >
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
                  image: event.image ?? 'https://picsum.photos/seed/event/400/280',
                  isFavorite: favoritedIds.has(event.id as number),
                  isPopular: event.isPopular,
                  attendees: event.attendees,
                  attendeeAvatars: event.attendeeAvatars,
                  isDanceQueen: event.isDanceQueen,
                }}
                onPress={() => navigation.navigate('EventDetails', { id: String(event.id) })}
                onFavoritePress={() => toggleFavorite(event.id as number)}
                onReservationPress={() => {}}
              />
              {event.isDanceQueen && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('DanceQueen')}
                  style={[styles.dqBtn, { backgroundColor: colors.purple, marginTop: spacing.sm }]}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>DanceQueen 👑</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <EmptyState icon="calendar-blank-outline" title="Bu filtreye uygun etkinlik yok." />
        )}
      </CollapsingHeaderScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dqBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
});
