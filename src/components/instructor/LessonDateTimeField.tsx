import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../theme';
import { Icon } from '../ui/Icon';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAY_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

type CalendarDay = { date: Date; day: number; isCurrentMonth: boolean; isToday: boolean };

function getCalendarWeeks(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const startPadding = firstWeekday;
  const totalCells = Math.ceil((startPadding + daysInMonth) / 7) * 7;
  const days: CalendarDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayIndex = i - startPadding + 1;
    if (dayIndex < 1) {
      const d = new Date(year, month, dayIndex);
      days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false });
    } else if (dayIndex > daysInMonth) {
      const d = new Date(year, month + 1, dayIndex - daysInMonth);
      days.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false });
    } else {
      const d = new Date(year, month, dayIndex);
      const dNorm = new Date(d);
      dNorm.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        day: dayIndex,
        isCurrentMonth: true,
        isToday: dNorm.getTime() === today.getTime(),
      });
    }
  }
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < days.length; w += 7) {
    weeks.push(days.slice(w, w + 7));
  }
  return weeks;
}

function getTimeOptions(): { date: Date; label: string }[] {
  const options: { date: Date; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const d = new Date(2000, 0, 1, h, m, 0, 0);
      const label = `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
      options.push({ date: d, label });
    }
  }
  return options;
}

const TIME_OPTIONS = getTimeOptions();

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDisplay(d: Date): string {
  return d.toLocaleString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  label?: string;
  helperText?: string;
  emptyText?: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
};

export const LessonDateTimeField: React.FC<Props> = ({
  label = 'Tarih ve saat',
  helperText = 'İsteğe bağlı. Tek seferlik / ilk ders oturumu için.',
  emptyText = 'Seçmek için dokunun',
  value,
  onChange,
}) => {
  const { colors, spacing, typography, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const timeListRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => timeListRef.current?.scrollTo({ y: 0, animated: false }), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const openPicker = () => {
    if (value) {
      setTempDate(value);
      setViewMonth(value);
      setTempTime(new Date(2000, 0, 1, value.getHours(), value.getMinutes(), 0, 0));
    } else {
      const now = new Date();
      setTempDate(now);
      setViewMonth(now);
      setTempTime(now);
    }
    setOpen(true);
  };

  const canSelectDay = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dNorm = new Date(day.date);
    dNorm.setHours(0, 0, 0, 0);
    return dNorm.getTime() >= today.getTime();
  };

  const prevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const calendarWeeks = useMemo(
    () => getCalendarWeeks(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth.getFullYear(), viewMonth.getMonth()],
  );

  const selectedTimeIndex = useMemo(() => {
    if (!tempTime) return 0;
    const h = tempTime.getHours();
    const m = tempTime.getMinutes();
    return h * 2 + (m === 30 ? 1 : 0);
  }, [tempTime]);

  const onSelectTime = (t: Date) => {
    const dateToUse = tempDate ?? new Date();
    const result = new Date(dateToUse);
    result.setHours(t.getHours(), t.getMinutes(), 0, 0);
    onChange(result);
    setOpen(false);
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.captionBold, { color: '#FFFFFF', marginBottom: spacing.xs }]}>{label}</Text>
      <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
        {helperText}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openPicker}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 48,
            paddingHorizontal: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            backgroundColor: '#311831',
          }}
        >
          <Icon name="calendar-clock" size={20} color={colors.primary} />
          <Text
            style={[
              typography.bodySmall,
              { color: value ? '#FFFFFF' : colors.textTertiary, marginLeft: spacing.sm, flex: 1 },
            ]}
            numberOfLines={2}
          >
            {value ? formatDisplay(value) : emptyText}
          </Text>
          <Icon name="chevron-down" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        {value ? (
          <TouchableOpacity
            onPress={() => onChange(null)}
            hitSlop={8}
            style={{ padding: spacing.sm }}
          >
            <Text style={[typography.captionBold, { color: colors.primary }]}>Temizle</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={sheetStyles.modalContainer}>
          <TouchableOpacity activeOpacity={1} style={sheetStyles.modalOverlay} onPress={() => setOpen(false)} />
          <View style={[sheetStyles.pickerSheet, { backgroundColor: '#2d1b2e' }]}>
            <View style={[sheetStyles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Text style={[typography.bodySmall, { color: '#9CA3AF' }]}>İptal</Text>
              </TouchableOpacity>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Tarih ve saat</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={sheetStyles.calendarSection}>
              <View style={sheetStyles.calendarHeader}>
                <TouchableOpacity onPress={prevMonth} style={sheetStyles.calendarNav} hitSlop={8}>
                  <Icon name="chevron-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={[typography.h4, { color: '#FFFFFF' }]}>
                  {MONTHS_TR[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={sheetStyles.calendarNav} hitSlop={8}>
                  <Icon name="chevron-right" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={sheetStyles.weekdayRow}>
                {WEEKDAY_TR.map((wd) => (
                  <Text key={wd} style={[typography.caption, { color: 'rgba(255,255,255,0.6)', flex: 1, textAlign: 'center' }]}>
                    {wd}
                  </Text>
                ))}
              </View>
              {calendarWeeks.map((week, wi) => (
                <View key={wi} style={sheetStyles.calendarWeek}>
                  {week.map((cell) => {
                    const selected = tempDate && isSameDay(cell.date, tempDate);
                    const selectable = canSelectDay(cell);
                    return (
                      <TouchableOpacity
                        key={cell.date.getTime()}
                        style={[
                          sheetStyles.calendarDay,
                          !cell.isCurrentMonth && sheetStyles.calendarDayOther,
                          !selectable && cell.isCurrentMonth && sheetStyles.calendarDayDisabled,
                        ]}
                        onPress={() => selectable && setTempDate(cell.date)}
                        disabled={!selectable}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            sheetStyles.calendarDayInner,
                            selected && { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text
                            style={[
                              typography.bodySmall,
                              {
                                color: !cell.isCurrentMonth ? 'rgba(255,255,255,0.4)' : '#FFFFFF',
                                fontWeight: cell.isToday && !selected ? '700' : '400',
                              },
                            ]}
                          >
                            {cell.day}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={[sheetStyles.timeCard, { backgroundColor: colors.background, borderRadius: radius.xl }]}>
              {tempDate ? (
                <Text style={[typography.caption, { color: '#9CA3AF', marginBottom: spacing.sm }]}>
                  Saat seçin (tarih: {tempDate.getDate()} {MONTHS_TR[tempDate.getMonth()]})
                </Text>
              ) : null}
              <ScrollView
                ref={timeListRef}
                style={sheetStyles.timeListScroll}
                contentContainerStyle={sheetStyles.pickerScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {TIME_OPTIONS.map((opt, index) => (
                  <TouchableOpacity
                    key={`${opt.label}-${index}`}
                    style={[
                      sheetStyles.pickerRow,
                      { backgroundColor: index === selectedTimeIndex ? 'rgba(255,255,255,0.12)' : 'transparent' },
                    ]}
                    onPress={() => onSelectTime(opt.date)}
                    activeOpacity={0.7}
                  >
                    <Text style={[typography.bodySmall, { color: '#FFFFFF', fontSize: 16 }]}>{opt.label}</Text>
                    {index === selectedTimeIndex ? <Icon name="check" size={20} color={colors.primary} /> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const sheetStyles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    paddingHorizontal: 16,
    maxHeight: '85%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  calendarSection: { paddingVertical: 12 },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  calendarNav: { padding: 4 },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  calendarWeek: { flexDirection: 'row', marginBottom: 4 },
  calendarDay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  calendarDayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayOther: { opacity: 0.6 },
  calendarDayDisabled: { opacity: 0.5 },
  timeCard: { marginTop: 8, padding: 16, maxHeight: 240 },
  timeListScroll: { maxHeight: 200 },
  pickerScrollContent: { paddingBottom: 24, paddingVertical: 8 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 52,
  },
});
