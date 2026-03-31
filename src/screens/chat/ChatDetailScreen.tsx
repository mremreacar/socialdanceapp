import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useChats } from '../../context/ChatContext';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { MainStackParamList } from '../../types/navigation';
import { hasSupabaseConfig } from '../../services/api/apiClient';
import { messageService, formatMessageTime, type DmMessageRow } from '../../services/api/messages';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatDetail'>;

type MessageItem = {
  id: string;
  text?: string;
  imageUri?: string;
  voiceUri?: string;
  durationSeconds?: number;
  isMe: boolean;
  time: string;
};

function rowToItem(row: DmMessageRow, myUserId: string): MessageItem {
  return {
    id: row.id,
    text: row.body?.trim() ? row.body : undefined,
    imageUri: row.image_url ?? undefined,
    isMe: row.sender_id === myUserId,
    time: formatMessageTime(row.created_at),
  };
}

type SheetAction = { id: string; label: string; icon: string; onPress: () => void };

export const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const { markAsRead, refreshChats } = useChats();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const routeConversationId = route.params.conversationId ?? null;
  const [conversationId, setConversationId] = useState<string | null>(routeConversationId);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [listRefreshing, setListRefreshing] = useState(false);
  const listRef = useRef<FlatList<MessageItem>>(null);

  const peerId = route.params.id;

  const loadMessages = useCallback(
    async (cid: string, myId: string) => {
      const rows = await messageService.listMessages(cid);
      setMessages(rows.map((r) => rowToItem(r, myId)));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!hasSupabaseConfig()) {
        setInitError('Supabase yapılandırması eksik.');
        setInitLoading(false);
        return;
      }

      try {
        const me = await messageService.getCurrentUserId();
        if (cancelled) return;
        setMyUserId(me);

        let cid = routeConversationId;
        if (!cid) {
          cid = await messageService.getOrCreateConversation(peerId);
          if (cancelled) return;
          setConversationId(cid);
        } else {
          setConversationId(cid);
        }

        await loadMessages(cid, me);
        if (cancelled) return;

        await markAsRead(cid);
        void refreshChats();
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Sohbet açılamadı.';
          setInitError(msg);
        }
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [peerId, routeConversationId, loadMessages, markAsRead, refreshChats]);

  useFocusEffect(
    useCallback(() => {
      if (!conversationId || !myUserId) return undefined;
      const tick = () => {
        void loadMessages(conversationId, myUserId).catch(() => {});
      };
      tick();
      const id = setInterval(tick, 3500);
      return () => clearInterval(id);
    }, [conversationId, myUserId, loadMessages]),
  );

  const onPullRefresh = useCallback(async () => {
    if (!conversationId || !myUserId) return;
    setListRefreshing(true);
    try {
      await loadMessages(conversationId, myUserId);
      void refreshChats();
    } catch {
      /* sessiz */
    } finally {
      setListRefreshing(false);
    }
  }, [conversationId, myUserId, loadMessages, refreshChats]);

  const send = async () => {
    if (!input.trim() || !conversationId) return;
    try {
      const row = await messageService.sendTextMessage(conversationId, input.trim());
      if (myUserId) {
        setMessages((prev) => [...prev, rowToItem(row, myUserId)]);
      }
      setInput('');
      void refreshChats();
      listRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Mesaj gönderilemedi.';
      Alert.alert('Hata', msg);
    }
  };

  const pickImage = async () => {
    if (!conversationId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeriye erişim için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      for (const asset of result.assets) {
        try {
          const row = await messageService.sendImageMessage(conversationId, asset.uri);
          if (myUserId) {
            setMessages((prev) => [...prev, rowToItem(row, myUserId)]);
          }
          void refreshChats();
          listRef.current?.scrollToEnd({ animated: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Fotoğraf gönderilemedi.';
          Alert.alert('Hata', msg);
        }
      }
    }
  };

  const closeSheet = () => setSheetVisible(false);

  const sheetActions: SheetAction[] = [
    {
      id: 'profile',
      label: 'Profilini gör',
      icon: 'account-outline',
      onPress: () => {
        closeSheet();
        navigation.navigate('UserProfile', { userId: route.params.id, name: route.params.name, avatar: route.params.avatar });
      },
    },
    {
      id: 'notifications',
      label: notificationsMuted ? 'Bildirimleri aç' : 'Bildirimleri kapat',
      icon: notificationsMuted ? 'bell-outline' : 'bell-off-outline',
      onPress: () => {
        setNotificationsMuted((v) => !v);
        closeSheet();
      },
    },
    {
      id: 'delete',
      label: 'Sohbeti sil',
      icon: 'delete-outline',
      onPress: () => {
        closeSheet();
        Alert.alert('Sohbeti sil', 'Bu sohbet silinecek. Emin misiniz?', [
          { text: 'İptal', style: 'cancel' },
          { text: 'Sil', style: 'destructive', onPress: () => navigation.goBack() },
        ]);
      },
    },
    {
      id: 'block',
      label: 'Engelle',
      icon: 'block-helper',
      onPress: () => {
        closeSheet();
        Alert.alert('Kullanıcı engellendi', 'Bu kullanıcıdan artık mesaj alamayacaksınız.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
      },
    },
    {
      id: 'report',
      label: 'Şikayet et',
      icon: 'flag-outline',
      onPress: () => {
        closeSheet();
        Alert.alert('Şikayet gönderildi', 'İncelenecek ve gerekirse işlem yapılacaktır.', [{ text: 'Tamam' }]);
      },
    },
  ];

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (initLoading) {
    return (
      <Screen>
        <Header title={route.params.name} titleColor="#FFFFFF" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (initError) {
    return (
      <Screen>
        <Header title={route.params.name} titleColor="#FFFFFF" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg }}>
          <Text style={[typography.body, { color: '#FFFFFF', textAlign: 'center' }]}>{initError}</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full }}
            activeOpacity={0.85}
          >
            <Text style={[typography.bodySmallBold, { color: '#FFFFFF' }]}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.absoluteFill} activeOpacity={1} onPress={closeSheet} />
          <View style={[styles.sheetBox, { backgroundColor: colors.headerBg ?? '#2C1C2D', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.textTertiary }]} />
          <View style={[styles.sheetHeader, { marginBottom: spacing.lg }]}>
            <Avatar source={route.params.avatar} size="xl" showBorder />
            <Text style={[typography.h4, { color: '#FFFFFF', marginTop: spacing.md }]}>{route.params.name}</Text>
          </View>
          {sheetActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              onPress={action.onPress}
              style={[styles.sheetRow, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}
              activeOpacity={0.7}
            >
              <Icon name={action.icon as any} size={22} color="#9CA3AF" />
              <Text style={[typography.body, { color: '#FFFFFF', marginLeft: spacing.md }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
          </View>
        </View>
      </Modal>
      <Header
        title={route.params.name}
        titleColor="#FFFFFF"
        showBack
        onTitlePress={() => setSheetVisible(true)}
        rightIcon="phone"
        onRightPress={() => {}}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.sm, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical
          overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={() => void onPullRefresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              {
                alignSelf: item.isMe ? 'flex-end' : 'flex-start',
                backgroundColor: item.isMe ? colors.primary : colors.surfaceSecondary,
                borderRadius: radius.xl,
                padding: spacing.md,
                maxWidth: '80%',
                marginBottom: spacing.xl,
              },
            ]}
          >
            {item.imageUri ? (
              <>
                <Image source={{ uri: item.imageUri }} style={styles.messageImage} resizeMode="cover" />
                <Text style={[typography.label, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginTop: 4 }]}>{item.time}</Text>
              </>
            ) : item.voiceUri ? (
              <>
                <Text style={[typography.bodySmall, { color: item.isMe ? '#FFF' : colors.text }]}>🎤 Sesli mesaj {formatDuration(item.durationSeconds ?? 0)}</Text>
                <Text style={[typography.label, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginTop: 4 }]}>{item.time}</Text>
              </>
            ) : (
              <>
                <Text style={[typography.bodySmall, { color: item.isMe ? '#FFF' : colors.text }]}>{item.text}</Text>
                <Text style={[typography.label, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginTop: 4 }]}>{item.time}</Text>
              </>
            )}
          </View>
        )}
        />

        <View style={[styles.inputRow, { backgroundColor: colors.background, borderTopColor: colors.borderLight, padding: spacing.md }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yaz..."
            placeholderTextColor={colors.inputPlaceholder}
            style={[styles.input, { backgroundColor: '#482347', borderRadius: radius.full, color: '#FFF' }]}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity onPress={pickImage} style={[styles.galleryBtn, { marginLeft: spacing.sm }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="image-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
            <Icon name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const IMAGE_SIZE = 200;

const styles = {
  absoluteFill: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bubble: {},
  messageImage: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 12 },
  inputRow: { flexDirection: 'row' as const, alignItems: 'center' as const, borderTopWidth: 1 },
  galleryBtn: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, marginLeft: 8 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  sheetBox: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center' as const,
    marginBottom: 20,
  },
  sheetHeader: {
    alignItems: 'center' as const,
  },
  sheetRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
};
