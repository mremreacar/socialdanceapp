import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';

const faqs = [
  { q: 'Etkinlik nasıl oluştururum?', a: 'Profil sekmesinden "Etkinlik Oluştur"a tıklayın. Tarih, konum, dans türü ve diğer bilgileri doldurup yayınlayın.' },
  { q: 'Bildirimleri nasıl kapatırım?', a: 'Ayarlar > Uygulama > Bildirimler bölümünden bildirimleri açıp kapatabilirsiniz.' },
  { q: 'Hesabımı nasıl silerim?', a: 'Ayarlar > Kişisel Bilgiler sayfasından "Hesabı Sil" seçeneğine gidebilirsiniz. Bu işlem geri alınamaz.' },
  { q: 'Ödeme güvenli mi?', a: 'Tüm ödemeler şifreli kanallar üzerinden işlenir. Kart bilgileriniz saklanmaz.' },
];

export const SettingsHelpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Screen>
      <Header title="Yardım Merkezi" showBack onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Input
          placeholder="Konu veya anahtar kelime ara..."
          leftIcon="magnify"
          leftIconWithLabel={false}
          containerStyle={{ marginBottom: spacing.xl }}
          backgroundColor="rgba(255,255,255,0.08)"
          borderColor="rgba(255,255,255,0.12)"
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
        />
        <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.md }]}>Sık Sorulan Sorular</Text>
        {faqs.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setExpanded(expanded === index ? null : index)}
            style={[styles.faqItem, { backgroundColor: '#311831', borderRadius: radius.lg, borderColor: 'rgba(255,255,255,0.12)', marginBottom: spacing.sm }]}
            activeOpacity={0.8}
          >
            <View style={[styles.row, { padding: spacing.lg }]}>
              <Text style={[typography.body, { color: '#FFFFFF', flex: 1 }]}>{item.q}</Text>
              <Icon name={expanded === index ? 'chevron-up' : 'chevron-down'} size={20} color="#9CA3AF" />
            </View>
            {expanded === index && (
              <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
                <Text style={[typography.caption, { color: '#9CA3AF', lineHeight: 20 }]}>{item.a}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={[styles.contactCard, { backgroundColor: colors.primaryAlpha10, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg }]}>
          <Icon name="email-outline" size={24} color={colors.primary} />
          <Text style={[typography.body, { color: '#FFFFFF', marginTop: spacing.sm }]}>Sorunuz mu var?</Text>
          <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>destek@socialdance.app</Text>
          <TouchableOpacity style={{ marginTop: spacing.sm }} hitSlop={12}>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>E-posta Gönder</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  faqItem: { borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  contactCard: { alignItems: 'center' },
});
