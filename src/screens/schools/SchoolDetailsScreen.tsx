import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { TabSwitch } from '../../components/domain/TabSwitch';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';
import { mockSchools } from '../../constants/mockData';

type Props = NativeStackScreenProps<MainStackParamList, 'SchoolDetails'>;

const defaultSchool = {
  id: '1',
  name: 'Salsa Academy Istanbul',
  location: 'Kadıköy, İstanbul',
  image: 'https://picsum.photos/seed/salsa1/400/280',
  rating: 4.8,
  ratingCount: 124,
  classes: [
    { id: 'c1', title: 'Başlangıç Salsa', time: '19:00', day: 'Pazartesi', level: 'Başlangıç' },
    { id: 'c2', title: 'Orta Seviye Bachata', time: '20:30', day: 'Çarşamba', level: 'Orta' },
  ],
  events: [
    { id: 'e1', title: 'Latin Night', date: 'Cumartesi, 22:00' },
  ],
};

export const SchoolDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [activeTab, setActiveTab] = useState('schedule');
  const schoolFromList = mockSchools.find((s) => s.id === route.params.id);
  const mockSchool = {
    ...defaultSchool,
    ...schoolFromList,
    name: schoolFromList?.name ?? defaultSchool.name,
    location: schoolFromList?.location ?? defaultSchool.location,
    image: schoolFromList?.image ?? defaultSchool.image,
    rating: schoolFromList?.rating ?? defaultSchool.rating,
    ratingCount: schoolFromList?.ratingCount ?? defaultSchool.ratingCount,
    classes: defaultSchool.classes,
    events: defaultSchool.events,
  };

  const tabs = [
    { key: 'schedule', label: 'Ders Programı' },
    { key: 'events', label: 'Etkinlikler' },
  ];

  return (
    <Screen>
      <Header title={mockSchool.name} showBack />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: mockSchool.image }}
            style={[styles.schoolImage, { borderRadius: radius.xxl }]}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
        </View>

        <View style={[styles.row, { marginTop: spacing.md, justifyContent: 'center' }]}>
          <Icon name="map-marker-outline" size={16} color={colors.textSecondary} />
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 6 }]}>
            {mockSchool.location} • ⭐ {mockSchool.rating} ({mockSchool.ratingCount})
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <TabSwitch tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 'schedule' && (
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              {mockSchool.classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => navigation.navigate('ClassDetails', { id: c.id })}
                  activeOpacity={0.8}
                >
                  <Card>
                    <View style={[styles.classRow, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                      <View style={[styles.iconWrap, { backgroundColor: colors.primaryAlpha10 }]}>
                        <Icon name="calendar-clock" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[typography.bodySmallBold, { color: colors.text }]}>{c.title}</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>
                          {c.day} • {c.time} • {c.level}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === 'events' && (
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              {mockSchool.events.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => navigation.navigate('EventDetails', { id: e.id })}
                  activeOpacity={0.8}
                >
                  <Card>
                    <View style={styles.classRow}>
                      <View style={[styles.iconWrap, { backgroundColor: colors.primaryAlpha10 }]}>
                        <Icon name="party-popper" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[typography.bodySmallBold, { color: colors.text }]}>{e.title}</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{e.date}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', paddingTop: 8 },
  schoolImage: { width: 100, height: 100 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  classRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
