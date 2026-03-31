import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../types/navigation';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { danceCircleService } from '../../services/api/danceCircle';

const fallbackAttendees = [
  { id: '1', name: 'Elif', avatar: 'https://i.pravatar.cc/150?u=1', voted: false },
  { id: '2', name: 'Can', avatar: 'https://i.pravatar.cc/150?u=2', voted: false },
  { id: '3', name: 'Ayşe', avatar: 'https://i.pravatar.cc/150?u=3', voted: false },
  { id: '4', name: 'Mehmet', avatar: 'https://i.pravatar.cc/150?u=4', voted: false },
];

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Props = NativeStackScreenProps<MainStackParamList, 'DanceStar'>;

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export const DanceStarScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const seededAttendees = useMemo(() => {
    const fromRoute = route.params?.attendees ?? [];
    if (fromRoute.length > 0) {
      return fromRoute.map((a) => ({ ...a, voted: false }));
    }
    return fallbackAttendees;
  }, [route.params?.attendees]);
  const [attendees, setAttendees] = useState(seededAttendees);
  const [seconds, setSeconds] = useState(300); // 5 min
  const eventTitle = route.params?.eventTitle?.trim() || 'Etkinlik';
  const maxVotes = 1;
  const usedVotes = attendees.filter((a) => a.voted).length;
  const selectedAttendee = attendees.find((a) => a.voted) ?? null;

  useEffect(() => {
    setAttendees(seededAttendees);
  }, [seededAttendees]);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const toggleVote = (id: string) => {
    if (selectedAttendee) return;
    let changedToVote = false;
    setAttendees((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (a.voted) return { ...a, voted: false };
        if (usedVotes >= maxVotes) return a;
        changedToVote = true;
        return { ...a, voted: true };
      }),
    );
    if (changedToVote && isUuid(id)) {
      void danceCircleService.submitVote(id, 'like').catch(() => {});
    }
  };

  const clearVote = () => {
    if (!selectedAttendee) return;
    setAttendees((prev) => prev.map((a) => ({ ...a, voted: false })));
  };

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return (
    <Screen>
      <Header title="DanceStar" showBack />

      <View
        style={[
          styles.timerBar,
          {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            backgroundColor: colors.headerBg,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <Text style={[typography.captionBold, { color: '#C084FC', marginBottom: spacing.xs }]}>
          Oylama süresi
        </Text>
        <View style={[styles.timerWrap, { borderRadius: 16, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: '#2B1730' }]}>
          <View style={[styles.timerRow, { justifyContent: 'center' }]}>
            <View style={[styles.timerBox, { backgroundColor: '#3A1E3E', borderRadius: 12, borderColor: 'rgba(255,255,255,0.14)' }]}>
              <Text style={[typography.h2, { color: '#FFFFFF' }]}>{String(m).padStart(2, '0')}</Text>
              <Text style={[typography.caption, { color: '#D1D5DB' }]}>DAKİKA</Text>
            </View>
            <Text style={[typography.h3, { color: '#C084FC', marginHorizontal: spacing.sm }]}>:</Text>
            <View style={[styles.timerBox, { backgroundColor: '#3A1E3E', borderRadius: 12, borderColor: 'rgba(255,255,255,0.14)' }]}>
              <Text style={[typography.h2, { color: '#FFFFFF' }]}>{String(s).padStart(2, '0')}</Text>
              <Text style={[typography.caption, { color: '#D1D5DB' }]}>SANİYE</Text>
            </View>
          </View>
          <ProgressBar progress={usedVotes / maxVotes} color={colors.primary} style={{ marginTop: spacing.sm }} />
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6 }]}>
            {usedVotes} / {maxVotes} oy kullandın
          </Text>
        </View>
        <Text style={[typography.caption, { color: '#9CA3AF', marginTop: spacing.xs }]}>
          Bu ekran, katıldığın etkinliklerdeki katılımcıları oylamak içindir.
        </Text>
        <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xs }]}>
          Etkinlik: {eventTitle}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.listHeader, { backgroundColor: '#2B1730', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, marginBottom: spacing.md, padding: spacing.md }]}>
          <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Katılımcı listesi</Text>
          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>Bir kişiyi seçip oyunu kilitle</Text>
        </View>
        {attendees.map((a) => (
          <TouchableOpacity
            key={a.id}
            onPress={() => toggleVote(a.id)}
            activeOpacity={0.8}
            disabled={!!selectedAttendee}
            style={{ marginBottom: spacing.md, opacity: selectedAttendee && !a.voted ? 0.6 : 1 }}
          >
            <Card
              style={[
                styles.attendeeCard,
                {
                  backgroundColor: '#2B1730',
                  borderRadius: 14,
                  borderColor: a.voted ? colors.primary : 'rgba(255,255,255,0.1)',
                },
                a.voted ? { borderWidth: 2 } : {},
              ]}
            >
              <View style={styles.attendeeRow}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('UserProfile', { userId: a.id, name: a.name, avatar: a.avatar });
                  }}
                  activeOpacity={0.8}
                >
                  <Avatar source={a.avatar} size="lg" />
                </TouchableOpacity>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>{a.name}</Text>
                  <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>
                    Katılımcı
                  </Text>
                </View>
                {a.voted ? (
                  <Icon name="check-circle" size={28} color={colors.primary} />
                ) : (
                  <View style={[styles.voteBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: 20 }]}>
                    <Icon name="vote" size={20} color={colors.textSecondary} />
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        {selectedAttendee ? (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
              Oyun kilitlendi: {selectedAttendee.name}
            </Text>
            <TouchableOpacity
              onPress={clearVote}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#4B154B',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#C084FC',
                paddingVertical: spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF', letterSpacing: 0.3 }]}>Oyu geri al</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  timerBar: {},
  timerWrap: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  timerRow: { flexDirection: 'row', gap: 12 },
  timerBox: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 84, borderWidth: 1 },
  listHeader: {
    borderWidth: 1,
  },
  attendeeCard: {
    borderWidth: 1,
    padding: 12,
  },
  attendeeRow: { flexDirection: 'row', alignItems: 'center' },
  voteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});

