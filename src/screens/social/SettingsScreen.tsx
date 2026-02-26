import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { storage } from '../../services/storage';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Toggle } from '../../components/ui/Toggle';
import { Button } from '../../components/ui/Button';

const settingsSections = [
  {
    title: 'Hesap',
    items: [
      { icon: 'account', iconBg: 'primary', label: 'Kişisel Bilgiler' },
      { icon: 'lock', iconBg: 'blue', label: 'Şifre ve Güvenlik' },
      { icon: 'credit-card', iconBg: 'purple', label: 'Ödemeler ve Abonelikler' },
    ],
  },
  {
    title: 'Uygulama',
    items: [
      { icon: 'bell', iconBg: 'orange', label: 'Bildirimler', toggle: true },
      { icon: 'weather-night', iconBg: 'zinc', label: 'Karanlık Mod', toggle: true },
      { icon: 'map-marker', iconBg: 'green', label: 'Konum Servisleri', toggle: true },
    ],
  },
  {
    title: 'Destek',
    items: [
      { icon: 'help-circle', iconBg: 'teal', label: 'Yardım Merkezi' },
      { icon: 'information', iconBg: 'yellow', label: 'Hakkımızda' },
    ],
  },
];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, radius, typography } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [location, setLocation] = useState(true);

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
        {settingsSections.map((section) => (
          <View key={section.title} style={{ marginBottom: spacing.xl }}>
            <Text style={[typography.label, { color: '#FFFFFF', marginLeft: spacing.sm, marginBottom: spacing.sm }]}>
              {section.title}
            </Text>
            <View style={{ backgroundColor: '#311831', borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder }}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.row,
                    {
                      padding: spacing.lg,
                      borderBottomWidth: idx < section.items.length - 1 ? 1 : 0,
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: getIconColor(item.iconBg) + '20' }]}>
                    <Icon name={item.icon as any} size={20} color={getIconColor(item.iconBg)} />
                  </View>
                  <Text style={[typography.bodyMedium, { color: '#FFFFFF', flex: 1, marginLeft: spacing.md }]}>{item.label}</Text>
                  {'toggle' in item && item.toggle ? (
                    <Toggle
                      value={item.label === 'Bildirimler' ? notifications : item.label === 'Karanlık Mod' ? darkMode : location}
                      onValueChange={
                        item.label === 'Bildirimler'
                          ? setNotifications
                          : item.label === 'Karanlık Mod'
                          ? setDarkMode
                          : setLocation
                      }
                    />
                  ) : (
                    <Icon name="chevron-right" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Button
          title="Çıkış Yap"
          onPress={async () => {
            await storage.setLoggedIn(false);
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
});
