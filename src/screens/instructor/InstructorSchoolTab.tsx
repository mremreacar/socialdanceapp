import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { instructorSchoolAssignmentsService } from '../../services/api/instructorSchoolAssignments';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const InstructorSchoolTab: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography, radius } = useTheme();
  const [schools, setSchools] = useState<Awaited<ReturnType<typeof instructorSchoolAssignmentsService.listMine>>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [failedSchoolImageIds, setFailedSchoolImageIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const schoolList = await instructorSchoolAssignmentsService.listMine();
      setSchools(schoolList);
      setSelectedSchoolId((prev) => {
        if (prev && schoolList.some((school) => school.schoolId === prev)) return prev;
        return schoolList[0]?.schoolId ?? null;
      });
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (schools.length === 0) {
    return (
      <View style={[styles.centered, { padding: spacing.lg }]}>
        <View
          style={{
            backgroundColor: '#311831',
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: spacing.xl,
            alignItems: 'center',
          }}
        >
          <Icon name="school-outline" size={40} color={colors.textTertiary} />
          <Text style={[typography.bodyBold, { color: '#FFFFFF', marginTop: spacing.md, textAlign: 'center' }]}>
            Yetkilendirildiğiniz bir okul bulunmamaktadır
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            Okul ataması yönetici tarafından yapılır. Atama sonrası okul bilgileri burada görünür.
          </Text>
        </View>
      </View>
    );
  }

  const locationLine = (s: (typeof schools)[0]) => {
    const parts = [s.district, s.city].filter(Boolean).join(', ');
    return parts || s.address || '';
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[typography.captionBold, { color: '#FFFFFF', marginBottom: spacing.xs }]}>Atanan okullar</Text>
      <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.md }]}>
        Aşağıdaki okul(lar) hesabınıza eğitmen veya yönetici olarak bağlanmıştır.
      </Text>

      {schools.map((s) => (
        <View
          key={s.schoolId}
          style={[
            styles.groupCard,
            {
              marginBottom: spacing.md,
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              padding: spacing.md,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SchoolDetails', { id: s.schoolId })}
          >
            <View style={styles.row}>
              <View style={[styles.thumb, { backgroundColor: '#4B154B', overflow: 'hidden' }]}>
                <Image
                  source={
                    s.imageUrl?.trim() && !failedSchoolImageIds.has(s.schoolId)
                      ? { uri: s.imageUrl.trim() }
                      : require('../../../assets/social_dance.png')
                  }
                  style={{ width: 56, height: 56 }}
                  contentFit={s.imageUrl?.trim() && !failedSchoolImageIds.has(s.schoolId) ? 'cover' : 'contain'}
                  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                  transition={200}
                  onError={() =>
                    setFailedSchoolImageIds((prev) => {
                      const next = new Set(prev);
                      next.add(s.schoolId);
                      return next;
                    })
                  }
                />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]} numberOfLines={2}>
                  {s.name}
                </Text>
                {selectedSchoolId === s.schoolId ? (
                  <Text style={[typography.captionBold, { color: colors.primary, marginTop: 4 }]}>Seçili okul</Text>
                ) : null}
                {locationLine(s) ? (
                  <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]} numberOfLines={2}>
                    {locationLine(s)}
                  </Text>
                ) : null}
                {s.telephone ? (
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>{s.telephone}</Text>
                ) : null}
              </View>
              <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>

          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Okulun paneline geç"
              onPress={() => navigation.navigate('SchoolAdminPanel', { schoolId: s.schoolId })}
              fullWidth
            />
          </View>

          <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
            Bu okul sana atanmış durumda. Okulun panelinde bilgileri güncelleyebilir, düzenleyebilir ve silebilirsin.
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center' },
  groupCard: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
