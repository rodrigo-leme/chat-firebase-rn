import { Router, type Request, type Response } from 'express';
import { authenticate, type AuthedLocals } from '../middleware/authenticate';
import { db, rtdb } from '../services/firebaseAdmin';
import { sendToUsers } from '../services/notificationSender';
import { resolveRecipients, type MessageTarget, type NotificationPolicy, type ResolverInput } from '../services/recipientResolver';

export const notificationsRouter = Router();

const POLICIES: NotificationPolicy[] = ['all_group_messages', 'mentioned_members', 'direct_messages_only', 'disabled'];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function parseTarget(value: unknown): MessageTarget {
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (v.type === 'member' && typeof v.memberId === 'string') return { type: 'member', memberId: v.memberId };
  }
  return { type: 'conversation' };
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).filter((v): v is string => typeof v === 'string');
  }
  return [];
}

/**
 * POST /notifications/messages { conversationId, messageId }
 * 1) valida token  2) confere mensagem e remetente no RTDB
 * 3) lê participantes/política no Firestore  4) calcula destinatários  5) envia
 */
notificationsRouter.post('/messages', authenticate, async (req: Request, res: Response<unknown, AuthedLocals>) => {
  const uid = res.locals.uid;
  const { conversationId, messageId } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof conversationId !== 'string' || typeof messageId !== 'string'
    || !ID_PATTERN.test(conversationId) || !ID_PATTERN.test(messageId)) {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }

  try {
    const messageSnap = await rtdb.ref(`messages/${conversationId}/${messageId}`).get();
    if (!messageSnap.exists()) {
      res.status(404).json({ error: 'message_not_found' });
      return;
    }
    const message = messageSnap.val() as Record<string, unknown>;
    if (message.senderId !== uid) {
      res.status(403).json({ error: 'sender_mismatch' });
      return;
    }

    // Idempotência: a mesma mensagem só gera push uma vez.
    const dispatchRef = db.collection('notificationDispatches').doc(`${conversationId}__${messageId}`);
    try {
      await dispatchRef.create({ conversationId, messageId, senderId: uid, status: 'processing', createdAt: Date.now() });
    } catch {
      res.status(200).json({ status: 'duplicate' });
      return;
    }

    const senderSnap = await db.collection('publicProfiles').doc(uid).get();
    const senderName = (senderSnap.get('name') as string | undefined) ?? 'Alguém';

    let input: ResolverInput;
    let title: string;
    let conversationType: 'direct' | 'group';

    if (conversationId.startsWith('direct_')) {
      const conv = await db.collection('directConversations').doc(conversationId).get();
      const participantIds = stringArray(conv.get('participantIds'));
      if (!conv.exists || !participantIds.includes(uid)) {
        await dispatchRef.update({ status: 'rejected' });
        res.status(403).json({ error: 'not_participant' });
        return;
      }
      conversationType = 'direct';
      title = senderName;
      input = { conversationType: 'direct', participantIds, senderId: uid };
    } else {
      const group = await db.collection('groups').doc(conversationId).get();
      const memberIds = stringArray(group.get('memberIds'));
      if (!group.exists || !memberIds.includes(uid)) {
        await dispatchRef.update({ status: 'rejected' });
        res.status(403).json({ error: 'not_member' });
        return;
      }
      const rawPolicy = group.get('notificationPolicy');
      const policy = POLICIES.find((p) => p === rawPolicy) ?? 'all_group_messages';
      conversationType = 'group';
      title = (group.get('name') as string | undefined) ?? 'Grupo';
      input = {
        conversationType: 'group',
        memberIds,
        policy,
        senderId: uid,
        target: parseTarget(message.target),
        mentionedUserIds: stringArray(message.mentionedUserIds),
      };
    }

    const recipients = resolveRecipients(input);
    const mentioned = input.conversationType === 'group' && input.mentionedUserIds.length > 0;
    // Corpo genérico: não expõe o conteúdo da mensagem.
    const body = conversationType === 'direct'
      ? 'Enviou uma nova mensagem'
      : mentioned ? `${senderName} mencionou você` : `Nova mensagem de ${senderName}`;

    const summary = await sendToUsers(recipients, { title, body, data: { conversationId, conversationType } });
    await dispatchRef.update({ status: 'sent', ...summary, finishedAt: Date.now() });
    res.status(200).json({ status: 'sent', ...summary });
  } catch (error) {
    console.error('notify_error', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'internal_error' });
  }
});
