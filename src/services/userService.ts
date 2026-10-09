import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { ChatUser, PublicProfile } from '../types/user';

function toPublicProfile(uid: string, data: DocumentData): PublicProfile {
  return {
    uid,
    name: typeof data.name === 'string' ? data.name : 'Usuário',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
  };
}

function toChatUser(uid: string, data: DocumentData): ChatUser {
  return {
    uid,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : '',
    phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
    birthDate: typeof data.birthDate === 'string' ? data.birthDate : '',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  };
}

/** Grava o perfil completo (privado) e o perfil público (listagem) de forma atômica. */
export async function createUserProfile(user: ChatUser): Promise<void> {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'users', user.uid), user);
  batch.set(doc(firestore, 'publicProfiles', user.uid), {
    uid: user.uid,
    name: user.name,
    photoUrl: user.photoUrl,
  });
  await batch.commit();
}

export async function updateProfilePhoto(uid: string, photoUrl: string): Promise<void> {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, 'users', uid), { photoUrl });
  batch.update(doc(firestore, 'publicProfiles', uid), { photoUrl });
  await batch.commit();
}

/** Perfil completo — as regras só liberam para quem compartilha conversa/grupo. */
export async function getUserProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(doc(firestore, 'users', uid));
  return snapshot.exists() ? toChatUser(uid, snapshot.data()) : null;
}

export async function listPublicProfiles(): Promise<PublicProfile[]> {
  const snapshot = await getDocs(collection(firestore, 'publicProfiles'));
  return snapshot.docs.map((d) => toPublicProfile(d.id, d.data()));
}

export function subscribePublicProfile(
  uid: string,
  onChange: (profile: PublicProfile | null) => void,
): () => void {
  return onSnapshot(
    doc(firestore, 'publicProfiles', uid),
    (snapshot) => onChange(snapshot.exists() ? toPublicProfile(uid, snapshot.data()) : null),
    () => onChange(null),
  );
}

export async function getPublicProfiles(uids: string[]): Promise<Record<string, PublicProfile>> {
  const unique = Array.from(new Set(uids));
  const entries = await Promise.all(
    unique.map(async (uid) => {
      const snapshot = await getDoc(doc(firestore, 'publicProfiles', uid));
      return snapshot.exists() ? toPublicProfile(uid, snapshot.data()) : null;
    }),
  );
  return entries.reduce<Record<string, PublicProfile>>(
    (acc, profile) => (profile ? { ...acc, [profile.uid]: profile } : acc),
    {},
  );
}
