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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
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
import { blocksService } from '../../services/api/blocks';
import { ReportUserModal } from '../../components/report/ReportUserModal';
import { ConfirmModal } from '../../components/feedback/ConfirmModal';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatDetail'>;

type MessageItem = {
  id: string;
  text?: string;
  voiceUri?: string;
  durationSeconds?: number;
  isMe: boolean;
  time: string;
};

function rowToItem(row: DmMessageRow, myUserId: string): MessageItem {
  return {
    id: row.id,
    text: row.body?.trim() ? row.body : undefined,
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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [confirmBlockVisible, setConfirmBlockVisible] = useState(false);
  const [blockedInfoVisible, setBlockedInfoVisible] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isPeerBlocked, setIsPeerBlocked] = useState(false);

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
    if (isPeerBlocked) return;
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

  const closeSheet = () => setSheetVisible(false);

  const openReportModal = () => {
    closeSheet();
    setReportModalVisible(true);
  };

  const refreshBlockStatus = useCallback(async () => {
    try {
      const blocked = await blocksService.isUserBlockedByMe(peerId);
      setIsPeerBlocked(blocked);
    } catch {
      setIsPeerBlocked(false);
    }
  }, [peerId]);

  const submitBlockUser = async () => {
    if (isBlocking) return;
    setIsBlocking(true);
    try {
      await blocksService.blockUser(peerId);
      setIsPeerBlocked(true);
      setConfirmBlockVisible(false);
      setBlockedInfoVisible(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kullanıcı engellenemedi.';
      Alert.alert('Hata', msg);
    } finally {
      setIsBlocking(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void refreshBlockStatus();
      return undefined;
    }, [refreshBlockStatus]),
  );

  const sheetActions: SheetAction[] = [
    {
      id: 'profile',
      label: 'Profilini gör',
      icon: 'account-outline',
      onPress: () => {
        closeSheet();
        navigation.navigate('UserProfile', {
          userId: route.params.id,
          name: route.params.name,
          avatar: route.params.avatar,
          ...(conversationId ? { conversationId } : {}),
        });
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
        setConfirmBlockVisible(true);
      },
    },
    {
      id: 'report',
      label: 'Şikayet et',
      icon: 'flag-outline',
      onPress: openReportModal,
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
      <ConfirmModal
        visible={confirmBlockVisible}
        title="Kullanıcıyı engelle"
        message="Bu kullanıcı artık size mesaj gönderemez. İstediğiniz zaman Ayarlar > Engellenen Kişiler bölümünden engeli kaldırabilirsiniz."
        cancelLabel="Vazgeç"
        confirmLabel={isBlocking ? 'Engelleniyor...' : 'Engelle'}
        onCancel={() => {
          if (!isBlocking) setConfirmBlockVisible(false);
        }}
        onConfirm={() => {
          void submitBlockUser();
        }}
      />
      <ConfirmModal
        visible={blockedInfoVisible}
        title="Kullanıcı engellendi"
        message="Bu kullanıcı artık size mesaj gönderemez. Sohbetten çıkıp güvenle devam edebilirsiniz."
        singleButton
        confirmLabel="Tamam"
        onCancel={() => setBlockedInfoVisible(false)}
        onConfirm={() => {
          setBlockedInfoVisible(false);
          navigation.goBack();
        }}
      />
      <ReportUserModal
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
        reportedProfileId={peerId}
        conversationId={conversationId}
      />
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
            {item.voiceUri ? (
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

        {isPeerBlocked ? (
          <View
            style={[
              styles.blockedNoteWrap,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.borderLight,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
              },
            ]}
          >
            <View
              style={[
                styles.blockedNoteCard,
                {
                  borderRadius: radius.lg,
                  borderColor: 'rgba(248,113,113,0.4)',
                  backgroundColor: 'rgba(248,113,113,0.1)',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <Icon name="block-helper" size={16} color="#FCA5A5" />
              <Text style={[typography.captionBold, { color: '#FCA5A5', marginLeft: spacing.sm, flex: 1 }]}>
                Bu kişiyi engellediniz. Engeli kaldırmadan mesaj gönderemezsiniz.
              </Text>
            </View>
          </View>
        ) : (
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
            <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
              <Icon name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = {
  absoluteFill: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bubble: {},
  blockedNoteWrap: { borderTopWidth: 1 },
  blockedNoteCard: { flexDirection: 'row' as const, alignItems: 'center' as const, borderWidth: 1 },
  inputRow: { flexDirection: 'row' as const, alignItems: 'center' as const, borderTopWidth: 1 },
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
