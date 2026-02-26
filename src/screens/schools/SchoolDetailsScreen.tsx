import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { TabSwitch } from '../../components/domain/TabSwitch';
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
  description: 'İstanbul\'un en köklü salsa ve Latin dans okullarından biri. Başlangıçtan ileri seviyeye grup dersleri ve özel ders imkânı.',
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
  const [isFavorite, setIsFavorite] = useState(false);
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

  const handleShare = () => {
    Share.share({
      message: `${mockSchool.name}\n${mockSchool.location}\n⭐ ${mockSchool.rating} (${mockSchool.ratingCount} değerlendirme)`,
      title: mockSchool.name,
    }).catch(() => {});
  };

  const shareButton = (
    <TouchableOpacity
      onPress={handleShare}
      style={[styles.headerShareBtn, { borderRadius: radius.full, borderColor: '#9CA3AF' }]}
      activeOpacity={0.7}
    >
      <Icon name="share-variant" size={22} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const tabs = [
    { key: 'schedule', label: 'Ders Programı' },
    { key: 'events', label: 'Etkinlikler' },
  ];

  return (
    <Screen>
      <Header title={mockSchool.name} showBack rightComponent={shareButton} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: mockSchool.image }} style={styles.heroImage} />
          <View style={[styles.heroGradient, { backgroundColor: 'transparent' }]} />
          <TouchableOpacity
            style={[styles.favBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setIsFavorite((v) => !v)}
          >
            <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#EE2AEE' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
          <Text style={[typography.h3, { color: '#FFFFFF' }]}>{mockSchool.name}</Text>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
              <Icon name="map-marker-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginLeft: spacing.sm }]}>{mockSchool.location}</Text>
          </View>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
              <Icon name="star" size={18} color={colors.primary} />
            </View>
            <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginLeft: spacing.sm }]}>
              {mockSchool.rating} • {mockSchool.ratingCount} değerlendirme
            </Text>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <TabSwitch tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          </View>

          {activeTab === 'schedule' && (
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              {mockSchool.classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => navigation.navigate('ClassDetails', { id: c.id })}
                  activeOpacity={0.8}
                  style={[styles.cardRow, { backgroundColor: '#311831', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: spacing.lg }]}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                    <Icon name="calendar-clock" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{c.title}</Text>
                    <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                      {c.day} • {c.time} • {c.level}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#9CA3AF" />
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
                  style={[styles.cardRow, { backgroundColor: '#311831', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: spacing.lg }]}
                >
                  <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                    <Icon name="party-popper" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{e.title}</Text>
                    <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{e.date}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: spacing.xl }} />
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Hakkında</Text>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.85)', lineHeight: 22 }]}>
              {mockSchool.description}
            </Text>
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />
          <View style={[styles.bottomBar, { backgroundColor: colors.headerBg, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }]}>
            <Button
              title="İletişime Geç"
              onPress={() => {}}
              fullWidth
              style={{ borderRadius: 50 }}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroWrap: { position: 'relative', height: 220 },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  favBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center' },
  headerShareBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    marginRight: 12,
  },
});
