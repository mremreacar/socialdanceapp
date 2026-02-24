import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { EventCard } from '../../components/domain/EventCard';
import { FilterBar } from '../../components/domain/FilterBar';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { Icon } from '../../components/ui/Icon';
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

  const filtered = events.filter((e) => {
    if (activeTab === 'favorites' && !e.isFavorite) return false;
    if (activeTab === 'history' && !e.isPast) return false;
    const year = new Date(e.date).getFullYear();
    if (activeTimeFilter === 'Bu Yıl' && year !== 2024) return false;
    if (activeTimeFilter === 'Geçen Yıl' && year !== 2023) return false;
    return true;
  });

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  return (
    <Screen>
      <Header title="Etkinliklerim" showBack={false} showMenu onMenuPress={openDrawer} />

      <View style={{ paddingHorizontal: spacing.lg }}>
        <TabSwitch
          tabs={[
            { key: 'favorites', label: 'Favorilerim' },
            { key: 'history', label: 'Geçmiş Etkinlikler' },
          ]}
          activeTab={activeTab}
          onTabChange={(k) => setActiveTab(k as 'favorites' | 'history')}
        />
        <FilterBar filters={timeFilters} activeFilter={activeTimeFilter} onFilterChange={setActiveTimeFilter} />
      </View>

      <Text style={[typography.label, { color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
        {filtered.length} Etkinlik Bulundu
      </Text>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {filtered.length > 0 ? (
          filtered.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => navigation.navigate('EventDetails', { id: String(event.id) })}
              activeOpacity={0.9}
              style={[styles.eventRow, { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.cardBorder }]}
            >
              <View style={[styles.dateBox, { backgroundColor: colors.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[typography.h4, { color: colors.primary }]}>{event.day}</Text>
                <Text style={[typography.label, { color: colors.textTertiary }]}>{event.month}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodySmallBold, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Icon name="map-marker-outline" size={12} color={colors.textSecondary} />
                  <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: 4 }]} numberOfLines={1}>{event.location}</Text>
                </View>
              </View>
              {event.isDanceQueen && (
                <TouchableOpacity onPress={() => navigation.navigate('DanceQueen')} style={[styles.dqBtn, { backgroundColor: colors.purple }]}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>DanceQueen 👑</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState icon="calendar-blank-outline" title="Bu filtreye uygun etkinlik yok." />
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  eventRow: { flexDirection: 'row', alignItems: 'center' },
  dateBox: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  dqBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
});
