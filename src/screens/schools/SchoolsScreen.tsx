import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView from 'react-native-maps';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { CollapsingHeaderScrollView } from '../../components/layout/CollapsingHeaderScrollView';
import { SchoolCard } from '../../components/domain/SchoolCard';
import { SearchBar } from '../../components/domain/SearchBar';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { Icon } from '../../components/ui/Icon';
import { mockSchools } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { School } from '../../types/models';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const ISTANBUL_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export const SchoolsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const openDrawer = () => (navigation.getParent() as any)?.openDrawer?.();

  const filtered = mockSchools.filter(
    (s) =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Screen>
      <CollapsingHeaderScrollView
        headerProps={{ title: 'Dans Okulları', showBack: false, showMenu: true, onMenuPress: openDrawer }}
        headerExtra={
          <View>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Okul veya konum ara" />
            <View style={{ marginTop: spacing.sm }}>
              <TabSwitch
                tabs={[
                  { key: 'list', label: 'Liste' },
                  { key: 'map', label: 'Harita' },
                ]}
                activeTab={viewMode}
                onTabChange={(k) => setViewMode(k as 'list' | 'map')}
                containerRadius={50}
                containerBgColor="#1E283A"
                indicatorColor="#020617"
                textColor="#FFFFFF"
                activeTextColor="#EE2AEE"
              />
            </View>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
      >
        {viewMode === 'list' ? (
          filtered.map((school) => (
            <View key={school.id} style={{ marginBottom: spacing.lg }}>
              <SchoolCard
                school={school as School}
                onPress={() => navigation.navigate('SchoolDetails', { id: school.id })}
                cardBackgroundColor="#281328"
              />
            </View>
          ))
        ) : (
          <View style={[styles.mapWrap, { marginTop: spacing.sm }]}>
            <MapView
              style={styles.map}
              initialRegion={ISTANBUL_REGION}
              showsUserLocation
              showsMyLocationButton={false}
            />
          </View>
        )}
      </CollapsingHeaderScrollView>

      <View style={[styles.fab, { right: spacing.lg, bottom: 1 }]}>
        <TouchableOpacity
          onPress={() => (navigation.getParent() as any)?.navigate('EditClass', {})}
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
  mapWrap: {
    height: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fab: { position: 'absolute', zIndex: 10 },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});
