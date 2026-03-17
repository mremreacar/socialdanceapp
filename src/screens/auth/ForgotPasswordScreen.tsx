import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../theme';
import { AuthStackParamList } from '../../types/navigation';
import { authService } from '../../services/api/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const inputBorderColor = 'rgba(255,255,255,0.25)';

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors, spacing, typography, radius } = useTheme();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorBorderColor = error ? colors.error : inputBorderColor;

  const isEmailValid = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email]);

  const handleSubmit = async () => {
    if (!isEmailValid || loading) return;
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim();
      await authService.requestPasswordReset(normalizedEmail);
      navigation.replace('ForgotPasswordSent', { email: normalizedEmail });
    } catch (e: any) {
      setError(e?.message || 'Şifre yenileme bağlantısı gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Şifremi Unuttum" showBack showMenu={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: '#311831', borderRadius: radius.xl, borderColor: colors.cardBorder, padding: spacing.xl }]}>
            <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center' }]}>
              Şifrenizi yenileyin
            </Text>
            <Text style={[typography.bodySmall, { color: '#E5E7EB', textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 }]}>
              Hesabınızla ilişkili e-posta adresini giriniz. Şifre yenileme bağlantısını e-posta adresinize iletelim.
            </Text>

            <View style={{ marginTop: spacing.xl }}>
              <Input
                placeholder="E-posta Adresi"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="email-outline"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error) setError(null);
                }}
                backgroundColor="transparent"
                borderColor={errorBorderColor}
                height={60}
                style={{ color: '#FFFFFF' }}
              />
            </View>

            {error ? (
              <Text style={[typography.bodySmall, { color: colors.error, marginTop: spacing.md, textAlign: 'center' }]}>
                {error}
              </Text>
            ) : null}

            <Button
              title={loading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
              onPress={handleSubmit}
              fullWidth
              style={{ marginTop: spacing.xl }}
              iconRight="arrow-right"
              disabled={!isEmailValid || loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
  },
});
