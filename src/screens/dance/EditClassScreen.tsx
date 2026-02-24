import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const EditClassScreen: React.FC = () => {
  const navigation = useNavigation();
  const { spacing } = useTheme();

  return (
    <Screen>
      <Header title="Ders Oluştur" showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Input label="Ders adı" placeholder="Örn: Başlangıç Salsa" />
        <Input label="Eğitmen" placeholder="Ad Soyad" containerStyle={{ marginTop: spacing.lg }} />
        <Input label="Gün" placeholder="Pazartesi" containerStyle={{ marginTop: spacing.lg }} />
        <Input label="Saat" placeholder="19:00" containerStyle={{ marginTop: spacing.lg }} />
        <Input label="Seviye" placeholder="Başlangıç / Orta / İleri" containerStyle={{ marginTop: spacing.lg }} />
        <Button title="Kaydet" onPress={() => navigation.goBack()} fullWidth size="lg" style={{ marginTop: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({});
