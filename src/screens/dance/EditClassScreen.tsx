import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';

const formatEventDateTime = (d: Date): string => {
  const dateStr = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr}, ${timeStr}`;
};

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
  for (let w = 0; w < days.length; w += 7) weeks.push(days.slice(w, w + 7));
  return weeks;
}

function getTimeOptions(): { date: Date; label: string }[] {
  const options: { date: Date; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const d = new Date(2000, 0, 1, h, m, 0, 0);
      options.push({ date: d, label: `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}` });
    }
  }
  return options;
}

const TIME_OPTIONS = getTimeOptions();
const DANCE_TYPES = ['Salsa', 'Bachata', 'Tango', 'Kizomba', 'Zumba', 'Latin', 'Cha-Cha', 'Rumba', 'Samba', 'Merengue', 'Diğer'];
const LEVELS = ['Başlangıç', 'Orta', 'İleri'];

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const EditClassScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius, borders } = useTheme();
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [eventDateTime, setEventDateTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedDanceType, setSelectedDanceType] = useState<string | null>(null);
  const [showDancePicker, setShowDancePicker] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const timeListRef = useRef<ScrollView>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (showDatePicker) {
      const t = setTimeout(() => timeListRef.current?.scrollTo({ y: 0, animated: false }), 100);
      return () => clearTimeout(t);
    }
  }, [showDatePicker]);

  const openDatePicker = () => {
    const initial = eventDateTime || new Date();
    setTempDate(initial);
    setViewMonth(initial);
    setTempTime(initial);
    setShowDatePicker(true);
  };

  const onSelectDate = (d: Date) => setTempDate(d);
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
  const calendarWeeks = useMemo(() => getCalendarWeeks(viewMonth.getFullYear(), viewMonth.getMonth()), [viewMonth.getFullYear(), viewMonth.getMonth()]);

  const onSelectTime = (t: Date) => {
    const dateToUse = tempDate || new Date();
    const result = new Date(dateToUse);
    result.setHours(t.getHours(), t.getMinutes(), 0, 0);
    setEventDateTime(result);
    setShowDatePicker(false);
  };

  const selectedTimeIndex = useMemo(() => {
    if (!tempTime) return 0;
    const h = tempTime.getHours();
    const m = tempTime.getMinutes();
    return h * 2 + (m === 30 ? 1 : 0);
  }, [tempTime]);

  const addMedia = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri).filter(Boolean) as string[];
        setMediaUris((prev) => [...prev, ...uris]);
      }
    } catch {}
  };

  const removeMedia = (index: number) => setMediaUris((prev) => prev.filter((_, i) => i !== index));

  const pickLocation = async () => {
    setLocationLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addr = results?.[0];
      if (addr && typeof addr === 'object') {
        const parts = Object.values(addr).filter((v): v is string => typeof v === 'string' && v.length > 0);
        setLocationAddress(parts.length > 0 ? parts.join(', ') : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      } else {
        setLocationAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      }
    } catch {
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Ders Oluştur" showBack rightIcon="check" onRightPress={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 320 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Ders adı"
            placeholder=""
            leftIcon="domain"
            leftIconColor={colors.primary}
            leftIconWithLabel
            labelColor="#9CA3AF"
            backgroundColor="transparent"
            borderColor="rgba(255,255,255,0.12)"
            style={{ color: '#FFFFFF' }}
            placeholderTextColor="#6B7280"
          />
          <Input
            label="Eğitmen"
            placeholder=""
            leftIcon="account"
            leftIconColor={colors.primary}
            leftIconWithLabel
            labelColor="#9CA3AF"
            backgroundColor="transparent"
            borderColor="rgba(255,255,255,0.12)"
            containerStyle={{ marginTop: spacing.lg }}
            style={{ color: '#FFFFFF' }}
            placeholderTextColor="#6B7280"
          />
          <Input
            label="Açıklama"
            placeholder=""
            leftIcon="file-document-outline"
            leftIconColor={colors.primary}
            leftIconWithLabel
            labelColor="#9CA3AF"
            backgroundColor="transparent"
            borderColor="rgba(255,255,255,0.12)"
            containerStyle={{ marginTop: spacing.lg }}
            style={{ color: '#FFFFFF' }}
            placeholderTextColor="#6B7280"
            multiline
          />

          <View style={{ marginTop: spacing.lg }}>
            <View style={styles.labelRow}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="calendar" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Tarih ve Saat</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openDatePicker}
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
            >
              <Text style={[typography.body, { color: eventDateTime ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
                {eventDateTime ? formatEventDateTime(eventDateTime) : ''}
              </Text>
              <Icon name="pencil" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <Modal transparent animationType="slide">
              <View style={styles.modalContainer}>
                <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowDatePicker(false)} />
                <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e' }]}>
                  <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} hitSlop={12}>
                      <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Tarih ve saat seçin</Text>
                    <View style={{ width: 40 }} />
                  </View>
                  <View style={styles.calendarSection}>
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity onPress={prevMonth} style={styles.calendarNav} hitSlop={8}>
                        <Icon name="chevron-left" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={[typography.h3, { color: '#FFFFFF', fontWeight: '700' }]}>{MONTHS_TR[viewMonth.getMonth()]} {viewMonth.getFullYear()}</Text>
                      <TouchableOpacity onPress={nextMonth} style={styles.calendarNav} hitSlop={8}>
                        <Icon name="chevron-right" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.weekdayRow}>
                      {WEEKDAY_TR.map((wd) => (
                        <Text key={wd} style={[typography.caption, { color: 'rgba(255,255,255,0.6)', flex: 1, textAlign: 'center' }]}>{wd}</Text>
                      ))}
                    </View>
                    {calendarWeeks.map((week, wi) => (
                      <View key={wi} style={styles.calendarWeek}>
                        {week.map((cell) => {
                          const selected = tempDate && isSameDay(cell.date, tempDate);
                          const selectable = canSelectDay(cell);
                          return (
                            <TouchableOpacity
                              key={cell.date.getTime()}
                              style={[styles.calendarDay, !cell.isCurrentMonth && styles.calendarDayOther, !selectable && cell.isCurrentMonth && styles.calendarDayDisabled]}
                              onPress={() => selectable && onSelectDate(cell.date)}
                              disabled={!selectable}
                              activeOpacity={0.8}
                            >
                              <View style={[styles.calendarDayInner, selected && { backgroundColor: colors.primary }]}>
                                <Text style={[typography.body, { color: !cell.isCurrentMonth ? 'rgba(255,255,255,0.4)' : '#FFFFFF', fontWeight: cell.isToday && !selected ? '700' : '400' }]}>{cell.day}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                  <View style={[styles.timeCard, { backgroundColor: colors.background, borderRadius: radius.xl }]}>
                    {tempDate && (
                      <Text style={[typography.label, { color: '#9CA3AF', marginBottom: spacing.sm }]}>
                        {tempDate.getDate() === new Date().getDate() && tempDate.getMonth() === new Date().getMonth() && tempDate.getFullYear() === new Date().getFullYear()
                          ? 'Bugün'
                          : `${tempDate.getDate()} ${MONTHS_TR[tempDate.getMonth()]} ${tempDate.getFullYear()}`}
                      </Text>
                    )}
                    <ScrollView ref={timeListRef} style={styles.timeListScroll} contentContainerStyle={styles.pickerScrollContent} showsVerticalScrollIndicator={false}>
                      {TIME_OPTIONS.map((opt, index) => (
                        <TouchableOpacity
                          key={`${opt.label}-${index}`}
                          style={[styles.pickerRow, { backgroundColor: index === selectedTimeIndex ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                          onPress={() => onSelectTime(opt.date)}
                          activeOpacity={0.7}
                        >
                          <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>{opt.label}</Text>
                          {index === selectedTimeIndex && <Icon name="check" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="map-marker" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Konum / Yer</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={pickLocation}
              disabled={locationLoading}
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
            >
              <Text style={[typography.body, { color: locationAddress ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={2}>
                {locationLoading ? 'Konum alınıyor...' : locationAddress || 'Konum seçin'}
              </Text>
              <Icon name={locationAddress ? 'pencil' : 'map-marker'} size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="music" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Dans Türü</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowDancePicker(true)}
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
            >
              <Text style={[typography.body, { color: selectedDanceType ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
                {selectedDanceType || 'Dans türü seçin'}
              </Text>
              <Icon name="chevron-down" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
          </View>

          {showDancePicker && (
            <Modal transparent animationType="slide">
              <View style={styles.modalContainer}>
                <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowDancePicker(false)} />
                <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e', maxHeight: '50%' }]}>
                  <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                    <TouchableOpacity onPress={() => setShowDancePicker(false)} hitSlop={12}>
                      <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Dans türü seçin</Text>
                    <View style={{ width: 40 }} />
                  </View>
                  <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
                    {DANCE_TYPES.map((name) => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.pickerRow, { backgroundColor: selectedDanceType === name ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                        onPress={() => { setSelectedDanceType(name); setShowDancePicker(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>{name}</Text>
                        {selectedDanceType === name && <Icon name="check" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
              <View style={[styles.iconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="image-multiple-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Görsel ve Videolar</Text>
            </View>
            <View style={[styles.mediaInputBox, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)', borderRadius: radius.xl, padding: spacing.lg }]}>
              <View style={styles.mediaRow}>
                {mediaUris.map((uri, index) => (
                  <View key={index} style={[styles.mediaThumbWrap, { marginRight: spacing.sm }]}>
                    <Image source={{ uri }} style={[styles.mediaThumb, { borderRadius: radius.lg }]} />
                    <TouchableOpacity onPress={() => removeMedia(index)} style={[styles.mediaRemoveBtn, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 }]} hitSlop={8}>
                      <Icon name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={addMedia} style={[styles.mediaAddBtn, { borderColor: 'rgba(255,255,255,0.3)', borderRadius: radius.lg }]} activeOpacity={0.8}>
                  <Icon name="camera-plus" size={28} color="#9CA3AF" />
                  <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>Ekle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
              <View style={[styles.leftIconBox, { backgroundColor: '#4B154B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 100, marginRight: spacing.sm }]}>
                <Icon name="chart-line" size={18} color={colors.primary} />
              </View>
              <Text style={[typography.label, { color: '#9CA3AF' }]}>Seviye</Text>
            </View>
            <View style={{ height: spacing.xs }} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowLevelPicker(true)}
              style={[styles.dateInputRow, { backgroundColor: 'transparent', borderRadius: radius.xl, borderWidth: borders.thin, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.lg }]}
            >
              <Text style={[typography.body, { color: selectedLevel ? '#FFFFFF' : '#6B7280', flex: 1 }]} numberOfLines={1}>
                {selectedLevel || 'Seviye seçin'}
              </Text>
              <Icon name="chevron-down" size={20} color="#FFFFFF" style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
          </View>

          {showLevelPicker && (
            <Modal transparent animationType="slide">
              <View style={styles.modalContainer}>
                <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowLevelPicker(false)} />
                <View style={[styles.pickerSheet, { backgroundColor: '#2d1b2e', maxHeight: '40%' }]}>
                  <View style={[styles.pickerHeader, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
                    <TouchableOpacity onPress={() => setShowLevelPicker(false)} hitSlop={12}>
                      <Text style={[typography.body, { color: '#9CA3AF' }]}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Seviye seçin</Text>
                    <View style={{ width: 40 }} />
                  </View>
                  <View style={{ paddingVertical: 8 }}>
                    {LEVELS.map((name) => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.pickerRow, { backgroundColor: selectedLevel === name ? 'rgba(255,255,255,0.12)' : 'transparent' }]}
                        onPress={() => { setSelectedLevel(name); setShowLevelPicker(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[typography.body, { color: '#FFFFFF', fontSize: 16 }]}>{name}</Text>
                        {selectedLevel === name && <Icon name="check" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </Modal>
          )}

          <Input
            label="Katılımcı Limiti"
            placeholder=""
            leftIcon="account-group"
            leftIconColor={colors.primary}
            leftIconWithLabel
            labelColor="#9CA3AF"
            backgroundColor="transparent"
            borderColor="rgba(255,255,255,0.12)"
            containerStyle={{ marginTop: spacing.lg }}
            style={{ color: '#FFFFFF' }}
            placeholderTextColor="#6B7280"
            keyboardType="number-pad"
          />
          <Input
            label="Ücret"
            placeholder=""
            leftIcon="tag-outline"
            leftIconColor={colors.primary}
            leftIconWithLabel
            labelColor="#9CA3AF"
            backgroundColor="transparent"
            borderColor="rgba(255,255,255,0.12)"
            containerStyle={{ marginTop: spacing.lg }}
            style={{ color: '#FFFFFF' }}
            placeholderTextColor="#6B7280"
            onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          />
          <Button title="Kaydet" onPress={() => navigation.goBack()} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dateInputRow: { flexDirection: 'row', alignItems: 'center', height: 52 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  leftIconBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconBox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 34, paddingHorizontal: 16, maxHeight: '85%' },
  calendarSection: { paddingVertical: 12 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  calendarNav: { padding: 4 },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  calendarWeek: { flexDirection: 'row', marginBottom: 4 },
  calendarDay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  calendarDayInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calendarDayOther: { opacity: 0.6 },
  calendarDayDisabled: { opacity: 0.5 },
  timeCard: { marginTop: 8, padding: 16, maxHeight: 240 },
  timeListScroll: { maxHeight: 200 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  pickerScrollContent: { paddingBottom: 24, paddingVertical: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, minHeight: 52 },
  mediaInputBox: { borderWidth: 1 },
  mediaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  mediaThumbWrap: { position: 'relative' },
  mediaThumb: { width: 88, height: 88 },
  mediaRemoveBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  mediaAddBtn: { width: 88, height: 88, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
