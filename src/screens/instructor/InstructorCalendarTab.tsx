import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';
import {
  formatLessonStartsAt,
  instructorLessonsService,
  instructorScheduleService,
  InstructorLessonModel,
  InstructorScheduleSlotModel,
} from '../../services/api/instructorLessons';
import {
  INSTRUCTOR_WEEKDAYS,
  dateToInstructorWeekday,
  instructorLocationLabel,
} from './instructorScheduleConstants';

type LessonWithSlots = {
  lesson: InstructorLessonModel;
  slots: InstructorScheduleSlotModel[];
};

type CalendarEventItem = {
  id: string;
  lessonId: string;
  kind: 'ders_baslangic' | 'haftalik';
  lessonTitle: string;
  detail: string;
  sortMinutes: number;
};

type Nav = NativeStackNavigationProp<MainStackParamList>;

function sameLocalCalendarDay(d: Date, y: number, m: number, day: number): boolean {
  return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
}

function slotSortMinutes(startTime: string): number {
  const m = startTime.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

function startsAtSortMinutes(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getHours() * 60 + d.getMinutes();
}

function eventsForLocalDay(
  y: number,
  m: number,
  day: number,
  data: LessonWithSlots[],
): CalendarEventItem[] {
  const out: CalendarEventItem[] = [];
  const check = new Date(y, m, day);

  for (const { lesson, slots } of data) {
    if (lesson.startsAt) {
      const dt = new Date(lesson.startsAt);
      if (!Number.isNaN(dt.getTime()) && sameLocalCalendarDay(dt, y, m, day)) {
        const label = formatLessonStartsAt(lesson.startsAt) ?? '';
        out.push({
          id: `start-${lesson.id}-${y}-${m}-${day}`,
          lessonId: lesson.id,
          kind: 'ders_baslangic',
          lessonTitle: lesson.title,
          detail: label ? `Ders tarihi: ${label}` : 'Ders tarihi',
          sortMinutes: startsAtSortMinutes(lesson.startsAt),
        });
      }
    }

    const dbD = dateToInstructorWeekday(check);
    for (const s of slots) {
      if (s.weekday !== dbD) continue;
      const loc = instructorLocationLabel(s.locationType);
      const addr = s.address ? ` · ${s.address}` : '';
      out.push({
        id: `slot-${s.id}-${y}-${m}-${day}`,
        lessonId: lesson.id,
        kind: 'haftalik',
        lessonTitle: lesson.title,
        detail: `${s.startTime} · ${loc}${addr}`,
        sortMinutes: slotSortMinutes(s.startTime),
      });
    }
  }

  out.sort((a, b) => a.sortMinutes - b.sortMinutes || a.lessonTitle.localeCompare(b.lessonTitle));
  return out;
}

function buildMonthCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startPad = dateToInstructorWeekday(first);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chunkWeeks(cells: (number | null)[]): (number | null)[][] {
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export const InstructorCalendarTab: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography, radius } = useTheme();
  const now = new Date();
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [data, setData] = useState<LessonWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

  const y = monthAnchor.getFullYear();
  const m = monthAnchor.getMonth();

  const load = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const list = await instructorLessonsService.listMine();
      const withSlots = await Promise.all(
        list.map(async (lesson) => ({
          lesson,
          slots: await instructorScheduleService.listByLesson(lesson.id),
        })),
      );
      setData(withSlots);
    } catch (e: unknown) {
      setData([]);
      setErrorBanner(e instanceof Error ? e.message : 'Takvim verisi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const monthLabel = useMemo(
    () =>
      monthAnchor.toLocaleDateString('tr-TR', {
        month: 'long',
        year: 'numeric',
      }),
    [monthAnchor],
  );

  const cells = useMemo(() => buildMonthCells(y, m), [y, m]);
  const weeks = useMemo(() => chunkWeeks(cells), [cells]);

  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      map.set(`${y}-${m}-${d}`, eventsForLocalDay(y, m, d, data));
    }
    return map;
  }, [y, m, data]);

  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  const selectedEvents =
    selectedDay != null ? (eventsByDayKey.get(`${y}-${m}-${selectedDay}`) ?? []) : [];

  const selectedDateLabel =
    selectedDay != null
      ? new Date(y, m, selectedDay).toLocaleDateString('tr-TR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

  const goPrevMonth = () => {
    setMonthAnchor(new Date(y, m - 1, 1));
    setSelectedDay(null);
  };

  const goNextMonth = () => {
    setMonthAnchor(new Date(y, m + 1, 1));
    setSelectedDay(null);
  };

  const goThisMonth = () => {
    const t = new Date();
    setMonthAnchor(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDay(t.getDate());
  };

  if (loading && data.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {errorBanner ? (
        <Text style={[typography.caption, { color: colors.orange, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
          {errorBanner}
        </Text>
      ) : null}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Seçili ayda ders başlangıç tarihleri ve haftalık program satırları birlikte gösterilir.
        </Text>

        <View style={[styles.monthNav, { marginBottom: spacing.md }]}>
          <TouchableOpacity onPress={goPrevMonth} hitSlop={12} style={styles.navBtn}>
            <Icon name="chevron-left" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[typography.bodyBold, { color: '#FFFFFF', flex: 1, textAlign: 'center' }]}>{monthLabel}</Text>
          <TouchableOpacity onPress={goNextMonth} hitSlop={12} style={styles.navBtn}>
            <Icon name="chevron-right" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goThisMonth} style={{ alignSelf: 'flex-start', marginBottom: spacing.md }}>
          <Text style={[typography.captionBold, { color: colors.primary }]}>Bugüne dön</Text>
        </TouchableOpacity>

        <View style={[styles.weekHeader, { marginBottom: spacing.xs }]}>
          {INSTRUCTOR_WEEKDAYS.map((d) => (
            <View key={d.v} style={styles.weekHeaderCell}>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>{d.label}</Text>
            </View>
          ))}
        </View>

        {weeks.map((row, ri) => (
          <View key={ri} style={[styles.weekRow, { marginBottom: 2 }]}>
            {row.map((dayNum, ci) => {
              if (dayNum == null) {
                return <View key={`e-${ci}`} style={styles.dayCell} />;
              }
              const isToday = y === todayY && m === todayM && dayNum === todayD;
              const isSelected = selectedDay === dayNum;
              const dayEvents = eventsByDayKey.get(`${y}-${m}-${dayNum}`) ?? [];
              const hasEvents = dayEvents.length > 0;

              return (
                <TouchableOpacity
                  key={dayNum}
                  style={[
                    styles.dayCell,
                    {
                      borderRadius: radius.md,
                      borderWidth: isToday ? 2 : 1,
                      borderColor: isSelected ? colors.primary : isToday ? colors.primary + '88' : colors.cardBorder,
                      backgroundColor: isSelected ? colors.primary : '#311831',
                    },
                  ]}
                  onPress={() => setSelectedDay(dayNum)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      typography.bodySmallBold,
                      { color: '#FFFFFF', textAlign: 'center' },
                    ]}
                  >
                    {dayNum}
                  </Text>
                  {hasEvents ? (
                    <View style={styles.dotsRow}>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <View
                          key={ev.id}
                          style={[
                            styles.dot,
                            {
                              backgroundColor: ev.kind === 'ders_baslangic' ? colors.orange : colors.primary,
                            },
                          ]}
                        />
                      ))}
                      {dayEvents.length > 3 ? (
                        <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 9 }]}>+</Text>
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <Text style={[typography.bodySmallBold, { color: '#FFFFFF', marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          {selectedDay != null ? selectedDateLabel : 'Bir gün seçin'}
        </Text>

        {selectedDay == null ? (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            Takvimden bir güne dokunarak o güne ait ders ve programları görün.
          </Text>
        ) : selectedEvents.length === 0 ? (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Bu günde kayıtlı ders veya program yok.</Text>
        ) : (
          selectedEvents.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ClassDetails', { id: ev.lessonId })}
              style={{
                marginTop: spacing.sm,
                padding: spacing.md,
                backgroundColor: '#311831',
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    marginRight: spacing.sm,
                    backgroundColor: ev.kind === 'ders_baslangic' ? colors.orange : colors.primary,
                  }}
                />
                <Text style={[typography.captionBold, { color: colors.textTertiary }]}>
                  {ev.kind === 'ders_baslangic' ? 'Ders tarihi' : 'Haftalık program'}
                </Text>
              </View>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>{ev.lessonTitle}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>{ev.detail}</Text>
            </TouchableOpacity>
          ))
        )}

        <View style={[styles.legend, { marginTop: spacing.xl, padding: spacing.md, borderColor: colors.cardBorder }]}>
          <Text style={[typography.captionBold, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Gösterim</Text>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: colors.orange }]} />
            <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: spacing.sm }]}>Ders başlangıç tarihi</Text>
          </View>
          <View style={[styles.legendRow, { marginTop: 6 }]}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[typography.caption, { color: colors.textTertiary, marginLeft: spacing.sm }]}>
              Haftalık program satırı
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { padding: 4 },
  weekHeader: { flexDirection: 'row' },
  weekHeaderCell: { flex: 1, alignItems: 'center' },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    marginHorizontal: 2,
    minHeight: 48,
    paddingVertical: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 3,
    marginTop: 4,
    maxWidth: '100%',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legend: { borderRadius: 12, borderWidth: 1, backgroundColor: 'transparent' },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
});
