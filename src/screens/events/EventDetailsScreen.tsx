import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { mockEvents } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'EventDetails'>;

export const EventDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const event = mockEvents.find((e) => e.id === route.params.id) || mockEvents[0];
  const [isFavorite, setIsFavorite] = useState(false);
  const capacity = 50;
  const attending = event.attendees || 12;

  return (
    <Screen>
      <Header title="" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: event.image }} style={styles.heroImage} />
          <View style={[styles.heroGradient, { backgroundColor: 'transparent' }]} />
          <TouchableOpacity
            style={[styles.favBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: -spacing.xxl }}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xxl, padding: spacing.xl }]}>
            <Text style={[typography.h3, { color: colors.text }]}>{event.title}</Text>
            <View style={[styles.row, { marginTop: spacing.sm }]}>
              <Icon name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 8 }]}>{event.date}</Text>
            </View>
            <View style={[styles.row, { marginTop: 4 }]}>
              <Icon name="map-marker-outline" size={18} color={colors.primary} />
              <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: 8 }]}>{event.location}</Text>
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <View style={styles.rowBetween}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Kapasite</Text>
                <Text style={[typography.bodySmallBold, { color: colors.text }]}>{attending} / {capacity}</Text>
              </View>
              <ProgressBar progress={attending / capacity} height={8} style={{ marginTop: 4 }} />
            </View>
          </View>

          <View style={[styles.friendsRow, { marginTop: spacing.xl }]}>
            <Text style={[typography.bodySmallBold, { color: colors.text }]}>Katılan arkadaşlar</Text>
            <View style={styles.avatars}>
              {[1, 2, 3].map((i) => (
                <Avatar key={i} source={`https://i.pravatar.cc/150?u=${i}`} size="sm" style={{ marginLeft: -8 }} />
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('DanceQueen')}
            activeOpacity={0.8}
            style={[styles.dqBanner, { backgroundColor: colors.purpleAlpha, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg }]}
          >
            <Icon name="crown" size={24} color={colors.purple} />
            <Text style={[typography.bodySmallBold, { color: colors.text, marginLeft: spacing.md }]}>DanceQueen oylamasına katıl</Text>
            <Icon name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.bottomBar, { backgroundColor: colors.headerBg, borderTopColor: colors.borderLight, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }]}>
            <Text style={[typography.h4, { color: colors.primary }]}>{event.price}</Text>
            <Button title="Katıl" onPress={() => {}} style={{ flex: 1, marginLeft: spacing.lg }} />
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
  favBtn: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  friendsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  dqBanner: { flexDirection: 'row', alignItems: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
});
