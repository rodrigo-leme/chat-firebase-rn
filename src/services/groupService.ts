import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { uploadImage } from './storageService';
import { syncGroupMembers } from './apiService';
import { AppError } from '../utils/errors';
import { validateGroup } from '../utils/groupValidation';
import type { ChatGroup, GroupFormInput } from '../types/group';
import type { NotificationPolicy } from '../types/notification';

const POLICIES: NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export function toGroup(id: string, data: DocumentData): ChatGroup {
  const policy = POLICIES.find((p) => p === data.notificationPolicy) ?? 'all_group_messages';
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Grupo',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    memberIds: Array.isArray(data.memberIds)
      ? data.memberIds.filter((m: unknown): m is string => typeof m === 'string')
      : [],
    memberLimit: typeof data.memberLimit === 'number' ? data.memberLimit : 0,
    notificationPolicy: policy,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

export function subscribeMyGroups(uid: string, onChange: (groups: ChatGroup[]) => void, onError: (e: unknown) => void) {
  const q = query(collection(firestore, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => toGroup(d.id, d.data()))), onError);
}

export function subscribeGroup(groupId: string, onChange: (group: ChatGroup | null) => void, onError: (e: unknown) => void) {
  return onSnapshot(
    doc(firestore, 'groups', groupId),
    (snap) => onChange(snap.exists() ? toGroup(snap.id, snap.data()) : null),
    onError,
  );
}

async function uploadGroupPhoto(groupId: string, photoUri: string): Promise<void> {
  const url = await uploadImage(photoUri, `chat-fiap/groups/${groupId}`);
  await updateDoc(doc(firestore, 'groups', groupId), { photoUrl: url, updatedAt: Date.now() });
}

export async function createGroup(ownerId: string, input: GroupFormInput): Promise<string> {
  const memberIds = Array.from(new Set([ownerId, ...input.memberIds]));
  const error = validateGroup(input.name, memberIds, input.memberLimit);
  if (error) throw new AppError(error);

  const groupRef = doc(collection(firestore, 'groups'));
  const now = Date.now();
  await setDoc(groupRef, {
    name: input.name.trim(),
    photoUrl: '',
    ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  });

  if (input.photoUri) await uploadGroupPhoto(groupRef.id, input.photoUri);
  await syncGroupMembers(groupRef.id);
  return groupRef.id;
}

/**
 * Atualiza o grupo dentro de uma transação: lê o estado mais recente,
 * valida dono/capacidade e grava. Escritas concorrentes fazem a transação
 * reexecutar com os dados novos; as regras do Firestore revalidam o limite.
 */
export async function updateGroup(groupId: string, ownerId: string, input: GroupFormInput): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists()) throw new AppError('Grupo não encontrado.');
    const current = toGroup(snap.id, snap.data());
    if (current.ownerId !== ownerId) throw new AppError('Apenas o proprietário pode editar o grupo.');

    const memberIds = Array.from(new Set([ownerId, ...input.memberIds]));
    const error = validateGroup(input.name, memberIds, input.memberLimit);
    if (error) throw new AppError(error);

    tx.update(groupRef, {
      name: input.name.trim(),
      memberIds,
      memberLimit: input.memberLimit,
      notificationPolicy: input.notificationPolicy,
      updatedAt: Date.now(),
    });
  });

  if (input.photoUri) await uploadGroupPhoto(groupId, input.photoUri);
  await syncGroupMembers(groupId);
}

export async function addMember(groupId: string, ownerId: string, memberId: string): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists()) throw new AppError('Grupo não encontrado.');
    const group = toGroup(snap.id, snap.data());
    if (group.ownerId !== ownerId) throw new AppError('Apenas o proprietário pode adicionar integrantes.');
    if (group.memberIds.includes(memberId)) return;
    if (group.memberIds.length >= group.memberLimit) throw new AppError('O grupo atingiu o limite de integrantes.');
    tx.update(groupRef, { memberIds: [...group.memberIds, memberId], updatedAt: Date.now() });
  });
  await syncGroupMembers(groupId);
}

export async function removeMember(groupId: string, ownerId: string, memberId: string): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists()) throw new AppError('Grupo não encontrado.');
    const group = toGroup(snap.id, snap.data());
    if (group.ownerId !== ownerId) throw new AppError('Apenas o proprietário pode remover integrantes.');
    if (memberId === ownerId) throw new AppError('O proprietário não pode ser removido.');
    const next = group.memberIds.filter((id) => id !== memberId);
    if (next.length < 2) throw new AppError('O grupo precisa de pelo menos 2 integrantes.');
    tx.update(groupRef, { memberIds: next, updatedAt: Date.now() });
  });
  await syncGroupMembers(groupId);
}
