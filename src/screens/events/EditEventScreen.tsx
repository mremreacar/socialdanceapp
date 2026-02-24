import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icon } from '../../components/ui/Icon';
import { Card } from '../../components/ui/Card';

export const EditEventScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, spacing, typography } = useTheme();

  return (
    <Screen>
      <Header
        title="Etkinlik Oluştur"
        showBack
        rightIcon="check"
        onRightPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Input label="Etkinlik adı" placeholder="Örn: Salsa Gecesi" />
        <Input label="Tarih" placeholder="Tarih seçin" leftIcon="calendar" containerStyle={{ marginTop: spacing.lg }} />
        <Input label="Konum" placeholder="Mekan veya adres" leftIcon="map-marker" containerStyle={{ marginTop: spacing.lg }} />
        <Input label="Fiyat (₺)" placeholder="0" leftIcon="cash" containerStyle={{ marginTop: spacing.lg }} />
        <Input label="Kapasite" placeholder="Kişi sayısı" leftIcon="account-group" containerStyle={{ marginTop: spacing.lg }} />
        <Button title="Yayınla" onPress={() => navigation.goBack()} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({});
