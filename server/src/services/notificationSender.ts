import type { DocumentReference } from 'firebase-admin/firestore';
import { db, messaging } from './firebaseAdmin';

export type PushContent = {
  title: string;
  body: string;
  data: { conversationId: string; conversationType: 'direct' | 'group' };
};

type DeviceTarget = { ref: DocumentReference; expoToken: string; fcmToken: string | null; platform: string };

export type SendSummary = { recipients: number; sent: number; failed: number; disabledTokens: number };

async function loadDevices(uids: string[]): Promise<DeviceTarget[]> {
  const lists = await Promise.all(
    uids.map((uid) => db.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get()),
  );
  return lists.flatMap((snap) =>
    snap.docs.map((d) => {
      const data = d.data();
      return {
        ref: d.ref,
        expoToken: typeof data.token === 'string' ? data.token : '',
        fcmToken: typeof data.fcmToken === 'string' ? data.fcmToken : null,
        platform: typeof data.platform === 'string' ? data.platform : '',
      };
    }),
  );
}

async function disable(refs: DocumentReference[]): Promise<void> {
  await Promise.all(refs.map((ref) => ref.update({ enabled: false, updatedAt: Date.now() })));
}

/** Android: FCM via Admin SDK. */
async function sendFcm(devices: DeviceTarget[], content: PushContent) {
  if (devices.length === 0) return { sent: 0, failed: 0, invalid: [] as DocumentReference[] };
  const response = await messaging.sendEach(
    devices.map((d) => ({
      token: d.fcmToken ?? '',
      notification: { title: content.title, body: content.body },
      data: content.data,
      android: { priority: 'high' as const, notification: { channelId: 'messages' } },
    })),
  );
  const invalid: DocumentReference[] = [];
  response.responses.forEach((r, i) => {
    const code = r.error?.code ?? '';
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
      invalid.push(devices[i].ref);
    }
  });
  return { sent: response.successCount, failed: response.failureCount, invalid };
}

type ExpoTicket = { status: 'ok' | 'error'; details?: { error?: string } };

/** iOS (e Android sem token FCM): Expo Push Service, que entrega via APNs/FCM. */
async function sendExpo(devices: DeviceTarget[], content: PushContent) {
  if (devices.length === 0) return { sent: 0, failed: 0, invalid: [] as DocumentReference[] };
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(
      devices.map((d) => ({
        to: d.expoToken,
        title: content.title,
        body: content.body,
        data: content.data,
        sound: 'default',
        channelId: 'messages',
        priority: 'high',
      })),
    ),
  });
  if (!response.ok) return { sent: 0, failed: devices.length, invalid: [] };
  const json = (await response.json()) as { data?: ExpoTicket[] };
  const tickets = json.data ?? [];
  const invalid = tickets
    .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? devices[i].ref : null))
    .filter((ref): ref is DocumentReference => ref !== null);
  const sent = tickets.filter((t) => t.status === 'ok').length;
  return { sent, failed: devices.length - sent, invalid };
}

export async function sendToUsers(uids: string[], content: PushContent): Promise<SendSummary> {
  if (uids.length === 0) return { recipients: 0, sent: 0, failed: 0, disabledTokens: 0 };
  const devices = await loadDevices(uids);
  const fcmDevices = devices.filter((d) => d.platform === 'android' && d.fcmToken);
  const expoDevices = devices.filter((d) => !(d.platform === 'android' && d.fcmToken) && d.expoToken);

  const [fcm, expo] = await Promise.all([sendFcm(fcmDevices, content), sendExpo(expoDevices, content)]);
  const invalid = [...fcm.invalid, ...expo.invalid];
  await disable(invalid);
  return {
    recipients: uids.length,
    sent: fcm.sent + expo.sent,
    failed: fcm.failed + expo.failed,
    disabledTokens: invalid.length,
  };
}
