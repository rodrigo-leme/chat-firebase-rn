import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { Banner, EmptyState, ErrorMessage, Loading } from '../components/Feedback';
import { colors } from '../components/theme';
import { useCurrentUid } from '../hooks/useAuth';
import { useChat, useConnection } from '../hooks/useChat';
import { useGroup, useProfiles } from '../hooks/useGroups';
import { getDirectConversation } from '../services/chatService';
import { syncGroupMembers } from '../services/apiService';
import { otherParticipant } from '../utils/conversationId';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const { conversationId, conversationType } = route.params;
  const isGroup = conversationType === 'group';
  const uid = useCurrentUid();
  const connected = useConnection();
  const { messages, loading, error, sending, sendError, pushWarning, send } = useChat(conversationId, conversationType, uid);
  const { group } = useGroup(isGroup ? conversationId : undefined);
  const [otherUid, setOtherUid] = useState<string | null>(null);

  useEffect(() => {
    if (isGroup) {
      // Garante que o espelho de integrantes no RTDB esteja atualizado (idempotente).
      syncGroupMembers(conversationId).catch(() => undefined);
      return;
    }
    getDirectConversation(conversationId)
      .then((c) => setOtherUid(c ? otherParticipant(c.participants, uid) : null))
      .catch(() => setOtherUid(null));
  }, [conversationId, isGroup, uid]);

  const memberIds = useMemo(() => (isGroup ? group?.memberIds ?? [] : otherUid ? [otherUid] : []), [isGroup, group, otherUid]);
  const profiles = useProfiles(memberIds);

  const title = isGroup ? group?.name ?? 'Grupo' : (otherUid && profiles[otherUid]?.name) || 'Conversa';
  const photo = isGroup ? group?.photoUrl ?? '' : (otherUid && profiles[otherUid]?.photoUrl) || '';

  const openInfo = useCallback(() => {
    if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
    else if (otherUid) navigation.navigate('Profile', { uid: otherUid });
  }, [isGroup, navigation, conversationId, otherUid]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable style={styles.header} onPress={openInfo} accessibilityLabel="Ver detalhes">
          <Avatar uri={photo} name={title} size={32} isGroup={isGroup} />
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </Pressable>
      ),
    });
  }, [navigation, openInfo, photo, title, isGroup]);

  // Lista invertida: mensagem mais recente embaixo, rolagem natural do chat.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);
  const mentionable = useMemo(
    () => (isGroup ? memberIds.filter((id) => id !== uid).map((id) => profiles[id]).filter((p) => p !== undefined) : []),
    [isGroup, memberIds, uid, profiles],
  );
  const removed = isGroup && group !== null && !group.memberIds.includes(uid);

  if (loading) return <Loading label="Carregando mensagens…" />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {!connected ? <Banner message="Sem conexão." tone="danger" /> : null}
      {pushWarning ? <Banner message="Mensagem enviada, mas a notificação não pôde ser disparada." /> : null}
      <ErrorMessage message={error} />
      <FlatList
        data={inverted}
        inverted={inverted.length > 0}
        keyExtractor={(m) => m.id}
        contentContainerStyle={inverted.length === 0 ? { flexGrow: 1 } : { padding: 12 }}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            isMine={item.senderId === uid}
            authorName={isGroup ? profiles[item.senderId]?.name ?? 'Integrante' : null}
            mentionNames={item.mentionedUserIds.map((id) => profiles[id]?.name ?? 'integrante')}
          />
        )}
        ListEmptyComponent={<EmptyState title="Nenhuma mensagem ainda" subtitle="Envie a primeira mensagem." />}
      />
      <ErrorMessage message={sendError} />
      {removed ? (
        <Banner message="Você não faz mais parte deste grupo." tone="danger" />
      ) : (
        <ChatInput sending={sending} members={mentionable} onSend={send} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 240 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
});
