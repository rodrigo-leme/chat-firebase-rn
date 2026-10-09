import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ErrorMessage, Loading } from '../components/Feedback';
import { Button } from '../components/Form';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { colors } from '../components/theme';
import { useCurrentUid } from '../hooks/useAuth';
import { useGroup, useProfiles } from '../hooks/useGroups';
import { removeMember } from '../services/groupService';
import { availableSlots } from '../utils/groupValidation';
import { friendlyError } from '../utils/errors';
import { NOTIFICATION_POLICIES } from '../types/notification';
import type { PublicProfile } from '../types/user';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupMembers'>;

export function GroupMembersScreen({ navigation, route }: Props) {
  const uid = useCurrentUid();
  const { group, loading, error } = useGroup(route.params.groupId);
  const profiles = useProfiles(group?.memberIds ?? []);
  const [actionError, setActionError] = useState<string | null>(null);
  const isOwner = group?.ownerId === uid;

  useEffect(() => navigation.setOptions({ title: 'Integrantes' }), [navigation]);

  const confirmRemove = useCallback(
    (profile: PublicProfile) => {
      if (!group) return;
      Alert.alert('Remover integrante', `Remover ${profile.name} do grupo?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setActionError(null);
            removeMember(group.id, uid, profile.uid).catch((e: unknown) =>
              setActionError(friendlyError(e, 'Não foi possível remover.')),
            );
          },
        },
      ]);
    },
    [group, uid],
  );

  if (loading) return <Loading />;
  if (!group) return <ErrorMessage message={error ?? 'Grupo não encontrado.'} />;

  const policyLabel = NOTIFICATION_POLICIES.find((p) => p.value === group.notificationPolicy)?.label ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={group.photoUrl} name={group.name} size={80} isGroup />
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.muted}>
          {group.memberIds.length}/{group.memberLimit} integrantes · {availableSlots(group.memberIds.length, group.memberLimit)} vaga(s)
        </Text>
        <Text style={styles.muted}>Notificações: {policyLabel}</Text>
      </View>
      {isOwner ? (
        <View style={{ paddingHorizontal: 12 }}>
          <Button title="Editar grupo" variant="secondary" onPress={() => navigation.navigate('GroupForm', { groupId: group.id })} />
        </View>
      ) : null}
      <ErrorMessage message={actionError} />
      <FlatList
        data={group.memberIds}
        keyExtractor={(id) => id}
        renderItem={({ item }) => (
          <GroupMemberItem
            profile={profiles[item] ?? { uid: item, name: 'Carregando…', photoUrl: '' }}
            subtitle={item === group.ownerId ? 'Proprietário' : undefined}
            onPress={(p) => (p.uid === uid ? undefined : navigation.navigate('Profile', { uid: p.uid }))}
            actionLabel={isOwner && item !== uid ? 'Remover' : undefined}
            onAction={confirmRemove}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', padding: 16, gap: 4 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 6 },
  muted: { color: colors.muted },
});
