import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, TextField } from '../components/Form';
import { ErrorMessage, Loading } from '../components/Feedback';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { PhotoPicker } from '../components/PhotoPicker';
import { colors } from '../components/theme';
import { useCurrentUid } from '../hooks/useAuth';
import { useGroup, useProfiles } from '../hooks/useGroups';
import { createGroup, updateGroup } from '../services/groupService';
import { availableSlots, parseMemberLimit, validateGroup } from '../utils/groupValidation';
import { friendlyError } from '../utils/errors';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupForm'>;

export function GroupFormScreen({ navigation, route }: Props) {
  const uid = useCurrentUid();
  const groupId = route.params.groupId;
  const isEdit = Boolean(groupId);
  const { group, loading, error: loadError } = useGroup(groupId);

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([uid]);
  const [limitText, setLimitText] = useState('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [initialized, setInitialized] = useState(!isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preenche o formulário uma única vez com os dados do grupo.
  useEffect(() => {
    if (group && !initialized) {
      setName(group.name);
      setMemberIds(group.memberIds);
      setLimitText(String(group.memberLimit));
      setPolicy(group.notificationPolicy);
      setInitialized(true);
    }
  }, [group, initialized]);

  // Recebe integrantes escolhidos na Tela de Usuários.
  const pickedIds = route.params.pickedIds;
  useEffect(() => {
    if (pickedIds) setMemberIds(Array.from(new Set([uid, ...pickedIds])));
  }, [pickedIds, uid]);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Editar grupo' : 'Novo grupo' });
  }, [navigation, isEdit]);

  const profiles = useProfiles(memberIds);
  const memberLimit = useMemo(() => parseMemberLimit(limitText), [limitText]);
  const slots = memberLimit === null ? null : availableSlots(memberIds.length, memberLimit);
  const validation = useMemo(() => validateGroup(name, memberIds, memberLimit), [name, memberIds, memberLimit]);

  const removeLocal = useCallback(
    (memberId: string) => setMemberIds((current) => current.filter((id) => id !== memberId)),
    [],
  );

  const pickMembers = useCallback(() => {
    if (memberLimit !== null && memberIds.length >= memberLimit) {
      Alert.alert('Grupo sem vagas', 'Aumente o limite ou remova integrantes antes de adicionar outros.');
    }
    navigation.navigate('Users', { mode: 'pick', selectedIds: memberIds.filter((id) => id !== uid), groupId });
  }, [navigation, memberIds, memberLimit, uid, groupId]);

  const save = useCallback(async () => {
    if (validation || memberLimit === null) {
      setError(validation ?? 'Limite inválido.');
      return;
    }
    setSaving(true);
    setError(null);
    const input = { name, photoUri, memberIds, memberLimit, notificationPolicy: policy };
    try {
      if (groupId) {
        await updateGroup(groupId, uid, input);
        navigation.goBack();
      } else {
        const id = await createGroup(uid, input);
        navigation.replace('Chat', { conversationId: id, conversationType: 'group' });
      }
    } catch (e) {
      setError(friendlyError(e, 'Não foi possível salvar o grupo.'));
      setSaving(false);
    }
  }, [validation, memberLimit, name, photoUri, memberIds, policy, groupId, uid, navigation]);

  if (isEdit && (loading || !initialized)) {
    if (loadError) return <ErrorMessage message={loadError} />;
    return <Loading />;
  }
  if (isEdit && group && group.ownerId !== uid) {
    return <ErrorMessage message="Apenas o proprietário pode editar este grupo." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <PhotoPicker uri={photoUri ?? group?.photoUrl ?? ''} name={name || 'G'} onPick={setPhotoUri} isGroup />
      <TextField label="Nome do grupo" value={name} onChangeText={setName} maxLength={60} />
      <TextField label="Limite máximo de integrantes" value={limitText} onChangeText={setLimitText} keyboardType="number-pad" />

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {memberIds.length} integrante(s) · {slots === null ? '—' : `${slots} vaga(s) disponível(is)`}
        </Text>
        {slots === 0 ? <Text style={{ color: colors.warning }}>Grupo sem vagas</Text> : null}
      </View>

      <Text style={styles.section}>Notificações</Text>
      {NOTIFICATION_POLICIES.map((option) => (
        <Pressable key={option.value} style={styles.option} onPress={() => setPolicy(option.value)}>
          <View style={[styles.radio, policy === option.value && styles.radioActive]} />
          <Text style={{ color: colors.text }}>{option.label}</Text>
        </Pressable>
      ))}

      <Text style={styles.section}>Integrantes</Text>
      {memberIds.map((id) => {
        const profile = profiles[id] ?? { uid: id, name: id === uid ? 'Você' : 'Carregando…', photoUrl: '' };
        return (
          <GroupMemberItem
            key={id}
            profile={profile}
            subtitle={id === uid ? 'Proprietário' : undefined}
            actionLabel={id === uid ? undefined : 'Remover'}
            onAction={() => removeLocal(id)}
          />
        );
      })}
      <Button title="Selecionar integrantes" variant="secondary" onPress={pickMembers} />

      <ErrorMessage message={error ?? (memberIds.length > 1 ? validation : null)} />
      <Button title={isEdit ? 'Salvar alterações' : 'Criar grupo'} onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.background },
  counter: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginBottom: 8 },
  counterText: { color: colors.primaryDark, fontWeight: '600' },
  section: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.muted },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
});
