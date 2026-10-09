import { Router, type Request, type Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { authenticate, type AuthedLocals } from '../middleware/authenticate';
import { db, rtdb } from '../services/firebaseAdmin';

export const groupsRouter = Router();

/**
 * POST /groups/:groupId/sync-members
 * O Firestore é a fonte da verdade dos integrantes. Como as regras do Realtime
 * Database não conseguem ler o Firestore, a API espelha os integrantes em
 * RTDB groupMembers/{groupId} (usado pelas regras de mensagens) e mantém
 * profileAccess (usado pelas regras de leitura de perfis).
 * Idempotente: pode ser chamado várias vezes.
 */
groupsRouter.post('/:groupId/sync-members', authenticate, async (req: Request, res: Response<unknown, AuthedLocals>) => {
  const uid = res.locals.uid;
  const groupId = String(req.params.groupId ?? '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(groupId) || groupId.startsWith('direct_')) {
    res.status(400).json({ error: 'invalid_group' });
    return;
  }

  try {
    const groupSnap = await db.collection('groups').doc(groupId).get();
    const memberIds: string[] = groupSnap.exists
      ? ((groupSnap.get('memberIds') as unknown[]) ?? []).filter((v): v is string => typeof v === 'string')
      : [];
    const ownerId = groupSnap.get('ownerId') as string | undefined;

    const previousSnap = await rtdb.ref(`groupMembers/${groupId}`).get();
    const previous = Object.keys((previousSnap.val() as Record<string, boolean> | null) ?? {});

    // Só integrantes atuais, o dono ou quem acabou de ser removido podem disparar a sincronização.
    if (!memberIds.includes(uid) && ownerId !== uid && !previous.includes(uid)) {
      res.status(403).json({ error: 'not_member' });
      return;
    }

    const current = new Set(memberIds);
    const removed = previous.filter((id) => !current.has(id));

    await rtdb.ref(`groupMembers/${groupId}`).set(
      memberIds.length > 0 ? Object.fromEntries(memberIds.map((id) => [id, true])) : null,
    );

    const writer = db.bulkWriter();
    for (const a of memberIds) {
      for (const b of memberIds) {
        if (a !== b) {
          writer.set(db.collection('profileAccess').doc(`${a}_${b}`), { groupIds: FieldValue.arrayUnion(groupId) }, { merge: true });
        }
      }
    }
    for (const r of removed) {
      for (const m of [...memberIds, ...removed]) {
        if (r !== m) {
          writer.set(db.collection('profileAccess').doc(`${r}_${m}`), { groupIds: FieldValue.arrayRemove(groupId) }, { merge: true });
          writer.set(db.collection('profileAccess').doc(`${m}_${r}`), { groupIds: FieldValue.arrayRemove(groupId) }, { merge: true });
        }
      }
    }
    await writer.close();

    res.status(200).json({ status: 'synced', members: memberIds.length, removed: removed.length });
  } catch (error) {
    console.error('sync_error', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'internal_error' });
  }
});
