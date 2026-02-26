import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ClassDetails'>;

const mockClass = {
  id: 'c1',
  title: 'Başlangıç Salsa',
  instructor: 'Maria Garcia',
  instructorAvatar: 'https://i.pravatar.cc/150?u=instructor',
  time: '19:00',
  day: 'Pazartesi',
  level: 'Başlangıç',
  duration: '1 saat',
  image: 'https://images.unsplash.com/photo-1547153760-18fc949bc86e?w=400',
  requirements: ['Rahat kıyafet', 'Su'],
};

export const ClassDetailsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <Screen>
      <Header title="" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: mockClass.image }} style={styles.heroImage} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={[styles.tag, { backgroundColor: colors.primaryAlpha20 }]}>
            <Text style={[typography.captionBold, { color: colors.primary }]}>{mockClass.level}</Text>
          </View>
          <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.sm }]}>{mockClass.title}</Text>

          <View style={[styles.instructorRow, { marginTop: spacing.lg }]}>
            <Avatar source={mockClass.instructorAvatar} size="md" />
            <View style={{ marginLeft: spacing.md }}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{mockClass.instructor}</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)' }]}>Eğitmen</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl }}>
            <View style={[styles.detailBox, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md }]}>
              <Icon name="calendar-clock" size={20} color={colors.primary} />
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>{mockClass.day} • {mockClass.time}</Text>
            </View>
            <View style={[styles.detailBox, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md }]}>
              <Icon name="timer-outline" size={20} color={colors.primary} />
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 4 }]}>{mockClass.duration}</Text>
            </View>
          </View>

          <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl }]}>Gerekli malzemeler</Text>
          {mockClass.requirements.map((r, i) => (
            <View key={i} style={[styles.row, { marginTop: spacing.sm }]}>
              <Icon name="check-circle" size={18} color={colors.success} />
              <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: 8 }]}>{r}</Text>
            </View>
          ))}

          <Button title="Kayıt Ol" onPress={() => {}} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroWrap: { height: 200 },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  instructorRow: { flexDirection: 'row', alignItems: 'center' },
  detailBox: { minWidth: 120 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
