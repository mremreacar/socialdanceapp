import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, RefreshControl, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { EventCard } from '../../components/domain/EventCard';
import { SchoolCard } from '../../components/domain/SchoolCard';
import { SearchBar } from '../../components/domain/SearchBar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { mockEvents, mockSchools } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { Event, School } from '../../types/models';
import { useLocation, getDistanceKm } from '../../hooks/useLocation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const filters = ['Tümü', 'Bugün', 'Bu Hafta', 'Bu Ay'];

export const ExploreScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography } = useTheme();
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { coords: userCoords } = useLocation();

  const closeFilterSheet = () => setFilterSheetVisible(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Burada ileride gerçek API'den etkinlikler çekildiğinde yenileme işlemi yapılabilir.
    // Şimdilik sadece kısa bir gecikmeden sonra spinner'ı kapatıyoruz.
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

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

  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = mockSchools.filter((school) => {
      if (!q) return true;
      const inName = school.name.toLowerCase().includes(q);
      const inLocation = school.location.toLowerCase().includes(q);
      const inTags = (school.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
      return inName || inLocation || inTags;
    });

    if (userCoords && list.some((s) => s.latitude != null && s.longitude != null)) {
      list = [...list].sort((a, b) => {
        const distA = getDistanceKm(userCoords.latitude, userCoords.longitude, a.latitude ?? 0, a.longitude ?? 0);
        const distB = getDistanceKm(userCoords.latitude, userCoords.longitude, b.latitude ?? 0, b.longitude ?? 0);
        return distA - distB;
      });
    }

    return list;
  }, [searchQuery, userCoords]);

  const openDrawer = () => {
    (navigation.getParent() as any)?.openDrawer?.();
  };

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{
          title: 'Keşfet',
          showLogo: false,
          showBack: false,
          showMenu: true,
          onMenuPress: openDrawer,
          showNotification: true,
          onNotificationPress: () => (navigation.getParent() as any)?.navigate('Notifications'),
        }}
        headerExtra={
          <View>
            <View style={styles.searchRow}>
              <View style={{ flex: 1 }}>
                <Pressable onPress={() => navigation.navigate('ExploreSearch', { initialQuery: searchQuery })}>
                  <View pointerEvents="none">
                    <SearchBar
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Etkinlik, mekan veya şehir ara"
                      backgroundColor="#482347"
                    />
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        }
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
        <View style={{ marginTop: -44 }}>
        <View style={[styles.sectionHeader, { marginBottom: spacing.sm }]}>
          <View style={styles.sectionTitleRow}>
            <Icon name="calendar-blank-outline" size={16} color={colors.primary} />
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: 6 }]}>Etkinlikler</Text>
          </View>
          <View style={[styles.countPill, { backgroundColor: 'rgba(238,43,238,0.16)' }]}>
            <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>{filteredEvents.length}</Text>
          </View>
        </View>

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
              <View key={event.id} style={{ marginBottom: spacing.md }}>
                <EventCard
                  event={displayEvent}
                  onPress={() => navigation.navigate('EventDetails', { id: event.id })}
                  cardBackgroundColor="#341A32"
                />
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyBox, { paddingVertical: 24, borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Bu zaman aralığında etkinlik bulunamadı.</Text>
            <Button title="Filtreleri Temizle" onPress={() => setActiveFilter('Tümü')} variant="ghost" size="sm" style={{ marginTop: spacing.md }} />
          </View>
        )}

        <View style={[styles.sectionHeader, { marginBottom: spacing.sm, marginTop: spacing.lg }]}>
          <View style={styles.sectionTitleRow}>
            <Icon name="school-outline" size={16} color={colors.primary} />
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: 6 }]}>Mekanlar</Text>
          </View>
          <View style={[styles.countPill, { backgroundColor: 'rgba(238,43,238,0.16)' }]}>
            <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>{filteredSchools.length}</Text>
          </View>
        </View>

        {filteredSchools.length > 0 ? (
          filteredSchools.map((school) => {
            const displaySchool: School = {
              ...(school as School),
              distance:
                userCoords && school.latitude != null && school.longitude != null
                  ? `${getDistanceKm(userCoords.latitude, userCoords.longitude, school.latitude, school.longitude)} km`
                  : school.distance,
            };
            return (
              <View key={school.id} style={{ marginBottom: spacing.md }}>
                <SchoolCard
                  school={displaySchool}
                  onPress={() => navigation.navigate('SchoolDetails', { id: school.id })}
                  variant="list"
                  cardBackgroundColor="#341A32"
                />
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyBox, { paddingVertical: 24, borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Aramaya uygun dans okulu bulunamadı.</Text>
          </View>
        )}
        </View>
      </CollapsingHeaderScrollView>

      <Modal visible={filterSheetVisible} transparent animationType="slide" onRequestClose={closeFilterSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFilterSheet} />
          <View style={[styles.sheetBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + 24 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.lg }]}>Zaman</Text>
            {filters.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  setActiveFilter(f);
                  closeFilterSheet();
                }}
                style={[styles.sheetRow, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}
                activeOpacity={0.7}
              >
                <Text style={[typography.body, { color: activeFilter === f ? colors.primary : '#FFFFFF' }]}>{f}</Text>
                {activeFilter === f && <Icon name="check" size={22} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

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
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countPill: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
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
