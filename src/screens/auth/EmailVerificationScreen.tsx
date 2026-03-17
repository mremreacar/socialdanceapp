import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useTheme } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailVerification'>;

const steps = [
  'Gelen kutunuzu ve varsa spam klasörünüzü kontrol edin.',
  'Doğrulama bağlantısına tıkladıktan sonra giriş ekranından devam edin.',
  'E-posta birkaç dakika içinde ulaşmazsa yeniden kayıt olmayı deneyin.',
] as const;

export const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors, radius, spacing, typography } = useTheme();
  const { email } = route.params;

  return (
    <Screen>
      <Header title="E-posta Doğrulama" showBack={false} showMenu={false} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { padding: spacing.lg, backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: '#311831', borderRadius: radius.xl, borderColor: colors.cardBorder, padding: spacing.xl }]}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <Icon name="email-check-outline" size={34} color={colors.primary} />
          </View>

          <Text style={[typography.h2, styles.title, { color: '#FFFFFF', marginTop: spacing.lg }]}>
            Son bir adım kaldı
          </Text>

          <Text style={[typography.body, styles.description, { color: '#E5E7EB', marginTop: spacing.sm }]}>
            Hesabınızı güvenle etkinleştirebilmemiz için doğrulama e-postası gönderdik.
          </Text>

          <View style={[styles.emailBox, { borderRadius: radius.lg, borderColor: 'rgba(255,255,255,0.12)', marginTop: spacing.lg, padding: spacing.lg }]}>
            <Text style={[typography.label, { color: '#9CA3AF', marginBottom: spacing.xs }]}>
              Doğrulama gönderilen adres
            </Text>
            <Text style={[typography.bodyBold, { color: '#FFFFFF', textAlign: 'center' }]}>
              {email}
            </Text>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            {steps.map((step, index) => (
              <View key={step} style={[styles.stepRow, index > 0 && { marginTop: spacing.md }]}>
                <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>{index + 1}</Text>
                </View>
                <Text style={[typography.bodySmall, styles.stepText, { color: '#E5E7EB', marginLeft: spacing.md }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Button
            title="Giriş Ekranına Dön"
            onPress={() => navigation.replace('EmailLogin')}
            fullWidth
            iconRight="arrow-right"
          />
          <Button
            title="Kayıt Sayfasına Dön"
            onPress={() => navigation.replace('SignUp')}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  emailBox: {
    borderWidth: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    lineHeight: 20,
  },
});
