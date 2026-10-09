/** Perfil completo (Firestore: users/{uid}) — leitura restrita por regras. */
export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

/** Dados mínimos para listagem (Firestore: publicProfiles/{uid}). */
export type PublicProfile = {
  uid: string;
  name: string;
  photoUrl: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};

export type DeviceRecord = {
  token: string;
  fcmToken: string | null;
  platform: 'android' | 'ios';
  enabled: boolean;
  updatedAt: number;
};
