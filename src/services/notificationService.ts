import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import type { PushData } from '../types/notification';
import type { DeviceRecord } from '../types/user';

const DEVICE_ID_KEY = 'chat.deviceId';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type RegistrationResult =
  | { status: 'registered' }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'no-token' };

async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const generated = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Solicita permissão, obtém os tokens e grava em users/{uid}/devices/{deviceId}. */
export async function registerDevice(uid: string): Promise<RegistrationResult> {
  if (!Device.isDevice) return { status: 'unsupported' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  if (!(await requestPermission())) return { status: 'denied' };

  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || undefined;

  let expoToken = '';
  let fcmToken: string | null = null;
  try {
    expoToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  } catch {
    expoToken = '';
  }
  if (Platform.OS === 'android') {
    try {
      // Token nativo do FCM — usado pela API com o Firebase Admin SDK.
      const native = await Notifications.getDevicePushTokenAsync();
      fcmToken = typeof native.data === 'string' ? native.data : null;
    } catch {
      fcmToken = null;
    }
  }
  if (!expoToken && !fcmToken) return { status: 'no-token' };

  const record: DeviceRecord = {
    token: expoToken,
    fcmToken,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    enabled: true,
    updatedAt: Date.now(),
  };
  const deviceId = await getDeviceId();
  await setDoc(doc(firestore, 'users', uid, 'devices', deviceId), record);
  return { status: 'registered' };
}

/** Desativa o token deste aparelho (chamado no logout). */
export async function disableDevice(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) return;
  await updateDoc(doc(firestore, 'users', uid, 'devices', deviceId), {
    enabled: false,
    updatedAt: Date.now(),
  }).catch(() => undefined);
}

export function parsePushData(data: Record<string, unknown> | undefined): PushData | null {
  if (!data) return null;
  const { conversationId, conversationType } = data;
  if (typeof conversationId !== 'string') return null;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;
  return { conversationId, conversationType };
}

/** Escuta toques em notificações (app aberto, em segundo plano ou fechado). */
export function listenNotificationTaps(onOpen: (data: PushData) => void): () => void {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const parsed = parsePushData(response?.notification.request.content.data);
    if (parsed) onOpen(parsed);
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    handle(last);
    Notifications.clearLastNotificationResponse();
  }
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}

export function listenTokenRefresh(uid: string): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    registerDevice(uid).catch(() => undefined);
  });
  return () => subscription.remove();
}
