import React, { startTransition, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions, Text, FlatList, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { SchoolCard } from '../../components/domain/SchoolCard';
import { SchoolCardSkeleton } from '../../components/domain/SchoolCardSkeleton';
import { SearchBar } from '../../components/domain/SearchBar';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';
import { School } from '../../types/models';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useLocation, getDistanceKm } from '../../hooks/useLocation';
import { listSchools } from '../../services/api/schools';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const ISTANBUL_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const HEADER_HEIGHT = 60;
const HEADER_EXTRA_HEIGHT = 90;
const TURKEY_LAT_RANGE = { min: 35, max: 43.5 };
const TURKEY_LNG_RANGE = { min: 25, max: 45.5 };

const parseCoordinate = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isWithinRange = (value: number, min: number, max: number): boolean => value >= min && value <= max;

const normalizeSchoolCoordinates = (
  latitude: unknown,
  longitude: unknown,
): { latitude: number | undefined; longitude: number | undefined } => {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);

  if (lat == null || lng == null) {
    return {
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
    };
  }

  const latLooksLikeTurkeyLat = isWithinRange(lat, TURKEY_LAT_RANGE.min, TURKEY_LAT_RANGE.max);
  const lngLooksLikeTurkeyLng = isWithinRange(lng, TURKEY_LNG_RANGE.min, TURKEY_LNG_RANGE.max);

  if (latLooksLikeTurkeyLat && lngLooksLikeTurkeyLng) {
    return { latitude: lat, longitude: lng };
  }

  const latLooksLikeTurkeyLng = isWithinRange(lat, TURKEY_LNG_RANGE.min, TURKEY_LNG_RANGE.max);
  const lngLooksLikeTurkeyLat = isWithinRange(lng, TURKEY_LAT_RANGE.min, TURKEY_LAT_RANGE.max);

  if (latLooksLikeTurkeyLng && lngLooksLikeTurkeyLat) {
    return { latitude: lng, longitude: lat };
  }

  return { latitude: lat, longitude: lng };
};

const extractCoordinatesFromGoogleMapsUrl = (
  rawUrl: unknown,
): { latitude: number | undefined; longitude: number | undefined } => {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { latitude: undefined, longitude: undefined };
  }

  const url = rawUrl.trim();
  const patterns = [
    /@(-?\d+(?:[.,]\d+)?),\s*(-?\d+(?:[.,]\d+)?)/,
    /[?&]q=(-?\d+(?:[.,]\d+)?),\s*(-?\d+(?:[.,]\d+)?)/,
    /[?&]query=(-?\d+(?:[.,]\d+)?),\s*(-?\d+(?:[.,]\d+)?)/,
    /[?&]ll=(-?\d+(?:[.,]\d+)?),\s*(-?\d+(?:[.,]\d+)?)/,
    /!3d(-?\d+(?:[.,]\d+)?)!4d(-?\d+(?:[.,]\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (!match) continue;
    const [, rawLat, rawLng] = match;
    const normalized = normalizeSchoolCoordinates(rawLat, rawLng);
    if (normalized.latitude != null && normalized.longitude != null) {
      return normalized;
    }
  }

  return { latitude: undefined, longitude: undefined };
};

export const SchoolsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const { coords, error: locationError } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);
  const qRef = useRef('');
  const inflightRef = useRef(false);

  const isMapView = viewMode === 'map';
  const mapHeight = windowHeight;

  useEffect(() => {
    navigation.setParams({ isMapView } as any);
  }, [navigation, isMapView]);

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  const PAGE_SIZE = 50;

  const formatDistance = (km: number): string => {
    if (!Number.isFinite(km) || km < 0) return '—';
    if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
    if (km < 10) return `${Math.round(km * 10) / 10} km`;
    return `${Math.round(km)} km`;
  };

  const mapRowsToSchools = useCallback((rows: any[]): School[] => {
    const mapped = rows.map((r) => {
      const location =
        [r.district, r.city].filter(Boolean).join(', ') ||
        r.address ||
        '—';
      const image = r.image_url?.trim() || '';
      const rating = typeof r.rating === 'number' && Number.isFinite(r.rating) ? r.rating : 0;
      const ratingCount = typeof r.review_count === 'number' && Number.isFinite(r.review_count) ? r.review_count : 0;
      const isOpen =
        (r.current_status || '').toLowerCase().includes('açık') ||
        (r.current_status || '').toLowerCase().includes('open') ||
        (r.current_status || '').toLowerCase().includes('24');

      const normalizedCoordinates = normalizeSchoolCoordinates(r.latitude, r.longitude);
      const fallbackCoordinates = extractCoordinatesFromGoogleMapsUrl(r.google_maps_url);
      const latitude = normalizedCoordinates.latitude ?? fallbackCoordinates.latitude;
      const longitude = normalizedCoordinates.longitude ?? fallbackCoordinates.longitude;

      let distance: string | undefined = undefined;
      let distanceKm: number | undefined = undefined;
      if (coords && latitude != null && longitude != null) {
        const km = getDistanceKm(coords.latitude, coords.longitude, latitude, longitude);
        distanceKm = km;
        distance = formatDistance(km);
      }

      return {
        id: r.id,
        name: r.name,
        location,
        distance,
        image,
        rating,
        ratingCount,
        isOpen: r.current_status ? isOpen : undefined,
        tags: r.category ? [r.category] : undefined,
        phone: r.telephone || undefined,
        website: r.website || undefined,
        latitude,
        longitude,
        // internal helper for sorting; not part of School type but safe on JS objects
        distanceKm,
      };
    });
    mapped.sort((a: any, b: any) => {
      const openA = a.isOpen === true ? 0 : 1;
      const openB = b.isOpen === true ? 0 : 1;
      if (openA !== openB) return openA - openB;

      if (coords) {
        const da = typeof a.distanceKm === 'number' ? a.distanceKm : Number.POSITIVE_INFINITY;
        const db = typeof b.distanceKm === 'number' ? b.distanceKm : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }

      // fallback: more trusted/popular first
      const ra = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
      const rb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
      return rb - ra;
    });
    return mapped as School[];
  }, [coords]);

  const fetchFirstPage = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    setHasMore(true);
    setLoadingMore(false);
    pageRef.current = 0;
    qRef.current = searchQuery;

    const rows = await listSchools({ q: searchQuery, limit: PAGE_SIZE, offset: 0 });
    setSchools(mapRowsToSchools(rows));
    setHasMore(rows.length === PAGE_SIZE);
    if (!opts?.silent) setLoading(false);
  }, [PAGE_SIZE, mapRowsToSchools, searchQuery]);

  useEffect(() => {
    let cancelled = false;

    const t = setTimeout(async () => {
      try {
        if (cancelled) return;
        await fetchFirstPage();
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Okullar yüklenemedi');
        setSchools([]);
        setHasMore(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, coords?.latitude, coords?.longitude]);

  useFocusEffect(
    useCallback(() => {
      fetchFirstPage({ silent: true }).catch(() => {
        // keep current list if focus refresh fails
      });
    }, [fetchFirstPage]),
  );

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchFirstPage({ silent: true });
    } catch {
      // keep existing list; error state handled by main load
    } finally {
      setRefreshing(false);
    }
  }, [fetchFirstPage, refreshing]);

  const refreshMapData = useCallback(async () => {
    if (refreshing) return;
    await onRefresh();
  }, [onRefresh, refreshing]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const offset = nextPage * PAGE_SIZE;
      const rows = await listSchools({ q: qRef.current, limit: PAGE_SIZE, offset });
      const mapped = mapRowsToSchools(rows);
      setSchools((prev) => [...prev, ...mapped]);
      pageRef.current = nextPage;
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      // ignore load-more errors silently; initial load already shows errors
      setHasMore(false);
    } finally {
      inflightRef.current = false;
      setLoadingMore(false);
    }
  }, [PAGE_SIZE, hasMore, loading, loadingMore, mapRowsToSchools]);

  const filtered = schools;

  const markerCoords = useMemo(
    () =>
      filtered
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({ latitude: s.latitude as number, longitude: s.longitude as number })),
    [filtered],
  );

  const focusUser = () => {
    if (!coords || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      650,
    );
  };

  const fitSchools = () => {
    if (!mapRef.current) return;
    if (markerCoords.length === 0) return;
    mapRef.current.fitToCoordinates(markerCoords, {
      edgePadding: {
        top: insets.top + 120,
        right: 60,
        bottom: 160,
        left: 60,
      },
      animated: true,
    });
  };

  useEffect(() => {
    if (!isMapView) return;
    if (!mapRef.current) return;
    // Prefer user location when available.
    if (coords) {
      const t = setTimeout(() => focusUser(), 250);
      return () => clearTimeout(t);
    }
    if (markerCoords.length === 0) return;

    // Fit markers into view; small delay helps on first render.
    const t = setTimeout(() => {
      fitSchools();
    }, 250);

    return () => clearTimeout(t);
  }, [isMapView, markerCoords, insets.top, coords?.latitude, coords?.longitude]);

  const renderSchoolItem = useCallback(({ item }: { item: School }) => {
    return (
      <View style={{ marginBottom: spacing.lg }}>
        <SchoolCard
          school={item}
          onPress={() => navigation.navigate('SchoolDetails', { id: item.id })}
          cardBackgroundColor="#281328"
        />
      </View>
    );
  }, [navigation, spacing.lg]);

  const skeletonData = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ id: `s-${i}` })), []);

  return (
    <Screen edges={isMapView ? [] : ['top']}>
      {!isMapView && (
        <>
          <Header
            title="Dans Okulları"
            showBack={false}
            showMenu
            onMenuPress={openDrawer}
            showNotification
            onNotificationPress={() => (navigation.getParent() as any)?.navigate('Notifications')}
            rightIcon="map-outline"
            onRightPress={() => startTransition(() => setViewMode('map'))}
          />
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Okul veya konum ara"
              backgroundColor="#482347"
            />
          </View>
        </>
      )}

      {!isMapView && loading && schools.length === 0 ? (
        <FlatList
          data={skeletonData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          onTouchStart={Keyboard.dismiss}
          renderItem={() => (
            <View style={{ marginBottom: spacing.lg }}>
              <SchoolCardSkeleton cardBackgroundColor="#281328" />
            </View>
          )}
        />
      ) : !isMapView && error ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <EmptyState icon="alert-circle-outline" title="Bir sorun oluştu" subtitle={error} />
        </View>
      ) : !isMapView && filtered.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <EmptyState icon="school-outline" title="Sonuç bulunamadı" subtitle="Arama kriterlerini değiştirmeyi dene." />
        </View>
      ) : !isMapView ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 140 }}
          renderItem={renderSchoolItem}
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          onTouchStart={Keyboard.dismiss}
          onEndReached={() => {
            if (hasMore) loadMore();
          }}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            hasMore ? (
              <View style={{ paddingVertical: spacing.lg }}>
                <LoadingSpinner message={loadingMore ? 'Daha fazla yükleniyor...' : 'Daha fazla yükleniyor...'} />
              </View>
            ) : (
              <View style={{ height: 20 }} />
            )
          }
          removeClippedSubviews
          initialNumToRender={8}
          windowSize={7}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
        />
      ) : (
        <View style={[styles.mapWrap, { height: mapHeight, paddingTop: insets.top }]}>
          <MapView
            ref={(r) => {
              mapRef.current = r;
            }}
            style={styles.map}
            initialRegion={ISTANBUL_REGION}
            showsUserLocation
            showsMyLocationButton={false}
            followsUserLocation={false}
          >
            {filtered.map((school) =>
              school.latitude != null && school.longitude != null ? (
                <Marker
                  key={school.id}
                  coordinate={{ latitude: school.latitude, longitude: school.longitude }}
                  title={school.name}
                  description={school.location}
                  onCalloutPress={() => navigation.navigate('SchoolDetails', { id: school.id })}
                />
              ) : null,
            )}
          </MapView>
        </View>
      )}

      {isMapView && (
        <View pointerEvents="box-none" style={styles.mapOverlayControls}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => startTransition(() => setViewMode('list'))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.listFab, { top: insets.top + 8, left: spacing.lg }]}
          >
            <Icon name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {coords && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={focusUser}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.locateFab, { bottom: insets.bottom + 110, right: spacing.lg }]}
            >
              <Icon name="crosshairs-gps" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {markerCoords.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={fitSchools}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.locateFab, { bottom: insets.bottom + 60, right: spacing.lg }]}
            >
              <Icon name="map-marker-multiple-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={refreshing}
            onPress={() => {
              void refreshMapData();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
              styles.locateFab,
              styles.refreshFab,
              { bottom: insets.bottom + 10, right: spacing.lg, opacity: refreshing ? 0.6 : 1 },
            ]}
          >
            <Icon name="refresh" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {!coords && locationError && (
            <View
              pointerEvents="none"
              style={[
                styles.locationHint,
                {
                  top: insets.top + 8,
                  right: spacing.lg,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  borderColor: 'rgba(255,255,255,0.16)',
                },
              ]}
            >
              <Icon name="crosshairs-gps" size={18} color="#FFFFFF" />
              <View style={{ width: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Konum kapalı</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
                  iOS Ayarlar → Konum’dan izin ver.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Removed "Ders oluştur" FAB on Schools */}
    </Screen>
  );
};

const styles = StyleSheet.create({
  mapOverlayControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 999,
  },
  listFab: {
    position: 'absolute',
    zIndex: 11,
    elevation: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  locateFab: {
    position: 'absolute',
    zIndex: 11,
    elevation: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  refreshFab: {
    backgroundColor: 'rgba(72,35,71,0.9)',
  },
  mapWrap: {
    flex: 1,
    minHeight: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  locationHint: {
    position: 'absolute',
    zIndex: 11,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
