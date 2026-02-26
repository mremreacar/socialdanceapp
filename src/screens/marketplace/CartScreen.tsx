import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { useCart } from '../../context/CartContext';
import { MainStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { spacing, typography, radius, colors } = useTheme();
  const { items, removeItem } = useCart();
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  const handleConfirmCart = () => {
    setShowThankYouModal(true);
  };

  return (
    <Screen>
      <Header
        title="Sepet"
        showBack
        onBackPress={() => navigation.goBack()}
      />
      {items.length === 0 ? (
        <View style={[styles.empty, { paddingVertical: 80 }]}>
          <Icon name="cart-outline" size={56} color="#9CA3AF" />
          <Text style={[typography.bodyMedium, { color: '#9CA3AF', marginTop: spacing.lg, textAlign: 'center' }]}>
            Sepetiniz boş
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                style={[styles.cartRow, { backgroundColor: '#482347', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }]}
              >
                <Image source={{ uri: item.image }} style={[styles.thumb, { borderRadius: radius.md }]} />
                <View style={{ flex: 1, marginLeft: spacing.md, justifyContent: 'center' }}>
                  <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]} numberOfLines={2}>{item.title}</Text>
                  <Text style={[typography.bodySmallBold, { color: colors.primary, marginTop: 4 }]}>{item.price}</Text>
                  {item.quantity > 1 && (
                    <Text style={[typography.caption, { color: '#9CA3AF', marginTop: 2 }]}>Adet: {item.quantity}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); removeItem(item.id); }} style={styles.removeBtn} hitSlop={12}>
                  <Icon name="delete-outline" size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
          <View style={[styles.bottomBar, { backgroundColor: colors.headerBg, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }]}>
            <Button title="Sepeti Onayla" onPress={handleConfirmCart} fullWidth style={{ borderRadius: 50 }} />
          </View>
        </>
      )}

      <ConfirmModal
        visible={showThankYouModal}
        title="Teşekkürler!"
        message="Ödeme sayfasına yönlendiriliyorsunuz."
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setShowThankYouModal(false)}
        onConfirm={() => setShowThankYouModal(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
  },
  removeBtn: {
    padding: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
});
