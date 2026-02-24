import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { EventCard } from '../../components/domain/EventCard';
import { FilterBar } from '../../components/domain/FilterBar';
import { SearchBar } from '../../components/domain/SearchBar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { mockEvents } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { Event } from '../../types/models';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const filters = ['Tümü', 'Bugün', 'Bu Hafta', 'Bu Ay'];

export const ExploreScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return mockEvents.filter((event) => {
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
  }, [activeFilter, searchQuery]);

  const openDrawer = () => {
    (navigation.getParent() as any)?.openDrawer?.();
  };

  return (
    <Screen>
      <Header
        title="Dans Gecesi Keşfet"
        showBack={false}
        showMenu
        onMenuPress={openDrawer}
      />

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Etkinlik, mekan veya şehir ara"
        />
        <FilterBar filters={filters} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </View>

      <Text style={[typography.captionBold, { color: colors.textSecondary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
        {filteredEvents.length} Etkinlik Bulundu
      </Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <View key={event.id} style={{ marginBottom: spacing.lg }}>
              <EventCard
                event={event as Event}
                onPress={() => navigation.navigate('EventDetails', { id: event.id })}
              />
            </View>
          ))
        ) : (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Icon name="calendar-blank-outline" size={48} color={colors.textTertiary} />
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Bu zaman aralığında etkinlik bulunamadı.
            </Text>
            <Button title="Filtreleri Temizle" onPress={() => setActiveFilter('Tümü')} variant="ghost" size="sm" style={{ marginTop: spacing.md }} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.fab, { right: spacing.lg, bottom: 100 }]}>
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
