import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Toggle } from '../../components/ui/Toggle';
import { Button } from '../../components/ui/Button';
import { MainStackParamList } from '../../types/navigation';
import { useProfile } from '../../context/ProfileContext';
import { cancelAllScheduledLocalNotifications } from '../../services/notifications';
import { authService } from '../../services/api/auth';
import { instructorProfileService } from '../../services/api/instructorProfile';
import { useDanceCatalog } from '../../hooks/useDanceCatalog';
import type { InstructorProfileModel } from '../../services/api/instructorProfile';

type SettingsItem = {
  icon: string;
  iconBg: string;
  label: string;
  value?: string;
  toggle?: boolean;
  screen?: keyof MainStackParamList;
};

const settingsSections: { title: string; items: SettingsItem[] }[] = [
  {
    title: 'Hesap',
    items: [
      { icon: 'account', iconBg: 'primary', label: 'Kişisel Bilgiler', screen: 'EditProfile' },
      { icon: 'lock', iconBg: 'blue', label: 'Şifre ve Güvenlik', screen: 'SettingsPassword' },
      { icon: 'block-helper', iconBg: 'orange', label: 'Engellenen Kişiler', screen: 'BlockedUsers' },
    ],
  },
  {
    title: 'Uygulama',
    items: [
      { icon: 'bell', iconBg: 'orange', label: 'Bildirimler', toggle: true, screen: 'Notifications' },
      { icon: 'map-marker', iconBg: 'green', label: 'Konum Servisleri', toggle: true },
    ],
  },
  {
    title: 'Destek',
    items: [
      { icon: 'help-circle', iconBg: 'teal', label: 'Yardım Merkezi', screen: 'SettingsHelp' },
      { icon: 'information', iconBg: 'yellow', label: 'Hakkımızda', screen: 'SettingsAbout' },
    ],
  },
];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography } = useTheme();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const [location, setLocation] = useState(true);
  const [instructorProfile, setInstructorProfile] = useState<InstructorProfileModel | null | undefined>(undefined);

  const { resolveFull } = useDanceCatalog();
  const favoriteDancesValue = useMemo(() => {
    const labels = resolveFull(profile.favoriteDances ?? []);
    return labels.length ? labels.join(', ') : '';
  }, [resolveFull, profile.favoriteDances]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const row = await instructorProfileService.getMine();
          if (!cancelled) setInstructorProfile(row ?? null);
        } catch {
          if (!cancelled) setInstructorProfile(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const getIconColor = (bg: string) => {
    if (bg === 'primary') return colors.primary;
    if (bg === 'blue') return colors.info;
    if (bg === 'purple') return colors.purple;
    if (bg === 'orange') return colors.orange;
    if (bg === 'green') return colors.success;
    if (bg === 'teal') return colors.teal;
    if (bg === 'yellow') return colors.yellow;
    return colors.textTertiary;
  };

  return (
    <Screen>
      <Header title="Ayarlar" showBack />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.label, { color: '#FFFFFF', marginLeft: spacing.sm, marginBottom: spacing.sm }]}>
            Tercihler
          </Text>
          <View style={{ backgroundColor: '#311831', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.cardBorder }}>
            <View
              style={[
                styles.row,
                {
                  paddingVertical: spacing.lg,
                  paddingLeft: spacing.xl,
                  paddingRight: spacing.xl + 40,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('EditProfile')}
              >
                <View style={[styles.iconWrap, { backgroundColor: getIconColor('primary') + '20' }]}>
                  <Icon name="music" size={20} color={getIconColor('primary')} />
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Favori Danslar</Text>
                  {favoriteDancesValue ? (
                    <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]} numberOfLines={1}>
                      {favoriteDancesValue}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => (navigation as any).navigate('EditProfile')} hitSlop={8} style={styles.rightControl}>
                <Icon name="chevron-right" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: colors.borderLight, marginLeft: spacing.xl }} />
            <View
              style={[
                styles.row,
                {
                  paddingVertical: spacing.lg,
                  paddingLeft: spacing.xl,
                  paddingRight: spacing.xl + 40,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('FavoriteSchools')}
              >
                <View style={[styles.iconWrap, { backgroundColor: getIconColor('purple') + '20' }]}>
                  <Icon name="heart" size={20} color={getIconColor('purple')} />
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>Favoriler</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => (navigation as any).navigate('FavoriteSchools')}
                hitSlop={8}
                style={styles.rightControl}
              >
                <Icon name="chevron-right" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {settingsSections.map((section, sectionIdx) => (
          <View key={section.title} style={{ marginBottom: spacing.xl }}>
            <Text style={[typography.label, { color: '#FFFFFF', marginLeft: spacing.sm, marginBottom: spacing.sm }]}>
              {section.title}
            </Text>
            <View style={{ backgroundColor: '#311831', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.cardBorder }}>
              {sectionIdx === 0 ? (
                <>
                  <View
                    style={[
                      styles.row,
                      {
                        paddingVertical: spacing.lg,
                        paddingLeft: spacing.xl,
                        paddingRight: spacing.xl + 40,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.row}
                      activeOpacity={0.7}
                      onPress={() => (navigation as any).navigate('InstructorOnboarding')}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: getIconColor('green') + '20' }]}>
                        <Icon name="school" size={20} color={getIconColor('green')} />
                      </View>
                      <View style={{ marginLeft: spacing.md, flex: 1 }}>
                        <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]} numberOfLines={2}>
                          {instructorProfile
                            ? instructorProfile.headline?.trim()
                              ? instructorProfile.headline.trim()
                              : 'Eğitmen profilim'
                            : 'Eğitmen ol'}
                        </Text>
                        {instructorProfile ? (
                          instructorProfile.headline?.trim() ? (
                            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]} numberOfLines={1}>
                              Eğitmen profili · Düzenlemek için dokunun
                            </Text>
                          ) : (
                            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]} numberOfLines={2}>
                              Keşfette görünen kısa başlığı ekleyin
                            </Text>
                          )
                        ) : instructorProfile === null ? (
                          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]} numberOfLines={2}>
                            Ders vermek için profil oluşturun
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => (navigation as any).navigate('InstructorOnboarding')}
                      hitSlop={8}
                      style={styles.rightControl}
                    >
                      <Icon name="chevron-right" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 1, backgroundColor: colors.borderLight, marginLeft: spacing.xl }} />
                </>
              ) : null}
              {section.items.map((item, idx) => {
                const hasToggle = 'toggle' in item && item.toggle;
                const hasScreen = 'screen' in item && item.screen;
                const onPressRow = hasScreen ? () => (navigation as any).navigate(item.screen) : undefined;
                const isLastInCard = idx === section.items.length - 1;
                return (
                  <View
                    key={item.label}
                    style={[
                      styles.row,
                      {
                        paddingVertical: spacing.lg,
                        paddingLeft: spacing.xl,
                        paddingRight: spacing.xl + 40,
                        borderBottomWidth: isLastInCard ? 0 : 1,
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.row}
                      activeOpacity={0.7}
                      onPress={onPressRow}
                      disabled={!onPressRow}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: getIconColor(item.iconBg) + '20' }]}>
                        <Icon name={item.icon as any} size={20} color={getIconColor(item.iconBg)} />
                      </View>
                      <View style={{ marginLeft: spacing.md, flex: 1 }}>
                        <Text style={[typography.bodyMedium, { color: '#FFFFFF' }]}>{item.label}</Text>
                        {item.value ? (
                          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]} numberOfLines={1}>
                            {item.value}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                    {hasToggle ? (
                      <View style={styles.rightControl}>
                        <Toggle
                          value={item.label === 'Bildirimler' ? profile.notificationsEnabled : location}
                          onValueChange={
                            item.label === 'Bildirimler'
                              ? (v) => {
                                  void (async () => {
                                    try {
                                      await updateProfile({ notificationsEnabled: v });
                                      if (!v) await cancelAllScheduledLocalNotifications();
                                    } catch {
                                      void refreshProfile();
                                    }
                                  })();
                                }
                              : setLocation
                          }
                        />
                      </View>
                    ) : (
                      <TouchableOpacity onPress={onPressRow} hitSlop={8} style={styles.rightControl}>
                        <Icon name="chevron-right" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <Button
          title="Çıkış Yap"
          onPress={async () => {
            await authService.logout();
            (navigation.getParent() as any)?.getParent()?.reset({ index: 0, routes: [{ name: 'Auth' }] });
          }}
          variant="danger"
          fullWidth
          icon="logout"
        />
        <Text style={[typography.caption, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.lg }]}>
          Socialdance v1.0.2 (Build 2024)
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rightControl: { width: 44, alignItems: 'flex-end', justifyContent: 'center' },
});
