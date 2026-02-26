import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const SettingsPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const { spacing, typography } = useTheme();

  return (
    <Screen>
      <Header title="Şifre ve Güvenlik" showBack onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={[typography.body, { color: '#9CA3AF', marginBottom: spacing.lg }]}>
          Hesap güvenliğinizi korumak için şifrenizi periyodik olarak güncellemenizi öneririz.
        </Text>
        <Input
          label="Mevcut şifre"
          placeholder=""
          leftIcon="lock"
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          secureTextEntry
        />
        <Input
          label="Yeni şifre"
          placeholder=""
          leftIcon="key"
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          containerStyle={{ marginTop: spacing.lg }}
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          secureTextEntry
        />
        <Input
          label="Yeni şifre (tekrar)"
          placeholder=""
          leftIcon="key"
          leftIconWithLabel
          labelColor="#9CA3AF"
          backgroundColor="transparent"
          borderColor="rgba(255,255,255,0.12)"
          containerStyle={{ marginTop: spacing.lg }}
          style={{ color: '#FFFFFF' }}
          placeholderTextColor="#6B7280"
          secureTextEntry
        />
        <Button title="Şifreyi Güncelle" onPress={() => navigation.goBack()} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
        <View style={{ marginTop: spacing.xl, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
          <Text style={[typography.caption, { color: '#9CA3AF' }]}>
            İki adımlı doğrulama (2FA) yakında eklenecek. Hesabınızı ekstra bir güvenlik katmanıyla koruyabileceksiniz.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({});
