import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { EventCard } from '../../components/domain/EventCard';
import { FilterBar } from '../../components/domain/FilterBar';
import { SearchBar } from '../../components/domain/SearchBar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { mockEvents } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { Event } from '../../types/models';
import { useLocation, getDistanceKm } from '../../hooks/useLocation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const filters = ['Tümü', 'Bugün', 'Bu Hafta', 'Bu Ay'];

export const ExploreScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const { coords: userCoords } = useLocation();

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let list = mockEvents.filter((event) => {
      const eventDate = new Date(event.rawDate!);
      const startOfEventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

      if (activeFilter === 'Bugün') {
        if (startOfEventDay.getTime() !== startOfToday.getTime()) return false;
      } else if (activeFilter === 'Bu Hafta') {
        const next7 = new Date(startOfToday);
        next7.setDate(startOfToday.getDate() + 7);
        if (startOfEventDay < startOfToday || startOfEventDay > next7) return false;
      } else if (activeFilter === 'Bu Ay') {
        if (startOfEventDay.getMonth() !== startOfToday.getMonth() || startOfEventDay.getFullYear() !== startOfToday.getFullYear()) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(q) && !event.location.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (userCoords && list.some((e) => e.latitude != null && e.longitude != null)) {
      list = [...list].sort((a, b) => {
        const latA = a.latitude ?? 0;
        const lonA = a.longitude ?? 0;
        const latB = b.latitude ?? 0;
        const lonB = b.longitude ?? 0;
        const distA = getDistanceKm(userCoords.latitude, userCoords.longitude, latA, lonA);
        const distB = getDistanceKm(userCoords.latitude, userCoords.longitude, latB, lonB);
        return distA - distB;
      });
    }
    return list;
  }, [activeFilter, searchQuery, userCoords]);

  const openDrawer = () => {
    (navigation.getParent() as any)?.openDrawer?.();
  };

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Dans Gecesi Keşfet',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
        }}
        headerExtra={
          <View>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Etkinlik, mekan veya şehir ara"
              backgroundColor="#482347"
            />
            <View style={{ marginTop: spacing.sm }}>
              <FilterBar filters={filters} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            </View>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
      >
        <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          {filteredEvents.length} Etkinlik Bulundu
        </Text>

        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => {
            const displayEvent: Event = {
              ...(event as Event),
              location:
                userCoords && event.latitude != null && event.longitude != null
                  ? `${event.location} • ${getDistanceKm(userCoords.latitude, userCoords.longitude, event.latitude, event.longitude)} km`
                  : event.location,
            };
            return (
              <View key={event.id} style={{ marginBottom: spacing.lg }}>
                <EventCard
                  event={displayEvent}
                  onPress={() => navigation.navigate('EventDetails', { id: event.id })}
                  cardBackgroundColor="#341A32"
                />
              </View>
            );
          })
        ) : (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Icon name="calendar-blank-outline" size={48} color={colors.textTertiary} />
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Bu zaman aralığında etkinlik bulunamadı.
            </Text>
            <Button title="Filtreleri Temizle" onPress={() => setActiveFilter('Tümü')} variant="ghost" size="sm" style={{ marginTop: spacing.md }} />
          </View>
        )}
      </CollapsingHeaderScrollView>

      <View style={[styles.fab, { right: spacing.lg, bottom: 1 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditEvent')}
          activeOpacity={0.9}
          style={[styles.fabButton, { backgroundColor: colors.primary }]}
        >
          <Icon name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    zIndex: 10,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ee2bee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
