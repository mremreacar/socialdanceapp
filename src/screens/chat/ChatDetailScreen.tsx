import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { MainStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MainStackParamList, 'ChatDetail'>;

const mockMessages = [
  { id: '1', text: 'Merhaba! Yarın etkinlikte görüşürüz.', isMe: false, time: '14:30' },
  { id: '2', text: 'Merhaba! Evet, orada olacağım 💃', isMe: true, time: '14:32' },
];

export const ChatDetailScreen: React.FC<Props> = ({ route }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), text: input.trim(), isMe: true, time: 'Şimdi' }]);
    setInput('');
  };

  return (
    <Screen>
      <Header
        title={route.params.name}
        showBack
        rightIcon="phone"
        onRightPress={() => {}}
      />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.sm }}
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
              },
            ]}
          >
            <Text style={[typography.bodySmall, { color: item.isMe ? '#FFF' : colors.text }]}>{item.text}</Text>
            <Text style={[typography.label, { color: item.isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginTop: 4 }]}>{item.time}</Text>
          </View>
        )}
      />

      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.borderLight, padding: spacing.md }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Mesaj yaz..."
          placeholderTextColor={colors.inputPlaceholder}
          style={[styles.input, { backgroundColor: colors.inputBg, borderRadius: radius.full, color: colors.text }]}
        />
        <TouchableOpacity onPress={send} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
          <Icon name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  bubble: {},
  inputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
