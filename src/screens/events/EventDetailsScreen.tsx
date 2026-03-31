import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Share, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { mockEvents, mockFavoritesEvents } from '../../constants/mockData';
import { MainStackParamList } from '../../types/navigation';
import { scheduleEventReminder } from '../../services/notifications';
import { getSchoolEventById } from '../../services/api/schoolEvents';
import { schoolEventAttendeesService, type EventAttendee } from '../../services/api/schoolEventAttendees';

type Props = NativeStackScreenProps<MainStackParamList, 'EventDetails'>;

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function formatStartsAtLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const EventDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const favoriteEvent = route.params.fromFavorites
    ? mockFavoritesEvents.find((e) => String(e.id) === route.params.id)
    : undefined;
  const event =
    favoriteEvent ??
    mockEvents.find((e) => e.id === route.params.id) ??
    mockEvents[0];
  const [isFavorite, setIsFavorite] = useState(false);
  const [reminderScheduled, setReminderScheduled] = useState(false);
  const [attending, setAttending] = useState(event.attendees ?? 12);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [remoteEvent, setRemoteEvent] = useState<{
    title: string;
    dateLabel: string;
    startsAtDate: Date | null;
    location: string;
    image: string;
    description: string;
  } | null>(null);
  const [dbAttendees, setDbAttendees] = useState<EventAttendee[] | null>(null);
  const capacity = 50;

  useEffect(() => {
    if (!isUuid(route.params.id)) {
      setRemoteEvent(null);
      return;
    }
    void getSchoolEventById(route.params.id)
      .then((row) => {
        if (!row) {
          setRemoteEvent(null);
          return;
        }
        const startsAt = new Date(row.starts_at);
        setRemoteEvent({
          title: row.title?.trim() || event.title,
          dateLabel: formatStartsAtLabel(row.starts_at) || event.date,
          startsAtDate: Number.isNaN(startsAt.getTime()) ? null : startsAt,
          location: row.location?.trim() || event.location,
          image: row.image_url?.trim() || event.image,
          description: row.description?.trim() || event.description || '',
        });
      })
      .catch(() => setRemoteEvent(null));
  }, [route.params.id]);

  const eventTitle = remoteEvent?.title ?? event.title;
  const eventDateLabel = remoteEvent?.dateLabel ?? event.date;
  const eventLocation = remoteEvent?.location ?? event.location;
  const eventImage = remoteEvent?.image ?? event.image;
  const eventDescription =
    remoteEvent?.description ||
    event.description ||
    `${eventTitle} ile unutulmaz bir dans gecesi sizi bekliyor. Canlı müzik ve harika bir atmosferde ${event.danceType ?? 'Latin'} ritimlerine kendinizi bırakın.`;
  const effectiveRawDate = remoteEvent?.startsAtDate ?? event.rawDate ?? null;
  const isDbEvent = isUuid(route.params.id);
  const attendeeList: EventAttendee[] = dbAttendees ?? (event.attendeeAvatars ?? ['https://i.pravatar.cc/150?u=1', 'https://i.pravatar.cc/150?u=2', 'https://i.pravatar.cc/150?u=3']).map((avatar, i) => ({
    id: `event-${event.id}-${i}`,
    name: `Dansçı ${i + 1}`,
    avatar,
  }));
  const attendingCount = isDbEvent ? attendeeList.length : attending;

  useEffect(() => {
    if (!isDbEvent) {
      setDbAttendees(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [list, joined] = await Promise.all([
          schoolEventAttendeesService.list(route.params.id),
          schoolEventAttendeesService.isJoined(route.params.id),
        ]);
        if (cancelled) return;
        setDbAttendees(list);
        setHasJoined(joined);
      } catch {
        if (!cancelled) setDbAttendees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDbEvent, route.params.id]);

  const handleJoin = async () => {
    if (isDbEvent) {
      try {
        await schoolEventAttendeesService.join(route.params.id);
        const list = await schoolEventAttendeesService.list(route.params.id);
        setDbAttendees(list);
        setHasJoined(true);
      } catch {
        setJoinModalVisible(true);
        return;
      }
    } else {
      setHasJoined(true);
      setAttending((prev) => prev + 1);
    }
    if (effectiveRawDate && !reminderScheduled) {
      const id = await scheduleEventReminder(eventTitle, effectiveRawDate);
      if (id) setReminderScheduled(true);
    }
    setJoinModalVisible(true);
  };

  const handleLeave = () => {
    setLeaveModalVisible(true);
  };

  const confirmLeave = () => {
    if (isDbEvent) {
      void schoolEventAttendeesService.leave(route.params.id)
        .then(() => schoolEventAttendeesService.list(route.params.id))
        .then((list) => {
          setDbAttendees(list);
          setHasJoined(false);
        })
        .catch(() => {});
    } else {
      setHasJoined(false);
      setAttending((prev) => Math.max(0, prev - 1));
    }
    setLeaveModalVisible(false);
  };

  const handleShare = () => {
    Share.share({
      message: `${eventTitle}\n${eventDateLabel}\n${eventLocation}\n${event.price ?? ''}`,
      title: eventTitle,
    }).catch(() => {});
  };

  const headerRight = (
    <View style={styles.headerRightStack}>
      <TouchableOpacity
        onPress={handleShare}
        style={[styles.headerOverlayBtn, { borderRadius: radius.full }]}
        activeOpacity={0.7}
      >
        <Icon name="share-variant" size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          const next = !isFavorite;
          setIsFavorite(next);
          if (next && effectiveRawDate) await scheduleEventReminder(eventTitle, effectiveRawDate);
        }}
        style={[styles.headerOverlayBtn, { borderRadius: radius.full, marginTop: 8 }]}
        activeOpacity={0.7}
      >
        <Icon name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#EE2AEE' : '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen edges={[]}>
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
      <Modal
        visible={friendsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFriendsModalVisible(false)}
      >
        <View style={styles.friendsModalOverlay}>
          <TouchableOpacity
            style={styles.friendsModalBackdrop}
            activeOpacity={1}
            onPress={() => setFriendsModalVisible(false)}
          />
          <View style={[styles.friendsModalBox, { backgroundColor: '#2C1C2D', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.md }]}>
              Katılan arkadaşlar
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {attendeeList.map((attendee, index) => {
                  const name = attendee.name;
                  return (
                    <TouchableOpacity
                      key={attendee.id + index}
                      activeOpacity={0.7}
                      onPress={() => {
                        setFriendsModalVisible(false);
                        navigation.navigate('UserProfile', { userId: attendee.id, name, avatar: attendee.avatar });
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                    >
                      <Avatar source={attendee.avatar} size="sm" />
                      <Text style={[typography.bodySmall, { color: '#FFFFFF', marginLeft: spacing.md }]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            <Button
              title="Kapat"
              variant="secondary"
              fullWidth
              size="md"
              style={{ marginTop: spacing.lg }}
              onPress={() => setFriendsModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: eventImage }} style={styles.heroImage} />
          <View style={[styles.heroGradient, { backgroundColor: 'transparent' }]} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
            <Text style={[typography.h3, { color: '#FFFFFF' }]}>{eventTitle}</Text>
            <View style={[styles.row, { marginTop: spacing.sm }]}>
              <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                <Icon name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginLeft: spacing.sm }]}>{eventDateLabel}</Text>
            </View>
            <View style={[styles.row, { marginTop: spacing.xs }]}>
              <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100 }]}>
                <Icon name="map-marker-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginLeft: spacing.sm }]}>{eventLocation}</Text>
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
                    <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{attendingCount} / {capacity}</Text>
                  </View>
                  <ProgressBar progress={attendingCount / capacity} height={4} style={{ marginTop: 6, width: '100%' }} />
                </View>
              </View>
            </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFriendsModalVisible(true)}
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
                {attendeeList.slice(0, 3).map((attendee, i) => (
                    <TouchableOpacity
                      key={attendee.id}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('UserProfile', { userId: attendee.id, name: attendee.name, avatar: attendee.avatar });
                      }}
                      style={{ marginLeft: i === 0 ? 0 : -8 }}
                    >
                      <Avatar source={attendee.avatar} size="sm" />
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('DanceStar', {
                eventId: route.params.id,
                eventTitle,
                attendees: attendeeList,
              })
            }
            activeOpacity={0.8}
            style={[styles.dqBanner, { backgroundColor: colors.purpleAlpha, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg }]}
          >
            <Icon name="crown" size={24} color={colors.purple} />
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginLeft: spacing.md }]}>DanceStar oylamasına katıl</Text>
            <Icon name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: spacing.xl }} />
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.h4, { color: '#FFFFFF', marginBottom: spacing.sm }]}>Etkinlik açıklaması</Text>
            <Text
              style={[
                typography.bodySmall,
                { color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
              ]}
            >
              {eventDescription}
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
      <View style={[styles.headerOverlay, { paddingTop: insets.top }]} pointerEvents="box-none">
        <Header
          title=""
          showBack
          transparent
          backButtonOverlay
          alignTop
          rightComponent={headerRight}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  heroWrap: { position: 'relative', height: 280 },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  headerRightStack: { alignItems: 'center' },
  headerOverlayBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
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
  friendsModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  friendsModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  friendsModalBox: {
    width: '100%',
    padding: 20,
  },
});
