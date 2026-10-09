import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback';
import { Button } from '../components/Form';
import { colors } from '../components/theme';
import { useCurrentUid } from '../hooks/useAuth';
import { listPublicProfiles } from '../services/userService';
import { getOrCreateDirectConversation } from '../services/chatService';
import { friendlyError } from '../utils/errors';
import type { PublicProfile } from '../types/user';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

export function UsersScreen({ navigation, route }: Props) {
  const uid = useCurrentUid();
  const params = route.params;
  const pickMode = params.mode === 'pick';
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(params.mode === 'pick' ? params.selectedIds : []);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: pickMode ? 'Selecionar integrantes' : 'Usuários' });
    listPublicProfiles()
      .then(setUsers)
      .catch((e: unknown) => setError(friendlyError(e, 'Não foi possível carregar os usuários.')))
      .finally(() => setLoading(false));
  }, [navigation, pickMode]);

  // Remove o próprio usuário e aplica o filtro de busca.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((u) => u.uid !== uid)
      .filter((u) => !term || u.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, uid, search]);

  const handlePress = useCallback(
    async (profile: PublicProfile) => {
      if (pickMode) {
        setSelected((cur) => (cur.includes(profile.uid) ? cur.filter((id) => id !== profile.uid) : [...cur, profile.uid]));
        return;
      }
      setOpening(true);
      setError(null);
      try {
        const conversationId = await getOrCreateDirectConversation(uid, profile.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (e) {
        setError(friendlyError(e, 'Não foi possível abrir a conversa.'));
        setOpening(false);
      }
    },
    [pickMode, uid, navigation],
  );

  const confirmPick = useCallback(() => {
    const groupId = params.mode === 'pick' ? params.groupId : undefined;
    navigation.popTo('GroupForm', { groupId, pickedIds: selected }, { merge: true });
  }, [navigation, params, selected]);

  if (loading) return <Loading label="Carregando usuários…" />;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nome"
        placeholderTextColor={colors.muted}
      />
      <ErrorMessage message={error} />
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.uid}
        renderItem={({ item }) => (
          <GroupMemberItem
            profile={item}
            selected={pickMode ? selected.includes(item.uid) : undefined}
            disabled={opening}
            onPress={handlePress}
          />
        )}
        ListEmptyComponent={<EmptyState title="Nenhum usuário encontrado" />}
        contentContainerStyle={filtered.length === 0 ? { flexGrow: 1 } : undefined}
      />
      {pickMode ? (
        <View style={{ padding: 12 }}>
          <Button title={`Confirmar (${selected.length})`} onPress={confirmPick} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: {
    margin: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
