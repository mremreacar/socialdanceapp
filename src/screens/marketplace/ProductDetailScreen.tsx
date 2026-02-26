import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';
import { useCart } from '../../context/CartContext';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ProductDetail'>;

const seller = {
  id: 'seller-1',
  name: 'Satıcı',
  avatar: 'https://i.pravatar.cc/150?u=seller',
};

const defaultProduct = {
  id: '1',
  title: 'Salsa Ayakkabısı',
  price: '₺450',
  image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
};

export const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const { addItem } = useCart();
  const [addedModalVisible, setAddedModalVisible] = useState(false);

  const productName = defaultProduct.title;

  const handleAddToCart = () => {
    addItem({
      id: defaultProduct.id,
      title: defaultProduct.title,
      price: defaultProduct.price,
      image: defaultProduct.image,
    });
    setAddedModalVisible(true);
  };

  const openChatWithSeller = () => {
    navigation.navigate('ChatDetail', {
      id: seller.id,
      name: seller.name,
      avatar: seller.avatar,
      isNewChat: true,
    });
  };

  return (
    <Screen>
      <ConfirmModal
        visible={addedModalVisible}
        title="Sepetinize eklendi"
        message="Ürün sepetinize eklendi. Drawer menüsünden Sepet sayfasına giderek görüntüleyebilirsiniz."
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setAddedModalVisible(false)}
        onConfirm={() => setAddedModalVisible(false)}
      />
      <Header title="Marketplace" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400' }}
          style={[styles.image, { backgroundColor: colors.surfaceSecondary }]}
        />
        <View style={{ padding: spacing.lg }}>
          <Text style={[typography.h3, { color: '#FFFFFF' }]}>{productName}</Text>
          <Text style={[typography.h4, { color: colors.primary, marginTop: spacing.sm }]}>₺450</Text>

          <View style={[styles.sellerRow, { marginTop: spacing.xl, padding: spacing.md, backgroundColor: '#482347', borderRadius: radius.lg }]}>
            <Avatar source="https://i.pravatar.cc/150?u=seller" size="md" />
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Satıcı</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>⭐ 4.8</Text>
            </View>
            <TouchableOpacity
            onPress={openChatWithSeller}
            style={[styles.mesajBtn, { borderColor: '#9CA3AF', borderRadius: radius.full }]}
            activeOpacity={0.7}
          >
            <Text style={[typography.captionBold, { color: '#9CA3AF' }]}>Mesaj</Text>
          </TouchableOpacity>
          </View>

          <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xl }]}>
            Profesyonel salsa ayakkabısı, az kullanılmış. Numara 38.
          </Text>
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.borderLight, padding: spacing.lg }]}>
        <Button title="Sepete Ekle" onPress={handleAddToCart} fullWidth />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  mesajBtn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
});
