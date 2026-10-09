import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, updateProfilePhoto } from './userService';
import { uploadImage } from './storageService';
import type { RegisterInput } from '../types/user';

export async function register(input: RegisterInput): Promise<{ photoFailed: boolean }> {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const uid = credential.user.uid;

  await createUserProfile({
    uid,
    name: input.name.trim(),
    email: credential.user.email ?? input.email.trim().toLowerCase(),
    phoneNumber: input.phoneNumber,
    birthDate: input.birthDate,
    photoUrl: '',
    createdAt: Date.now(),
  });

  // A foto depende do uid, então é enviada após a criação da conta.
  if (input.photoUri) {
    try {
      const url = await uploadImage(input.photoUri, `chat-fiap/profiles/${uid}`);
      await updateProfilePhoto(uid, url);
    } catch {
      return { photoFailed: true };
    }
  }
  return { photoFailed: false };
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export function observeSession(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('not-authenticated');
  return user.getIdToken();
}
