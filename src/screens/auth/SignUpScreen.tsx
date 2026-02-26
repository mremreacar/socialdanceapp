import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();

  const handleSignUp = () => {
    navigation.replace('Onboarding');
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderRadius: radius.full }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrow-left" size={24} color={colors.icon} />
          </TouchableOpacity>

          <View style={styles.formSection}>
            <Text style={[typography.h1, { color: colors.text }]}>Kayıt Ol</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              Hesabını oluştur ve dans dünyasına katıl.
            </Text>

            <View style={[styles.form, { marginTop: spacing.xxl }]}>
              <Input placeholder="Ad" />
              <Input placeholder="E-posta Adresi" keyboardType="email-address" autoCapitalize="none" containerStyle={{ marginTop: spacing.md }} />
              <Input placeholder="Şifre" secureTextEntry containerStyle={{ marginTop: spacing.md }} />
              <Input placeholder="Şifre Tekrar" secureTextEntry containerStyle={{ marginTop: spacing.md }} />
              <Button title="Kayıt Ol" onPress={handleSignUp} fullWidth style={{ marginTop: spacing.xl }} />
            </View>

            <View style={styles.loginRow}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Zaten hesabın var mı? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[typography.captionBold, { color: colors.primary }]}>Giriş Yap</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 56,
    paddingBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  formSection: {
    flex: 1,
  },
  form: {
    width: '100%',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
