import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { mockEvents } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { scheduleEventReminder } from '../../services/notifications';

type Props = NativeStackScreenProps<MainStackParamList, 'EventDetails'>;

export const EventDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const event = mockEvents.find((e) => e.id === route.params.id) || mockEvents[0];
  const [isFavorite, setIsFavorite] = useState(false);
  const [reminderScheduled, setReminderScheduled] = useState(false);
  const [attending, setAttending] = useState(event.attendees ?? 12);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const capacity = 50;

  const handleJoin = async () => {
    setHasJoined(true);
    setAttending((prev) => prev + 1);
    if (event.rawDate && !reminderScheduled) {
      const id = await scheduleEventReminder(event.title, event.rawDate);
      if (id) setReminderScheduled(true);
    }
    setJoinModalVisible(true);
  };

  const handleLeave = () => {
    setLeaveModalVisible(true);
  };

  const confirmLeave = () => {
    setHasJoined(false);
    setAttending((prev) => Math.max(0, prev - 1));
    setLeaveModalVisible(false);
  };

  const handleShare = () => {
    Share.share({
      message: `${event.title}\n${event.date}\n${event.location}\n${event.price ?? ''}`,
      title: event.title,
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

  return (
    <Screen>
      <ConfirmModal
        visible={joinModalVisible}
        title="Teşekkürler!"
        message="Katıldığınızı belirttiğiniz için teşekkürler. Etkinlikte görüşmek üzere!"
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setJoinModalVisible(false)}
        onConfirm={() => setJoinModalVisible(false)}
      />
      <ConfirmModal
        visible={leaveModalVisible}
        title="Vazgeçtiniz"
        message="Katılmaktan vazgeçtiğiniz için üzgünüz. İstediğiniz zaman tekrar katılabilirsiniz."
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setLeaveModalVisible(false)}
        onConfirm={confirmLeave}
      />
      <Header
        title={event.title}
        showBack
        rightComponent={shareButton}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: event.image }} style={styles.heroImage} />
          <View style={[styles.heroGradient, { backgroundColor: 'transparent' }]} />
          <TouchableOpacity
            style={[styles.favBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={async () => {
              const next = !isFavorite;
              setIsFavorite(next);
              if (next && event.rawDate) await scheduleEventReminder(event.title, event.rawDate);
            }}
          >
            <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#EE2AEE' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
            <Text style={[typography.h3, { color: '#FFFFFF' }]}>{event.title}</Text>
            <View style={[styles.row, { marginTop: spacing.sm }]}>
              <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                <Icon name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginLeft: spacing.sm }]}>{event.date}</Text>
            </View>
            <View style={[styles.row, { marginTop: spacing.xs }]}>
              <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                <Icon name="map-marker-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginLeft: spacing.sm }]}>{event.location}</Text>
            </View>
            {event.danceType != null && (
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                  <Icon name="music" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.7)', marginLeft: spacing.sm }]}>Dans Türü: </Text>
                <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)' }]}>{event.danceType}</Text>
              </View>
            )}
            {event.price != null && (
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                  <Icon name="tag-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.7)', marginLeft: spacing.sm }]}>Ücret: </Text>
                <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)' }]}>{event.price}</Text>
              </View>
            )}
            <View style={{ marginTop: spacing.sm }}>
              <View style={[styles.row, { alignItems: 'center' }]}>
                <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                  <Icon name="account-group-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.7)' }]}>Kapasite</Text>
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{attending} / {capacity}</Text>
                  </View>
                  <ProgressBar progress={attending / capacity} height={4} style={{ marginTop: 6, width: '100%' }} />
                </View>
              </View>
            </View>

          <View
            style={[
              styles.friendsBorder,
              {
                marginTop: spacing.xl,
                backgroundColor: '#241C27',
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: 50,
                padding: spacing.lg,
              },
            ]}
          >
            <View style={styles.friendsRow}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Katılan arkadaşlar</Text>
              <View style={styles.avatars}>
                {[1, 2, 3].map((i) => (
                  <Avatar key={i} source={`https://i.pravatar.cc/150?u=${i}`} size="sm" style={{ marginLeft: -8 }} />
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('DanceQueen')}
            activeOpacity={0.8}
            style={[styles.dqBanner, { backgroundColor: colors.purpleAlpha, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg }]}
          >
            <Icon name="crown" size={24} color={colors.purple} />
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: spacing.md }]}>DanceQueen oylamasına katıl</Text>
            <Icon name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: spacing.xl }} />
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Etkinlik açıklaması</Text>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.85)', lineHeight: 22 }]}>
              {event.description ?? `${event.title} ile unutulmaz bir dans gecesi sizi bekliyor. Canlı müzik ve harika bir atmosferde ${event.danceType ?? 'Latin'} ritimlerine kendinizi bırakın.`}
            </Text>
          </View>
          <View style={{ flex: 1, minHeight: 24 }} />
          <View style={[styles.bottomBar, { backgroundColor: colors.headerBg, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }]}>
            <Button
              title={hasJoined ? 'Katılmaktan vazgeç' : 'Katıl'}
              onPress={hasJoined ? handleLeave : handleJoin}
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
  favBtn: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  friendsBorder: { borderWidth: 1 },
  friendsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  dqBanner: { flexDirection: 'row', alignItems: 'center' },
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
