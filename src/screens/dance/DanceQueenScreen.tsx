import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ProgressBar } from '../../components/ui/ProgressBar';

const mockAttendees = [
  { id: '1', name: 'Elif', avatar: 'https://i.pravatar.cc/150?u=1', voted: false },
  { id: '2', name: 'Can', avatar: 'https://i.pravatar.cc/150?u=2', voted: false },
  { id: '3', name: 'Ayşe', avatar: 'https://i.pravatar.cc/150?u=3', voted: false },
  { id: '4', name: 'Mehmet', avatar: 'https://i.pravatar.cc/150?u=4', voted: false },
];

export const DanceQueenScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography } = useTheme();
  const [attendees, setAttendees] = useState(mockAttendees);
  const [seconds, setSeconds] = useState(300); // 5 min
  const maxVotes = 1; // 1 kullanıcı 1 kez oy verebilir
  const usedVotes = attendees.filter((a) => a.voted).length;

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const toggleVote = (id: string) => {
    setAttendees((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (a.voted) return { ...a, voted: false };
        if (usedVotes >= maxVotes) return a;
        return { ...a, voted: true };
      })
    );
  };

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return (
    <Screen>
      <Header title="DanceQueen" showBack />

      <View style={[styles.timerBar, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
        <View style={styles.timerRow}>
          <View style={[styles.timerBox, { backgroundColor: colors.surface, borderRadius: 12 }]}>
            <Text style={[typography.h2, { color: colors.text }]}>{String(m).padStart(2, '0')}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>dk</Text>
          </View>
          <View style={[styles.timerBox, { backgroundColor: colors.surface, borderRadius: 12 }]}>
            <Text style={[typography.h2, { color: colors.text }]}>{String(s).padStart(2, '0')}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>sn</Text>
          </View>
        </View>
        <ProgressBar progress={usedVotes / maxVotes} color={colors.primary} style={{ marginTop: spacing.sm }} />
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
          {usedVotes} / {maxVotes} oy kullandın
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {attendees.map((a) => (
          <TouchableOpacity
            key={a.id}
            onPress={() => toggleVote(a.id)}
            activeOpacity={0.8}
            disabled={!a.voted && usedVotes >= maxVotes}
            style={{ marginBottom: spacing.md }}
          >
            <Card style={a.voted ? { borderWidth: 2, borderColor: colors.primary } : {}}>
              <View style={styles.attendeeRow}>
                <Avatar source={a.avatar} size="lg" />
                <Text style={[typography.bodyBold, { color: colors.text, marginLeft: spacing.md, flex: 1 }]}>{a.name}</Text>
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
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  timerBar: {},
  timerRow: { flexDirection: 'row', gap: 12 },
  timerBox: { padding: 16, alignItems: 'center', minWidth: 70 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center' },
  voteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
