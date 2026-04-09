import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl, Modal, Animated, PanResponder } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/domain/SearchBar';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { mockFollowing } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import {
  ExploreInstructorListItem,
  instructorProfileService,
} from '../../services/api/instructorProfile';

type Props = NativeStackScreenProps<MainStackParamList, 'InstructorsList'>;
type FilterId = 'ALL' | string;

type InstructorListRow = {
  key: string;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
  userId: string;
  navigateName: string;
  navigateUsername: string;
  navigateBio?: string;
  specialties: string[];
  searchText: string;
};

function mapExploreInstructorToRow(item: ExploreInstructorListItem): InstructorListRow {
  const subtitle = item.username
    ? `@${item.username}`
    : item.specialties.length > 0
      ? item.specialties.slice(0, 3).join(' · ')
      : 'Eğitmen';
  const searchParts = [
    item.headline,
    item.displayName,
    item.username,
    item.profileBio,
    item.instructorBio,
    ...item.specialties,
  ]
    .map((value) => value.trim().toLocaleLowerCase('tr-TR'))
    .filter(Boolean);

  return {
    key: item.userId,
    title: item.headline || item.displayName,
    subtitle,
    avatarUrl: item.avatarUrl,
    userId: item.userId,
    navigateName: item.displayName,
    navigateUsername: item.username,
    navigateBio: item.instructorBio || item.profileBio,
    specialties: item.specialties,
    searchText: searchParts.join(' '),
  };
}

export const InstructorsListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography } = useTheme();
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const [rows, setRows] = useState<InstructorListRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterId>('ALL');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const load = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setRows(
        mockFollowing.map((m) => ({
          key: `mock-${m.id}`,
          title: m.name,
          subtitle: m.handle,
          avatarUrl: m.img,
          userId: `mock-instructor-${m.id}`,
          navigateName: m.name,
          navigateUsername: m.handle.replace(/^@/, ''),
          specialties: [],
          searchText: `${m.name} ${m.handle}`.toLocaleLowerCase('tr-TR'),
        })),
      );
      return;
    }
    const list = await instructorProfileService.listVisibleForExplore();
    setRows(list.map(mapExploreInstructorToRow));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => setRows([]));
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load()
      .catch(() => setRows([]))
      .finally(() => setRefreshing(false));
  }, [load]);

  const specialtyFilters = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      row.specialties.forEach((specialty) => {
        const key = specialty.trim();
        if (!key) return;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });

    return [
      { id: 'ALL' as const, label: 'Tümü' },
      ...[...counts.entries()]
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0].localeCompare(b[0], 'tr');
        })
        .slice(0, 8)
        .map(([label]) => ({ id: label, label })),
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return rows.filter((row) => {
      const matchesSearch = !normalizedQuery || row.searchText.includes(normalizedQuery);
      const matchesFilter = activeFilter === 'ALL' || row.specialties.includes(activeFilter);
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, rows, searchQuery]);

  const hasActiveSearch = searchQuery.trim().length > 0 || activeFilter !== 'ALL';
  const activeFilterCount = activeFilter !== 'ALL' ? 1 : 0;

  useEffect(() => {
    if (!filterSheetVisible) {
      sheetTranslateY.setValue(0);
    }
  }, [filterSheetVisible, sheetTranslateY]);

  const closeFilterSheet = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: 320,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      sheetTranslateY.setValue(0);
      setFilterSheetVisible(false);
    });
  }, [sheetTranslateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 8,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            sheetTranslateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 90 || gestureState.vy > 1.1) {
            closeFilterSheet();
            return;
          }
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [closeFilterSheet, sheetTranslateY],
  );

  return (
    <Screen>
      <Header title="Eğitmenler" showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          hasSupabaseConfig() ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
      >
        <View style={[styles.searchRow, { marginBottom: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="İsim, kullanıcı adı veya branş ara"
              backgroundColor="#482347"
            />
          </View>
          <TouchableOpacity
            onPress={() => setFilterSheetVisible(true)}
            activeOpacity={0.8}
            style={[
              styles.filterBtn,
              {
                marginLeft: spacing.sm,
                borderRadius: radius.full,
                backgroundColor: '#311831',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.14)',
              },
            ]}
          >
            <Icon name="tune-variant" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.summaryRow, { marginBottom: spacing.md }]}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {filteredRows.length} eğitmen gösteriliyor
          </Text>
          {hasActiveSearch ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setSearchQuery(''); setActiveFilter('ALL'); }}>
              <Text style={[typography.captionBold, { color: '#EE2AEE' }]}>Temizle</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {rows.length === 0 && hasSupabaseConfig() ? (
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
            Henüz görünür eğitmen yok veya liste yüklenemedi. Giriş yaptığınızdan ve eğitmen profilinizde &quot;Keşfette görünür&quot; açık
            olduğundan emin olun.
          </Text>
        ) : null}

        {rows.length > 0 && filteredRows.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                borderColor: 'rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: radius.xl,
                padding: spacing.lg,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginBottom: 4 }]}>Sonuç bulunamadı</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, textAlign: 'center' }]}>
              Aramayı veya seçili filtreyi değiştirerek farklı eğitmenleri görüntüleyebilirsiniz.
            </Text>
          </View>
        ) : null}

        {filteredRows.map((instructor) => (
          <TouchableOpacity
            key={instructor.key}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('UserProfile', {
                userId: instructor.userId,
                name: instructor.navigateName,
                username: instructor.navigateUsername || undefined,
                avatar: instructor.avatarUrl ?? '',
                bio: instructor.navigateBio,
              })
            }
            style={{ marginBottom: spacing.md }}
          >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: '#341A32',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: radius.xl,
                  padding: spacing.md,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
                ]}
              >
                {instructor.avatarUrl ? (
                  <Image source={{ uri: instructor.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Icon name="account" size={18} color={colors.primary} />
                )}
              </View>
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{instructor.title}</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{instructor.subtitle}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={filterSheetVisible} transparent animationType="slide" onRequestClose={closeFilterSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFilterSheet} />
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.sheetBox,
              {
                backgroundColor: colors.headerBg ?? '#2C1C2D',
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingBottom: insets.bottom + 24,
                maxHeight: '80%',
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={[typography.h4, { color: '#FFFFFF' }]}>Filtreler</Text>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.65)', marginTop: 2 }]}>
                  {activeFilterCount > 0 ? `${activeFilterCount} filtre aktif` : 'Tum egitmenler gosteriliyor'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeFilterSheet}
                activeOpacity={0.8}
                style={[
                  styles.sheetCloseBtn,
                  {
                    borderRadius: radius.full,
                    borderColor: 'rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                <Icon name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.md }}>
              <View style={styles.filterCard}>
                <Text style={[styles.sheetSectionTitle, typography.captionBold, { color: 'rgba(255,255,255,0.85)' }]}>Brans</Text>
                <View style={styles.filterRow}>
                  {specialtyFilters.map((filter) => {
                    const isActive = activeFilter === filter.id;
                    return (
                      <TouchableOpacity
                        key={filter.id}
                        activeOpacity={0.85}
                        onPress={() => setActiveFilter(filter.id)}
                        style={[
                          styles.filterChip,
                          {
                            borderRadius: radius.full,
                            backgroundColor: isActive ? 'rgba(238,43,238,0.18)' : 'rgba(255,255,255,0.04)',
                            borderColor: isActive ? 'rgba(238,43,238,0.5)' : 'rgba(255,255,255,0.1)',
                          },
                        ]}
                      >
                        <Text style={[typography.captionBold, { color: isActive ? '#EE2AEE' : '#FFFFFF' }]}>{filter.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.sheetFooter, { paddingTop: spacing.md }]}>
              <TouchableOpacity
                onPress={() => setActiveFilter('ALL')}
                activeOpacity={0.8}
                style={[
                  styles.footerBtn,
                  styles.footerSecondaryBtn,
                  {
                    borderRadius: radius.full,
                    borderColor: 'rgba(255,255,255,0.18)',
                    marginRight: spacing.sm,
                  },
                ]}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Temizle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeFilterSheet}
                activeOpacity={0.85}
                style={[
                  styles.footerBtn,
                  {
                    borderRadius: radius.full,
                    backgroundColor: '#EE2AEE',
                  },
                ]}
              >
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  filterBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  emptyState: {
    alignItems: 'center',
    borderWidth: 1,
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
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filterCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetSectionTitle: {
    marginBottom: 12,
  },
  sheetFooter: {
    flexDirection: 'row',
  },
  footerBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  footerSecondaryBtn: {
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
