import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { supportRequestsService, SupportRequestCategory } from '../../services/api/supportRequests';

const faqs = [
  {
    q: 'Etkinlik nasıl oluştururum?',
    a: 'Etkinlik oluşturmak için ilgili oluşturma ekranında okul, etkinlik türü, dans türü, tarih-saat, konum, katılımcı limiti ve bilet fiyatı bilgilerini doldurup yayınlayabilirsiniz. Etkinlik türünü "Etkinlik" veya uygun yetkiniz varsa "Ders" olarak seçebilirsiniz.',
  },
  {
    q: 'Ders nasıl eklerim?',
    a: 'Ayarlar içinde eğitmen profilinizi oluşturduktan sonra eğitmen alanından ders ekleyebilirsiniz. Ders formunda kapak görseli, başlangıç ve bitiş zamanı, mekan, şehir, dans türleri, seviye, ücret, para birimi ve haftalık program bilgileri girilebilir.',
  },
  {
    q: 'Rezervasyonlarımı ve katıldığım dersleri nereden görürüm?',
    a: 'Ayarlar > Rezervasyonlarım ekranında etkinlik ve ders rezervasyonlarını görüntüleyebilirsiniz. Katıldığınız içerikler uygulamada bu alan üzerinden takip edilir.',
  },
  {
    q: 'Bildirimleri nasıl yönetirim?',
    a: 'Ayarlar ekranındaki "Bildirimler" satırından bildirim tercihlerinizi açıp kapatabilirsiniz. Aynı bölüm uygulama içindeki bildirim ayarlarına hızlı erişim sağlar.',
  },
  {
    q: 'Favorilerimi ve ilgilendiğim dans türlerini nereden düzenlerim?',
    a: 'Ayarlar ekranında "Tercihler" bölümünden ilgilendiğiniz dans türlerini profil üzerinden güncelleyebilir, favori okullarınıza ve favori içeriklerinize ilgili favoriler alanından ulaşabilirsiniz.',
  },
  {
    q: 'Destek talebi nasıl oluştururum?',
    a: 'Bu Yardım Merkezi ekranının üst kısmındaki formu kullanarak kategori seçip açıklamanızı yazmanız yeterli. İsterseniz konu da ekleyebilirsiniz. Gönderdiğiniz talep destek ekibine iletilir.',
  },
];

export const SettingsHelpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography, radius } = useTheme();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<keyof typeof SupportRequestCategory>('technical');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const categories: Array<{ id: keyof typeof SupportRequestCategory; label: string }> = [
    { id: 'account', label: 'Hesap' },
    { id: 'billing', label: 'Ödeme' },
    { id: 'event', label: 'Etkinlik' },
    { id: 'lesson', label: 'Ders' },
    { id: 'technical', label: 'Teknik' },
    { id: 'other', label: 'Diğer' },
  ];

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return faqs;
    return faqs.filter((item) =>
      `${item.q} ${item.a}`.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [query]);

  const submitSupportRequest = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await supportRequestsService.create({
        category,
        subject,
        message,
      });
      setSubject('');
      setMessage('');
      setCategory('technical');
      setSuccessVisible(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Destek talebi oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Header title="Yardım Merkezi" showBack onBackPress={() => navigation.goBack()} />
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSuccessVisible(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.successModal,
              {
                backgroundColor: '#261629',
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: radius.xxl,
                padding: spacing.xl,
              },
            ]}
          >
            <View style={styles.successGlowWrap}>
              <View
                style={[
                  styles.successGlow,
                  {
                    backgroundColor: colors.primaryAlpha10,
                    borderColor: 'rgba(255,255,255,0.08)',
                  },
                ]}
              >
                <View style={[styles.successIconCore, { backgroundColor: colors.primary }]}>
                  <Icon name="check" size={28} color="#FFFFFF" />
                </View>
              </View>
            </View>

            <Text style={[typography.h3, styles.successTitle, { color: '#FFFFFF', marginTop: spacing.lg }]}>
              Talep alındı
            </Text>
            <Text style={[typography.bodySmall, styles.successText, { color: '#B9B2C4', marginTop: spacing.sm }]}>
              Destek talebinizi ilettik.
            </Text>

            <Button
              title="Tamam"
              onPress={() => setSuccessVisible(false)}
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Input
          placeholder="Konu veya anahtar kelime ara..."
          value={query}
          onChangeText={setQuery}
          leftIcon="magnify"
          leftIconWithLabel={false}
          containerStyle={{ marginBottom: spacing.xl }}
          backgroundColor="rgba(255,255,255,0.08)"
          borderColor="rgba(255,255,255,0.12)"
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
        />
        <View
          style={[
            styles.supportCard,
            {
              backgroundColor: '#311831',
              borderRadius: radius.xl,
              borderColor: 'rgba(255,255,255,0.12)',
              padding: spacing.lg,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primaryAlpha10 }]}>
              <Icon name="lifebuoy" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Destek talebi oluştur</Text>
              <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>
                Sorununu birkaç satırla yaz, destek ekibine doğrudan iletelim.
              </Text>
            </View>
          </View>

          <Text style={[typography.label, { color: '#FFFFFF', marginTop: spacing.lg, marginBottom: spacing.sm }]}>
            Kategori
          </Text>
          <View style={styles.chipRow}>
            {categories.map((item) => (
              <View key={item.id} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}>
                <Chip label={item.label} selected={category === item.id} onPress={() => setCategory(item.id)} />
              </View>
            ))}
          </View>

          <Input
            label="Konu (opsiyonel)"
            value={subject}
            onChangeText={setSubject}
            placeholder="Örn. Ders oluştururken hata alıyorum"
            containerStyle={{ marginTop: spacing.sm }}
          />
          <Input
            label="Açıklama"
            value={message}
            onChangeText={setMessage}
            placeholder="Ne yaptığını ve nerede takıldığını yazabilirsin."
            multiline
            containerStyle={{ marginTop: spacing.md }}
          />
          {submitError ? (
            <Text style={[typography.caption, { color: colors.orange, marginTop: spacing.sm }]}>
              {submitError}
            </Text>
          ) : null}
          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Talebi gönder"
              onPress={() => void submitSupportRequest()}
              loading={submitting}
              fullWidth
              icon="send"
            />
          </View>
        </View>
        <Text style={[typography.label, { color: '#FFFFFF', marginBottom: spacing.md }]}>Sık Sorulan Sorular</Text>
        {filteredFaqs.map((item, index) => (
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
        {filteredFaqs.length === 0 ? (
          <View
            style={[
              styles.emptyFaq,
              {
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: radius.lg,
                padding: spacing.lg,
              },
            ]}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Sonuc bulunamadı</Text>
            <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 4 }]}>
              İstersen yukarıdaki formdan doğrudan destek talebi oluşturabilirsin.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  faqItem: { borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  supportCard: { borderWidth: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-start' },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyFaq: { borderWidth: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9,6,16,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    alignItems: 'center',
  },
  successGlowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    textAlign: 'center',
  },
  successText: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
