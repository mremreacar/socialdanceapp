import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';

export const SettingsAboutScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();

  const openLink = (url: string) => () => Linking.openURL(url).catch(() => {});

  return (
    <Screen>
      <Header title="Hakkımızda" showBack onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
          <View style={[styles.logoWrap, { backgroundColor: colors.primaryAlpha20 }]}>
            <Icon name="music" size={48} color={colors.primary} />
          </View>
          <Text style={[typography.h3, { color: '#FFFFFF', marginTop: spacing.md }]}>Socialdance</Text>
          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>Versiyon 1.0.2 (Build 2024)</Text>
        </View>
        <Text style={[typography.body, { color: '#9CA3AF', textAlign: 'center', marginBottom: spacing.xl }]}>
          Dans tutkunları için etkinlik keşfi, ders takvimi ve topluluk uygulaması. Çevrenizdeki salsa, bachata, tango ve daha fazlasına tek yerden ulaşın.
        </Text>
        <View style={[styles.card, { backgroundColor: '#311831', borderRadius: radius.xl, borderColor: 'rgba(255,255,255,0.12)' }]}>
          <TouchableOpacity style={[styles.row, styles.linkRow]} onPress={openLink('https://socialdance.app/terms')} activeOpacity={0.7}>
            <Icon name="file-document-outline" size={20} color="#9CA3AF" />
            <Text style={[typography.body, { color: '#FFFFFF', flex: 1, marginLeft: spacing.md }]}>Kullanım Koşulları</Text>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={[styles.divider]} />
          <TouchableOpacity style={[styles.row, styles.linkRow]} onPress={openLink('https://socialdance.app/privacy')} activeOpacity={0.7}>
            <Icon name="shield-check-outline" size={20} color="#9CA3AF" />
            <Text style={[typography.body, { color: '#FFFFFF', flex: 1, marginLeft: spacing.md }]}>Gizlilik Politikası</Text>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={[styles.divider]} />
          <TouchableOpacity style={[styles.row, styles.linkRow]} onPress={openLink('https://socialdance.app/licenses')} activeOpacity={0.7}>
            <Icon name="code-tags" size={20} color="#9CA3AF" />
            <Text style={[typography.body, { color: '#FFFFFF', flex: 1, marginLeft: spacing.md }]}>Lisanslar</Text>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <Text style={[typography.caption, { color: '#6B7280', textAlign: 'center', marginTop: spacing.xxl }]}>
          © 2024 Socialdance. Tüm hakları saklıdır.
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  logoWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  linkRow: { padding: 16 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 52 },
});
