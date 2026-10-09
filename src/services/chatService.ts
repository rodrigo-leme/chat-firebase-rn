import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref,
  serverTimestamp,
  set,
  type DataSnapshot,
} from 'firebase/database';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { database, firestore } from './firebase';
import { requestMessageNotification } from './apiService';
import { buildDirectConversationId } from '../utils/conversationId';
import type { ChatMessage, ConversationType, DirectConversation, MessageTarget } from '../types/chat';

function toDirect(id: string, data: DocumentData): DirectConversation | null {
  const ids: unknown = data.participantIds;
  if (!Array.isArray(ids) || ids.length !== 2) return null;
  const [a, b] = ids;
  if (typeof a !== 'string' || typeof b !== 'string') return null;
  return {
    id,
    type: 'direct',
    participants: [a, b],
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
}

/** Cria (ou reutiliza) a conversa direta — o id determinístico evita duplicidade. */
export async function getOrCreateDirectConversation(myUid: string, otherUid: string): Promise<string> {
  const id = buildDirectConversationId(myUid, otherUid);
  const conversationRef = doc(firestore, 'directConversations', id);
  const existing = await getDoc(conversationRef).catch(() => null);
  if (existing?.exists()) return id;
  await setDoc(conversationRef, {
    participantIds: [myUid, otherUid].sort(),
    createdAt: Date.now(),
  });
  return id;
}

export function subscribeDirectConversations(
  uid: string,
  onChange: (items: DirectConversation[]) => void,
  onError: (e: unknown) => void,
): () => void {
  const q = query(collection(firestore, 'directConversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs
          .map((d) => toDirect(d.id, d.data()))
          .filter((c): c is DirectConversation => c !== null),
      ),
    onError,
  );
}

export async function getDirectConversation(id: string): Promise<DirectConversation | null> {
  const snap = await getDoc(doc(firestore, 'directConversations', id));
  return snap.exists() ? toDirect(snap.id, snap.data()) : null;
}

function parseTarget(value: unknown): MessageTarget {
  if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'member'
    && 'memberId' in value && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

function toMessage(snapshot: DataSnapshot): ChatMessage | null {
  const value: unknown = snapshot.val();
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.senderId !== 'string' || typeof record.text !== 'string') return null;
  const mentioned = Array.isArray(record.mentionedUserIds)
    ? record.mentionedUserIds.filter((m): m is string => typeof m === 'string')
    : [];
  return {
    id: snapshot.key ?? '',
    conversationId: typeof record.conversationId === 'string' ? record.conversationId : '',
    conversationType: record.conversationType === 'group' ? 'group' : 'direct',
    senderId: record.senderId,
    text: record.text,
    target: parseTarget(record.target),
    mentionedUserIds: mentioned,
    createdAt: typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
  };
}

/** Listener em tempo real; retorna a função que remove o listener. */
export function subscribeMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (e: unknown) => void,
): () => void {
  const q = rtdbQuery(ref(database, `messages/${conversationId}`), orderByChild('createdAt'), limitToLast(200));
  return onValue(
    q,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const message = toMessage(child);
        if (message) list.push(message);
      });
      onChange(list);
    },
    onError,
  );
}

export type SendMessageInput = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  mentionedUserIds: string[];
};

export type SendResult = { messageId: string; pushFailed: boolean };

/** Persiste no Realtime Database e depois solicita o push à API. */
export async function sendMessage(input: SendMessageInput): Promise<SendResult> {
  const messageRef = push(ref(database, `messages/${input.conversationId}`));
  const messageId = messageRef.key ?? '';
  const target: MessageTarget =
    input.mentionedUserIds.length === 1
      ? { type: 'member', memberId: input.mentionedUserIds[0] }
      : { type: 'conversation' };

  await set(messageRef, {
    id: messageId,
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    senderId: input.senderId,
    text: input.text.trim(),
    target,
    mentionedUserIds: input.mentionedUserIds,
    createdAt: serverTimestamp(),
  });

  try {
    await requestMessageNotification(input.conversationId, messageId);
    return { messageId, pushFailed: false };
  } catch {
    return { messageId, pushFailed: true };
  }
}

/** Observa o estado da conexão com o Realtime Database. */
export function subscribeConnection(onChange: (connected: boolean) => void): () => void {
  return onValue(ref(database, '.info/connected'), (snap) => onChange(snap.val() === true));
}
