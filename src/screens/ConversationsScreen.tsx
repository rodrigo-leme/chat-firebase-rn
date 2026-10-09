import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ConversationItem } from '../components/ConversationItem';
import { Banner, EmptyState, ErrorMessage, Loading } from '../components/Feedback';
import { Button } from '../components/Form';
import { colors } from '../components/theme';
import { useAuth } from '../hooks/useAuth';
import { useConnection } from '../hooks/useChat';
import { useConversations } from '../hooks/useGroups';
import { friendlyError } from '../utils/errors';
import type { ConversationListItem } from '../types/chat';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversations'> & {
  notificationStatus: string;
};

export function ConversationsScreen({ navigation, notificationStatus }: Props) {
  const { user, logout } = useAuth();
  const uid = user?.uid ?? '';
  const { items, loading, error } = useConversations(uid);
  const connected = useConnection();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (e) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível sair.'));
      setLoggingOut(false);
    }
  }, [logout]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleLogout} disabled={loggingOut} hitSlop={8}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>{loggingOut ? 'Saindo…' : 'Sair'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, handleLogout, loggingOut]);

  const open = useCallback(
    (item: ConversationListItem) => {
      if (item.kind === 'group') {
        navigation.navigate('Chat', { conversationId: item.group.id, conversationType: 'group' });
      } else {
        navigation.navigate('Chat', { conversationId: item.conversation.id, conversationType: 'direct' });
      }
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      {!connected ? <Banner message="Sem conexão. As mensagens serão sincronizadas ao reconectar." tone="danger" /> : null}
      {notificationStatus === 'denied' ? <Banner message="Notificações desativadas. Ative nas configurações do aparelho." /> : null}
      {notificationStatus === 'no-token' || notificationStatus === 'error' ? (
        <Banner message="Não foi possível registrar este aparelho para notificações." />
      ) : null}
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button title="Nova conversa" onPress={() => navigation.navigate('Users', { mode: 'direct' })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Novo grupo" variant="secondary" onPress={() => navigation.navigate('GroupForm', {})} />
        </View>
      </View>
      <ErrorMessage message={error} />
      {loading ? (
        <Loading label="Carregando conversas…" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => (item.kind === 'group' ? item.group.id : item.conversation.id)}
          renderItem={({ item }) => <ConversationItem item={item} onPress={open} />}
          ListEmptyComponent={<EmptyState title="Nenhuma conversa ainda" subtitle="Inicie uma conversa ou crie um grupo." />}
          contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
});
